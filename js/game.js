// js/game.js

const Game = {
    canvas: null, ctx: null,
    mode: 'offline', phase: 'none', // 'hiding', 'playing', 'ended'
    isPlaying: false,
    
    players: {}, bots: [], localPlayerId: null,
    worldObjects: [], mapItems: {}, explosions: [],
    safeObjIndex: -1, passwordObjIndex: -1, safePassword: "1234", safeUnlocked: false,
    
    camera: { x: 0, y: 0, shakeTime: 0, shakeIntensity: 0 },
    lastTime: 0, images: {}, input: { x: 0, y: 0 }, keys: {},
    
    foxInventory: { diamond: 5, bombs: 2 },
    placingItem: 'diamond',

    init: function() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupInput();
    },

    resize: function() { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; },

    setupInput: function() {
        window.addEventListener('keydown', (e) => { this.keys[e.code] = true; if(e.code === 'Space') this.handleAction(); });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        const zone = document.getElementById('joystick-zone');
        const knob = document.getElementById('joystick-knob');
        let isDragging = false, touchId = null, center = { x: 0, y: 0 };

        zone.addEventListener('touchstart', (e) => {
            e.preventDefault(); if(isDragging) return;
            let touch = e.changedTouches[0]; touchId = touch.identifier; isDragging = true;
            let rect = zone.getBoundingClientRect(); center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            this.updateJoystick(touch.clientX, touch.clientY, center, knob);
        }, {passive: false});
        window.addEventListener('touchmove', (e) => {
            if(!isDragging) return;
            for(let i=0; i<e.changedTouches.length; i++) if(e.changedTouches[i].identifier === touchId) this.updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY, center, knob);
        }, {passive: false});
        window.addEventListener('touchend', (e) => {
            for(let i=0; i<e.changedTouches.length; i++) if(e.changedTouches[i].identifier === touchId) { isDragging = false; touchId = null; knob.style.transform = `translate(-50%, -50%)`; this.input = { x: 0, y: 0 }; }
        });

        document.getElementById('btn-shoot').addEventListener('pointerdown', (e) => { e.preventDefault(); this.handleAction(); });
        document.getElementById('btn-toggle-item').addEventListener('pointerdown', (e) => { 
            e.preventDefault(); 
            this.placingItem = this.placingItem === 'diamond' ? 'bomb' : 'diamond';
            this.updateItemButton();
        });
    },

    updateJoystick: function(clientX, clientY, center, knob) {
        let dx = clientX - center.x, dy = clientY - center.y, dist = Math.sqrt(dx*dx + dy*dy), maxRad = 45;
        if (dist < 5) { this.input = {x:0, y:0}; return; }
        if (dist > maxRad) { dx = (dx/dist)*maxRad; dy = (dy/dist)*maxRad; }
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        this.input = { x: dx/maxRad, y: dy/maxRad };
    },

    updateItemButton: function() {
        const btn = document.getElementById('btn-toggle-item');
        if(this.placingItem === 'diamond') {
            btn.innerHTML = `💎 Place: DIAMOND (${this.foxInventory.diamond})`;
            btn.style.background = "#f1c40f"; btn.style.borderColor = "#e67e22";
        } else {
            btn.innerHTML = `💣 Place: BOMB (${this.foxInventory.bombs})`;
            btn.style.background = "#e74c3c"; btn.style.borderColor = "#c0392b";
        }
    },

    generateMap: function(seed) {
        Utils.setSeed(seed);
        this.worldObjects = []; this.mapItems = {};
        this.safePassword = Math.floor(Utils.randomSeed() * 9000 + 1000).toString();
        this.safeUnlocked = false;
        let containers = [];

        for (let r = 0; r < 22; r++) {
            for (let c = 0; c < 22; c++) {
                let x = c * 80, y = r * 80;
                if (r === 0 || r === 21 || c === 0 || c === 21) { this.worldObjects.push({ type: 'wall', x, y, size: 80, isSolid: true }); continue; }
                if ((c < 4 && r < 4) || (c > 17 && r > 17)) continue;

                let rand = Utils.randomSeed();
                if (rand > 0.8) this.worldObjects.push({ type: 'barrel', x, y, size: 70, isSolid: true, isContainer: true });
                else if (rand > 0.6) this.worldObjects.push({ type: 'tree', x, y, size: 80, isSolid: true, isContainer: true });
                else if (rand > 0.5) this.worldObjects.push({ type: 'bush', x, y, size: 80, isSolid: false, isContainer: true });
            }
        }

        for(let i=0; i<this.worldObjects.length; i++) { if(this.worldObjects[i].isContainer) containers.push(i); }
        
        // Assign Safe and Password Note randomly
        if (containers.length > 2) {
            this.safeObjIndex = containers.splice(Math.floor(Utils.randomSeed() * containers.length), 1)[0];
            this.worldObjects[this.safeObjIndex].type = 'safe';
            
            this.passwordObjIndex = containers.splice(Math.floor(Utils.randomSeed() * containers.length), 1)[0];
            this.worldObjects[this.passwordObjIndex].type = 'vending'; // Represents password drop
        }
    },

    startTransition: function() {
        this.isPlaying = false;
        document.getElementById('transition-title').innerText = `ROUND ${TeamManager.currentRound}`;
        document.getElementById('transition-subtitle').innerText = "FOX vs PANDA";
        
        let pRole = TeamManager.teams[this.players[this.localPlayerId].teamId].currentRole;
        document.getElementById('transition-tip').innerText = pRole === 'Fox' ? "🦊 Hide your Diamonds & Bombs! You have 1 Minute." : "🐼 Get ready to hunt! Wait for Fox to hide items.";
        UI.showScreen('screen-transition');
        
        let count = 15, cdEl = document.getElementById('transition-countdown'); cdEl.innerText = count;
        let iv = setInterval(() => {
            count--; cdEl.innerText = count;
            if(count <= 0) { clearInterval(iv); this.startPhase('hiding'); }
        }, 1000);
    },

    startPhase: function(phase) {
        this.phase = phase;
        
        if (phase === 'hiding') {
            this.generateMap(this.mode === 'online' ? window.dbMapSeed : Utils.randomSeed() * 10000);
            for(let id in this.players) {
                let p = this.players[id]; p.hp = 100; p.isDead = false; p.role = TeamManager.getRoleForTeam(p.teamId);
                if (p.teamId === 'A') { p.x = 200; p.y = 200; } else { p.x = 1600; p.y = 1600; }
            }
            this.foxInventory = { diamond: 5, bombs: 2 };
            this.placingItem = 'diamond';
            this.updateItemButton();

            let locP = this.players[this.localPlayerId];
            if (locP.role === 'Fox') {
                UI.showScreen('screen-game-hud');
                document.getElementById('btn-toggle-item').classList.remove('hidden');
                document.getElementById('hud-diamonds').classList.add('hidden');
                document.getElementById('btn-shoot').innerText = "📦";
                UI.showAlert("HIDE YOUR ITEMS!", "#f1c40f");
            } else {
                UI.showScreen('screen-blocker');
            }
            this.roundEndTime = Date.now() + 60000; // 1 Minute to hide
            
            // Offline auto-hide
            if (this.mode === 'offline') {
                for(let i=0; i<5; i++) this.autoPlace('diamond');
                for(let i=0; i<2; i++) this.autoPlace('bomb');
            }
            
        } else if (phase === 'playing') {
            UI.showScreen('screen-game-hud');
            document.getElementById('btn-toggle-item').classList.add('hidden');
            document.getElementById('hud-diamonds').classList.remove('hidden');
            document.getElementById('hud-diamonds').innerText = `DIAMONDS: 0/5`;
            
            let locP = this.players[this.localPlayerId];
            if (locP.role === 'Fox') {
                document.getElementById('btn-shoot').innerText = "🔫";
                UI.showAlert("DEFEND & SURVIVE!", "#e74c3c");
            } else {
                document.getElementById('btn-shoot').innerText = "🔍";
                UI.showAlert("FIND 5 DIAMONDS!", "#3498db");
            }
            this.roundEndTime = Date.now() + 180000; // 3 Minutes to hunt
        }
        
        this.isPlaying = true; this.lastTime = performance.now();
        requestAnimationFrame((ts) => this.gameLoop(ts));
    },

    autoPlace: function(type) {
        for(let i=0; i<this.worldObjects.length; i++) {
            if (this.worldObjects[i].isContainer && !this.mapItems[i] && i !== this.safeObjIndex && i !== this.passwordObjIndex) {
                this.mapItems[i] = type; return;
            }
        }
    },

    handleAction: function() {
        let p = this.players[this.localPlayerId];
        if (p.isDead) return;

        const btn = document.getElementById('btn-shoot');
        if (!p.isAiming) { p.isAiming = true; btn.style.boxShadow = "0 0 20px #e74c3c"; return; }

        p.isAiming = false; btn.style.boxShadow = "";
        let ray = this.performRaycast(p);

        if(window.playShootSound) window.playShootSound();
        this.explosions.push({ x: ray.hitX, y: ray.hitY, radius: 10, maxRadius: 40, life: 1.0 });
        this.camera.shakeTime = 5; this.camera.shakeIntensity = 10;
        if (this.mode === 'online') Network.sendShootEvent(ray.hitX, ray.hitY);

        if (this.phase === 'hiding' && p.role === 'Fox') {
            if (ray.hitTarget === 'object' && ray.hitObj.isContainer) {
                if(ray.hitObjIndex === this.safeObjIndex || ray.hitObjIndex === this.passwordObjIndex) return UI.showAlert("CAN'T HIDE HERE!", "#e74c3c");
                if(this.mapItems[ray.hitObjIndex]) return UI.showAlert("ALREADY OCCUPIED!", "#e67e22");

                if (this.placingItem === 'diamond' && this.foxInventory.diamond > 0) {
                    this.foxInventory.diamond--; this.mapItems[ray.hitObjIndex] = 'diamond';
                    UI.showAlert("DIAMOND PLACED!", "#3498db");
                    if (this.foxInventory.diamond === 0 && this.foxInventory.bombs > 0) this.placingItem = 'bomb';
                } else if (this.placingItem === 'bomb' && this.foxInventory.bombs > 0) {
                    this.foxInventory.bombs--; this.mapItems[ray.hitObjIndex] = 'bomb';
                    UI.showAlert("BOMB PLACED!", "#e74c3c");
                } else UI.showAlert("OUT OF AMMO!", "#bdc3c7");
                
                this.updateItemButton();
                if (this.mode === 'online') Network.updateRoomState({ mapItems: this.mapItems });
            }
        } 
        else if (this.phase === 'playing') {
            if (p.role === 'Fox') {
                if (ray.hitTarget === 'player') {
                    let hitP = this.players[ray.hitObjIndex];
                    if (hitP.role === 'Panda' && Utils.getDistance(p.x, p.y, hitP.x, hitP.y) < 400) {
                        UI.showAlert("HIT PANDA! -10 HP", "#2ecc71");
                        if(this.mode === 'online') Network.updateAnyPlayerStatus(hitP.id, { hp: Math.max(0, hitP.hp - 10) });
                        else hitP.hp -= 10;
                        
                        // Fox Teleports after hitting
                        p.x = 1600; p.y = 1600; 
                        if(this.mode === 'online') Network.syncPosition(p.x, p.y, false, p.aimDir);
                    } else UI.showAlert("TOO FAR!", "#e74c3c");
                }
            } else if (p.role === 'Panda') {
                if (ray.hitTarget === 'object' && ray.hitObj.isContainer) {
                    if (Utils.getDistance(p.x, p.y, ray.hitObj.x, ray.hitObj.y) > 300) return UI.showAlert("TOO FAR TO INSPECT!", "#bdc3c7");

                    if (ray.hitObjIndex === this.passwordObjIndex) { UI.showPaper(this.safePassword); UI.showAlert("🔑 FOUND PASSWORD!", "#3498db"); }
                    else if (ray.hitObjIndex === this.safeObjIndex) { if(this.safeUnlocked) UI.showAlert("ALREADY EMPTY!", "#bdc3c7"); else UI.showKeypad(); }
                    else if (this.mapItems[ray.hitObjIndex] === 'diamond') {
                        delete this.mapItems[ray.hitObjIndex]; TeamManager.addScore(p.teamId, 1);
                        UI.showAlert("💎 DIAMOND FOUND!", "#3498db");
                        document.getElementById('hud-diamonds').innerText = `DIAMONDS: ${TeamManager.teams[p.teamId].score}/5`;
                        if(this.mode === 'online') Network.updateRoomState({ mapItems: this.mapItems });
                    }
                    else if (this.mapItems[ray.hitObjIndex] === 'bomb') {
                        delete this.mapItems[ray.hitObjIndex]; UI.showAlert("💥 TRAP HIT! -20 HP", "#e74c3c");
                        if(this.mode === 'online') Network.updatePlayerStatus({ hp: Math.max(0, p.hp - 20) }); else p.hp -= 20;
                        if(this.mode === 'online') Network.updateRoomState({ mapItems: this.mapItems });
                    }
                    else UI.showAlert("NOTHING HERE...", "#bdc3c7");
                }
            }
        }
    },

    unlockSafe: function() {
        this.safeUnlocked = true;
        let p = this.players[this.localPlayerId];
        if(this.mode === 'online') Network.updatePlayerStatus({ hp: Math.min(100, p.hp + 30) }); else p.hp = Math.min(100, p.hp + 30);
    },

    performRaycast: function(shooter) {
        let gunX = shooter.x, gunY = shooter.y, hitX = gunX, hitY = gunY;
        for (let dist = 0; dist < 500; dist += 5) {
            hitX = gunX + shooter.aimDir.x * dist; hitY = gunY + shooter.aimDir.y * dist;
            for (let id in this.players) {
                let p = this.players[id];
                if (p.id !== shooter.id && !p.isDead && p.teamId !== shooter.teamId) {
                    if (Utils.getDistance(hitX, hitY, p.x, p.y) < 50) return { hitX, hitY, hitTarget: 'player', hitObjIndex: id, gunX, gunY };
                }
            }
            for (let j = 0; j < this.worldObjects.length; j++) {
                let obj = this.worldObjects[j];
                if (obj.isSolid || obj.isContainer) {
                    if (hitX > obj.x && hitX < obj.x + obj.size && hitY > obj.y && hitY < obj.y + obj.size) return { hitX, hitY, hitTarget: 'object', hitObjIndex: j, hitObj: obj, gunX, gunY };
                }
            }
        }
        return { hitX, hitY, hitTarget: null, hitObjIndex: -1, gunX, gunY };
    },

    endRound: function(reason) {
        this.isPlaying = false; this.phase = 'none';
        if (TeamManager.currentRound === 1) {
            TeamManager.currentRound = 2; TeamManager.assignRolesForRound(); this.startTransition();
        } else {
            let winner = TeamManager.getWinner(), totalD = TeamManager.teams.A.score + TeamManager.teams.B.score;
            document.getElementById('result-winner').innerText = winner === "DRAW" ? "MATCH DRAW 🤝" : `${winner} WINS! 🎉`;
            document.getElementById('result-diamonds').innerText = totalD;
            let reward = winner === "DRAW" ? 25 : (winner === TeamManager.teams[this.players[this.localPlayerId].teamId].name ? 50 : 5);
            Economy.addCoins(reward); document.getElementById('result-coins').innerText = `+${reward} 🪙`;
            UI.showScreen('screen-result');
        }
    },

    gameLoop: function(timestamp) {
        if (!this.isPlaying) return;
        let dt = Math.min((timestamp - this.lastTime) / 1000, 0.05); this.lastTime = timestamp;

        if (this.input.x === 0 && this.input.y === 0) {
            let dx=0, dy=0;
            if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1; if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1; if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
            this.input = {x: dx, y: dy};
        }

        let locP = this.players[this.localPlayerId];
        locP.update(dt, this.input, this.worldObjects);
        if (this.mode === 'online') Network.syncPosition(locP.x, locP.y, locP.isAiming, locP.aimDir);

        let tCamX = locP.x - this.canvas.width / 2, tCamY = locP.y - this.canvas.height / 2;
        if(this.camera.shakeTime > 0) { tCamX += (Math.random() - 0.5) * this.camera.shakeIntensity; tCamY += (Math.random() - 0.5) * this.camera.shakeIntensity; this.camera.shakeTime -= dt * 60; }
        this.camera.x += (tCamX - this.camera.x) * (dt * 6); this.camera.y += (tCamY - this.camera.y) * (dt * 6);

        this.render();

        let msLeft = this.roundEndTime - Date.now();
        if (this.phase === 'hiding') {
            document.getElementById('blocker-timer').innerText = `${Math.floor(msLeft/1000)}s`;
            if (msLeft <= 0) this.startPhase('playing');
        } else if (this.phase === 'playing') {
            UI.updateHUDTimer(msLeft);
            
            let myTeam = locP.teamId, enemyTeam = myTeam === 'A' ? 'B' : 'A';
            let myHP = locP.hp, enemyHP = 0;
            for(let id in this.players) { if(this.players[id].teamId === enemyTeam && !this.players[id].isDead) enemyHP += this.players[id].hp; }
            UI.updateHUDTeams(locP.role === 'Fox' ? myHP : enemyHP, locP.role === 'Panda' ? myHP : enemyHP);
            
            if (locP.hp <= 0) UI.setSpectatorMode(true);
            
            if (msLeft <= 0 || enemyHP <= 0 || TeamManager.teams[locP.teamId].score >= 5 || TeamManager.teams[enemyTeam].score >= 5) {
                this.endRound("Phase Over"); return;
            }
        }
        requestAnimationFrame((ts) => this.gameLoop(ts));
    },

    render: function() {
        const ctx = this.ctx; ctx.fillStyle = '#6ab04c'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.save(); ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));
        ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 5; ctx.strokeRect(0, 0, 22*80, 22*80);

        let renderQ = [];
        for(let i=0; i<this.worldObjects.length; i++) renderQ.push({ type: 'obj', y: this.worldObjects[i].y + this.worldObjects[i].size, item: this.worldObjects[i], id: i });
        for(let id in this.players) if(!this.players[id].isDead || this.players[id].hp > 0) renderQ.push({ type: 'player', y: this.players[id].y, item: this.players[id] });
        renderQ.sort((a,b) => a.y - b.y);

        for(let q of renderQ) {
            if (q.type === 'player') q.item.draw(ctx, this.images);
            else {
                let obj = q.item;
                ctx.fillStyle = obj.type === 'wall' ? '#34495e' : (obj.type === 'safe' ? '#7f8c8d' : '#e67e22');
                ctx.fillRect(obj.x, obj.y, obj.size, obj.size);
                
                if (this.players[this.localPlayerId].role === 'Fox' && this.mapItems[q.id]) {
                    ctx.strokeStyle = this.mapItems[q.id] === 'diamond' ? '#3498db' : '#e74c3c'; ctx.lineWidth = 4;
                    ctx.strokeRect(obj.x, obj.y, obj.size, obj.size);
                }
            }
        }

        for(let id in this.players) {
            let p = this.players[id];
            if (p.isAiming && !p.isDead && p.hp > 0) {
                let r = this.performRaycast(p);
                ctx.beginPath(); ctx.moveTo(r.gunX, r.gunY); ctx.lineTo(r.hitX, r.hitY);
                ctx.strokeStyle = "rgba(231, 76, 60, 0.5)"; ctx.lineWidth = 4; ctx.stroke();
            }
        }

        for (let i = this.explosions.length - 1; i >= 0; i--) {
            let exp = this.explosions[i];
            ctx.beginPath(); ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2); ctx.fillStyle = `rgba(241, 196, 15, ${exp.life})`; ctx.fill();
            exp.radius += 400 * 0.016; exp.life -= 3 * 0.016; if (exp.life <= 0) this.explosions.splice(i, 1);
        }
        ctx.restore();
    }
};
