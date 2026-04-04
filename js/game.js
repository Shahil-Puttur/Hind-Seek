// js/game.js
const Game = {
    canvas: null, ctx: null,
    lastTime: 0,
    players: {},
    localPlayer: null,
    worldObjects: {},
    explosions: [],
    camera: { x: 0, y: 0, shake: 0 },
    phase: 'lobby',
    frozenUntil: 0,
    safePassword: "0000",
    myRole: null,

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        window.addEventListener('resize', () => this.resize());
        this.resize();
        requestAnimationFrame((t) => this.loop(t));
    },

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    generateMap(seed) {
        Utils.setMapSeed(seed);
        this.worldObjects = {};
        this.safePassword = Math.floor(Utils.random() * 9000 + 1000).toString();
        
        let destructibles = ['crate', 'barrel', 'log'];
        let cover = ['tree', 'rock', 'bush'];
        
        let containerIds = [];

        for(let r=0; r<CONFIG.MAP.SIZE; r++) {
            for(let c=0; c<CONFIG.MAP.SIZE; c++) {
                if (r===0 || r===CONFIG.MAP.SIZE-1 || c===0 || c===CONFIG.MAP.SIZE-1) {
                    this.worldObjects[`wall_${r}_${c}`] = { type: 'tree', x: c*80, y: r*80, size: 80, isSolid: true };
                    continue;
                }
                if ((c<4&&r<4) || (c>CONFIG.MAP.SIZE-5 && r>CONFIG.MAP.SIZE-5)) continue; // Spawn areas

                let rand = Utils.random();
                let id = `obj_${r}_${c}`;
                if (rand > 0.8) {
                    this.worldObjects[id] = { type: destructibles[Math.floor(Utils.random()*destructibles.length)], x: c*80, y: r*80, size: 60, isSolid: true, isContainer: true };
                    containerIds.push(id);
                } else if (rand > 0.6) {
                    this.worldObjects[id] = { type: cover[Math.floor(Utils.random()*cover.length)], x: c*80, y: r*80, size: 80, isSolid: true };
                }
            }
        }
        
        // Procedurally place Safe and Password note
        if(containerIds.length > 2) {
            this.worldObjects[containerIds[0]].type = 'safe';
            this.worldObjects[containerIds[1]].hasPassword = true;
        }
    },

    handleStateChange(state) {
        if(!state) return;
        this.phase = state.phase;
        
        if (this.phase === 'transition') {
            UI.showScreen('screen-transition');
            this.generateMap(Network.roomRef ? 123 : 123); // Replace with state.mapSeed
        } 
        else if (this.phase === 'hiding') {
            this.setupPlayers();
            UI.showScreen('screen-game-hud');
            if (this.myRole === 'fox') {
                UI.showAlert("HIDE YOUR DIAMONDS!", "#f1c40f");
                document.getElementById('btn-toggle-item').classList.remove('hidden');
            } else {
                UI.showScreen('screen-blocker');
            }
        }
        else if (this.phase === 'playing') {
            UI.showScreen('screen-game-hud');
            document.getElementById('screen-blocker').classList.add('hidden');
            document.getElementById('btn-toggle-item').classList.add('hidden');
            if(this.myRole === 'fox') UI.showAlert("HUNT THE PANDAS!", "#e74c3c");
            else UI.showAlert("FIND ALL 5 DIAMONDS!", "#3498db");
        }
        else if (this.phase === 'finished') {
            UI.showScreen('screen-result');
            document.getElementById('result-winner').innerText = `${state.winner.toUpperCase()} WINS!`;
            this.localPlayer.isDead = true;
        }
    },

    setupPlayers() {
        this.myRole = Network.roomRef ? (GlobalState.myTeam === 'teamA' ? 'fox' : 'panda') : 'fox';
        if (!this.players[GlobalState.myId]) {
            this.localPlayer = new Player(GlobalState.myId, GlobalState.username, GlobalState.myTeam, true);
            this.players[GlobalState.myId] = this.localPlayer;
        }
        Network.startSync();
    },

    updatePlayers(pData) {
        if(!pData) return;
        if(Matchmaking) Matchmaking.updateLobbyUI(pData);
        
        let aliveFox = 0, alivePanda = 0;

        for (let id in pData) {
            let pd = pData[id];
            if (!this.players[id]) {
                this.players[id] = new Player(id, pd.name, pd.team, id === GlobalState.myId);
            }
            let p = this.players[id];
            
            p.hp = pd.hp;
            p.isDead = p.hp <= 0;
            
            if (!p.isDead) { pd.team === 'teamA' ? aliveFox++ : alivePanda++; }

            if (id === GlobalState.myId) {
                GlobalState.isSpectating = p.isDead;
                if(p.isDead) document.getElementById('hud-spectator').classList.remove('hidden');
            } else {
                p.targetX = pd.x; p.targetY = pd.y;
                p.isAiming = pd.isAiming; p.aimDir = pd.aimDir;
            }
        }
        
        UI.updateHUD(0, this.phase, aliveFox * 100, alivePanda * 100);

        // Server authoritative win condition
        if (GlobalState.isHost && this.phase === 'playing') {
            if (aliveFox === 0) Network.roomRef.child('state').update({ phase: 'finished', winner: 'Pandas (Foxes Eliminated)' });
            else if (alivePanda === 0) Network.roomRef.child('state').update({ phase: 'finished', winner: 'Foxes (Pandas Eliminated)' });
        }
    },

    handleEvent(ev) {
        if (ev.type === 'shoot') {
            this.explosions.push({ x: ev.x, y: ev.y, r: 5, maxR: 40, life: 1.0 });
            if (Utils.distance(this.localPlayer.x, this.localPlayer.y, ev.x, ev.y) < 600) this.camera.shake = 10;
        }
    },

    handleShoot() {
        if (this.localPlayer.isDead || this.phase !== 'playing') return;
        const btn = document.getElementById('btn-shoot');
        
        if (!this.localPlayer.isAiming) {
            this.localPlayer.isAiming = true;
            btn.classList.add('aiming-mode');
            return;
        }

        this.localPlayer.isAiming = false;
        btn.classList.remove('aiming-mode');

        // Simple Raycast
        let hitX = this.localPlayer.x + this.localPlayer.aimDir.x * 400;
        let hitY = this.localPlayer.y + this.localPlayer.aimDir.y * 400;

        if (GlobalState.gameMode !== 'offline') {
            Network.roomRef.child('events').push({ type: 'shoot', x: hitX, y: hitY, sender: GlobalState.myId });
            
            // Check Hit on Enemy (Host verifies in a real anti-cheat setup, but client side is fine for Web)
            for(let id in this.players) {
                let p = this.players[id];
                if(p.team !== this.localPlayer.team && !p.isDead) {
                    if (Utils.distance(hitX, hitY, p.x, p.y) < 50) {
                        Network.roomRef.child(`players/${id}/hp`).transaction(hp => Math.max(0, (hp||100) - 20));
                        UI.showAlert("HIT!", "#e74c3c");
                    }
                }
            }
        } else {
            Bot.handleShootEvent(hitX, hitY);
        }
    },

    loop(timestamp) {
        let dt = (timestamp - this.lastTime) / 1000;
        if(dt > 0.05) dt = 0.05;
        this.lastTime = timestamp;

        if(GlobalState.gameMode === 'offline' && Bot.active) Bot.update(dt);

        this.ctx.fillStyle = '#6ab04c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.phase === 'hiding' || this.phase === 'playing') {
            let targetCamX = this.localPlayer.x - this.canvas.width/2;
            let targetCamY = this.localPlayer.y - this.canvas.height/2;
            
            if (GlobalState.isSpectating) { targetCamX = CONFIG.MAP.PIXEL_SIZE/2 - this.canvas.width/2; targetCamY = CONFIG.MAP.PIXEL_SIZE/2 - this.canvas.height/2; } // Pan to center
            
            if (this.camera.shake > 0) {
                targetCamX += (Math.random() - 0.5) * this.camera.shake;
                targetCamY += (Math.random() - 0.5) * this.camera.shake;
                this.camera.shake -= dt * 60;
            }

            this.camera.x += (targetCamX - this.camera.x) * 0.1;
            this.camera.y += (targetCamY - this.camera.y) * 0.1;

            this.ctx.save();
            this.ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

            // Grid Background
            this.ctx.strokeStyle = "rgba(0,0,0,0.05)";
            this.ctx.lineWidth = 2;
            for(let i=0; i<CONFIG.MAP.PIXEL_SIZE; i+=80) {
                this.ctx.beginPath(); this.ctx.moveTo(i, 0); this.ctx.lineTo(i, CONFIG.MAP.PIXEL_SIZE); this.ctx.stroke();
                this.ctx.beginPath(); this.ctx.moveTo(0, i); this.ctx.lineTo(CONFIG.MAP.PIXEL_SIZE, i); this.ctx.stroke();
            }

            let renderQueue = [];
            for (let id in this.players) { this.players[id].update(dt); renderQueue.push({ y: this.players[id].y, obj: this.players[id], type: 'player' }); }
            for (let id in this.worldObjects) { renderQueue.push({ y: this.worldObjects[id].y + this.worldObjects[id].size, obj: this.worldObjects[id], type: 'world' }); }

            renderQueue.sort((a,b) => a.y - b.y);

            renderQueue.forEach(item => {
                if (item.type === 'player') item.obj.draw(this.ctx);
                else {
                    let w = item.obj;
                    this.ctx.fillStyle = w.type === 'tree' ? '#2ecc71' : (w.type==='safe'?'#7f8c8d':'#e67e22');
                    this.ctx.fillRect(w.x, w.y, w.size, w.size);
                    this.ctx.strokeStyle = '#2c3e50'; this.ctx.lineWidth = 3; this.ctx.strokeRect(w.x, w.y, w.size, w.size);
                }
            });

            // Explosions
            for (let i = this.explosions.length - 1; i >= 0; i--) {
                let exp = this.explosions[i];
                this.ctx.beginPath(); this.ctx.arc(exp.x, exp.y, exp.r, 0, Math.PI * 2); 
                this.ctx.fillStyle = `rgba(231, 76, 60, ${exp.life})`; this.ctx.fill();
                exp.r += 600 * dt; exp.life -= 3 * dt;
                if (exp.life <= 0) this.explosions.splice(i, 1);
            }

            // Aim Line
            if (this.localPlayer && this.localPlayer.isAiming && !this.localPlayer.isDead) {
                this.ctx.beginPath();
                this.ctx.moveTo(this.localPlayer.x, this.localPlayer.y);
                this.ctx.lineTo(this.localPlayer.x + this.localPlayer.aimDir.x * 400, this.localPlayer.y + this.localPlayer.aimDir.y * 400);
                this.ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"; this.ctx.lineWidth = 4; this.ctx.stroke();
            }

            this.ctx.restore();
        }

        requestAnimationFrame((t) => this.loop(t));
    }
};
