// js/game.js

const Game = {
    canvas: null,
    ctx: null,
    mode: 'offline', // 'offline' or 'online'
    isPlaying: false,
    
    players: {},
    bots: [],
    localPlayerId: null,
    
    worldObjects: [],
    mapItems: {}, // Stores diamonds { objIndex: 'diamond' }
    explosions: [],
    
    camera: { x: 0, y: 0, shakeTime: 0, shakeIntensity: 0 },
    lastTime: 0,
    images: {},
    
    input: { x: 0, y: 0 },
    keys: {},
    placingItem: 'diamond',

    init: function() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupInput();
    },

    resize: function() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    setupInput: function() {
        // Keyboard
        window.addEventListener('keydown', (e) => { 
            this.keys[e.code] = true; 
            if(e.code === 'Space') this.handleAction(); 
        });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        // Joystick
        const zone = document.getElementById('joystick-zone');
        const knob = document.getElementById('joystick-knob');
        let isDragging = false, touchId = null, center = { x: 0, y: 0 };

        zone.addEventListener('touchstart', (e) => {
            e.preventDefault(); if(isDragging) return;
            let touch = e.changedTouches[0]; touchId = touch.identifier; isDragging = true;
            let rect = zone.getBoundingClientRect(); 
            center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            this.updateJoystick(touch.clientX, touch.clientY, center, knob);
        }, {passive: false});

        window.addEventListener('touchmove', (e) => {
            if(!isDragging) return;
            for(let i=0; i<e.changedTouches.length; i++) {
                if(e.changedTouches[i].identifier === touchId) {
                    this.updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY, center, knob);
                }
            }
        }, {passive: false});

        window.addEventListener('touchend', (e) => {
            for(let i=0; i<e.changedTouches.length; i++) {
                if(e.changedTouches[i].identifier === touchId) {
                    isDragging = false; touchId = null; 
                    knob.style.transform = `translate(-50%, -50%)`; 
                    this.input = { x: 0, y: 0 };
                }
            }
        });

        // Action Buttons
        document.getElementById('btn-shoot').addEventListener('pointerdown', (e) => {
            e.preventDefault(); this.handleAction();
        });

        document.getElementById('btn-toggle-item').addEventListener('pointerdown', (e) => {
            e.preventDefault();
            UI.showAlert("Currently only Diamonds can be placed!", "#f1c40f");
        });
    },

    updateJoystick: function(clientX, clientY, center, knob) {
        let dx = clientX - center.x; let dy = clientY - center.y;
        let dist = Math.sqrt(dx*dx + dy*dy); let maxRad = 45;
        if (dist < 5) { this.input = {x:0, y:0}; return; }
        if (dist > maxRad) { dx = (dx/dist)*maxRad; dy = (dy/dist)*maxRad; }
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        this.input = { x: dx/maxRad, y: dy/maxRad };
    },

    generateMap: function(seed) {
        Utils.setSeed(seed);
        this.worldObjects = [];
        this.mapItems = {};

        for (let r = 0; r < CONFIG.MAP_SIZE; r++) {
            for (let c = 0; c < CONFIG.MAP_SIZE; c++) {
                let x = c * CONFIG.TILE_SIZE; let y = r * CONFIG.TILE_SIZE;
                // Border Walls
                if (r === 0 || r === CONFIG.MAP_SIZE - 1 || c === 0 || c === CONFIG.MAP_SIZE - 1) { 
                    this.worldObjects.push({ type: 'wall', x: x, y: y, size: CONFIG.TILE_SIZE, isSolid: true }); 
                    continue; 
                }
                // Leave spawn areas empty
                if ((c < 4 && r < 4) || (c > CONFIG.MAP_SIZE - 5 && r > CONFIG.MAP_SIZE - 5)) continue;

                // Random Obstacles
                let rand = Utils.randomSeed();
                if (rand > 0.8) this.worldObjects.push({ type: 'barrel', x: x, y: y, size: CONFIG.TILE_SIZE-10, isSolid: true, isContainer: true });
                else if (rand > 0.6) this.worldObjects.push({ type: 'tree', x: x, y: y, size: CONFIG.TILE_SIZE, isSolid: true, isContainer: true });
                else if (rand > 0.5) this.worldObjects.push({ type: 'bush', x: x, y: y, size: CONFIG.TILE_SIZE, isSolid: false, isContainer: true });
            }
        }
    },

    startTransition: function() {
        this.isPlaying = false;
        
        let title = `ROUND ${TeamManager.currentRound}`;
        let roleA = TeamManager.teams.A.currentRole;
        let roleB = TeamManager.teams.B.currentRole;
        let sub = `${TeamManager.teams.A.name} (${roleA}) vs ${TeamManager.teams.B.name} (${roleB})`;
        
        document.getElementById('transition-title').innerText = title;
        document.getElementById('transition-subtitle').innerText = sub;
        
        let tip = (TeamManager.teams[this.players[this.localPlayerId].teamId].currentRole === 'Fox') 
            ? "🦊 You are FOX! Hide your diamonds and defend yourself!"
            : "🐼 You are PANDA! Find diamonds and don't get shot!";
        document.getElementById('transition-tip').innerText = tip;

        UI.showScreen('screen-transition');
        
        let count = 5;
        let cdEl = document.getElementById('transition-countdown');
        cdEl.innerText = count;

        let iv = setInterval(() => {
            count--;
            cdEl.innerText = count;
            if(count <= 0) {
                clearInterval(iv);
                this.startRound();
            }
        }, 1000);
    },

    startRound: function() {
        this.generateMap(this.mode === 'online' ? window.dbMapSeed : Utils.randomSeed() * 10000);
        
        // Reset players
        for(let id in this.players) {
            let p = this.players[id];
            p.hearts = CONFIG.MAX_HEARTS;
            p.isDead = false;
            p.role = TeamManager.getRoleForTeam(p.teamId);
            
            if (p.teamId === 'A') { p.x = 200; p.y = 200; } 
            else { p.x = CONFIG.MAP_PIXEL_SIZE - 200; p.y = CONFIG.MAP_PIXEL_SIZE - 200; }
        }

        this.roundEndTime = Date.now() + CONFIG.ROUND_TIME_MS;
        
        // Setup HUD
        let locP = this.players[this.localPlayerId];
        UI.setSpectatorMode(false);
        UI.showScreen('screen-game-hud');
        
        if (locP.role === 'Fox') {
            document.getElementById('btn-toggle-item').classList.remove('hidden');
            document.getElementById('hud-diamonds').classList.add('hidden');
            this.placedDiamonds = 0;
            document.getElementById('btn-toggle-item').innerText = `💎 Place: DIAMOND (${CONFIG.DIAMONDS_PER_ROUND})`;
        } else {
            document.getElementById('btn-toggle-item').classList.add('hidden');
            document.getElementById('hud-diamonds').classList.remove('hidden');
            document.getElementById('hud-diamonds').innerText = `DIAMONDS FOUND: 0/${CONFIG.DIAMONDS_PER_ROUND}`;
        }
        
        this.isPlaying = true;
        this.lastTime = performance.now();
        requestAnimationFrame((ts) => this.gameLoop(ts));
    },

    handleAction: function() {
        let p = this.players[this.localPlayerId];
        if (p.isDead) return;

        const btn = document.getElementById('btn-shoot');

        // 1. Aim Mode Toggle
        if (!p.isAiming) {
            p.isAiming = true;
            btn.style.boxShadow = "0 0 20px #e74c3c"; // glow
            return;
        }

        // 2. Execute Action (Shoot/Interact)
        p.isAiming = false;
        btn.style.boxShadow = "";
        
        let ray = this.performRaycast(p);
        
        // Render explosion locally
        this.explosions.push({ x: ray.hitX, y: ray.hitY, radius: 10, maxRadius: 40, life: 1.0 });
        this.camera.shakeTime = 5; 
        this.camera.shakeIntensity = 10;

        if (this.mode === 'online') {
            Network.sendShootEvent(ray.hitX, ray.hitY);
        }

        if (p.role === 'Fox') {
            // FOX ACTION: Place Diamond OR Shoot Panda
            if (ray.hitTarget === 'object' && ray.hitObj.isContainer) {
                if (this.placedDiamonds < CONFIG.DIAMONDS_PER_ROUND) {
                    if (!this.mapItems[ray.hitObjIndex]) {
                        this.mapItems[ray.hitObjIndex] = 'diamond';
                        this.placedDiamonds++;
                        document.getElementById('btn-toggle-item').innerText = `💎 Place: DIAMOND (${CONFIG.DIAMONDS_PER_ROUND - this.placedDiamonds})`;
                        UI.showAlert("DIAMOND PLACED!", "#3498db");
                    } else {
                        UI.showAlert("ALREADY OCCUPIED!", "#e67e22");
                    }
                } else {
                    UI.showAlert("OUT OF DIAMONDS!", "#e74c3c");
                }
            } else if (ray.hitTarget === 'player') {
                let hitP = this.players[ray.hitObjIndex]; // For players, index is ID
                if (hitP.role === 'Panda') {
                    hitP.takeDamage();
                    UI.showAlert("HIT PANDA!", "#e74c3c");
                }
            }
        } else if (p.role === 'Panda') {
            // PANDA ACTION: Inspect Object
            if (ray.hitTarget === 'object' && ray.hitObj.isContainer) {
                if (this.mapItems[ray.hitObjIndex] === 'diamond') {
                    delete this.mapItems[ray.hitObjIndex];
                    TeamManager.addScore(p.teamId, 1);
                    UI.showAlert("💎 DIAMOND FOUND!", "#3498db");
                    document.getElementById('hud-diamonds').innerText = `DIAMONDS FOUND: ${TeamManager.teams[p.teamId].score}/${CONFIG.DIAMONDS_PER_ROUND}`;
                } else {
                    UI.showAlert("NOTHING HERE...", "#bdc3c7");
                }
            } else {
                UI.showAlert("MISS!", "#bdc3c7");
            }
        }
    },

    performRaycast: function(shooter) {
        let gunX = shooter.x; let gunY = shooter.y; 
        let hitX = gunX; let hitY = gunY; 
        let hitTarget = null; let hitObjIndex = -1; let hitObj = null;
        let closestDist = Infinity;
        
        for (let dist = 0; dist < 500; dist += 5) {
            hitX = gunX + shooter.aimDir.x * dist; 
            hitY = gunY + shooter.aimDir.y * dist;
            
            // Check Players
            for (let id in this.players) {
                let p = this.players[id];
                if (p.id !== shooter.id && !p.isDead && p.teamId !== shooter.teamId) {
                    if (Utils.getDistance(hitX, hitY, p.x, p.y) < CONFIG.PLAYER_SIZE/2) {
                        return { hitX, hitY, hitTarget: 'player', hitObjIndex: id, gunX, gunY };
                    }
                }
            }

            // Check Objects
            for (let j = 0; j < this.worldObjects.length; j++) {
                let obj = this.worldObjects[j];
                if (obj.isSolid || obj.isContainer) {
                    if (hitX > obj.x && hitX < obj.x + obj.size && hitY > obj.y && hitY < obj.y + obj.size) {
                        return { hitX, hitY, hitTarget: 'object', hitObjIndex: j, hitObj: obj, gunX, gunY };
                    }
                }
            }
        }
        return { hitX, hitY, hitTarget: null, hitObjIndex: -1, gunX, gunY };
    },

    endRound: function(reason) {
        this.isPlaying = false;
        
        if (TeamManager.currentRound === 1) {
            TeamManager.currentRound = 2;
            TeamManager.assignRolesForRound();
            this.startTransition();
        } else {
            // End Match
            let winner = TeamManager.getWinner();
            let totalD = TeamManager.teams.A.score + TeamManager.teams.B.score; // In offline this varies
            
            document.getElementById('result-winner').innerText = winner === "DRAW" ? "MATCH DRAW 🤝" : `${winner} WINS! 🎉`;
            document.getElementById('result-diamonds').innerText = totalD;
            
            let reward = winner === "DRAW" ? CONFIG.REWARD_DRAW : 
                         (winner === TeamManager.teams[this.players[this.localPlayerId].teamId].name ? CONFIG.REWARD_WIN : CONFIG.REWARD_LOSE);
            
            Economy.addCoins(reward);
            document.getElementById('result-coins').innerText = `+${reward} 🪙`;
            
            UI.showScreen('screen-result');
        }
    },

    gameLoop: function(timestamp) {
        if (!this.isPlaying) return;
        
        let dt = (timestamp - this.lastTime) / 1000;
        if(dt > 0.05) dt = 0.05; 
        this.lastTime = timestamp;

        // Offline Fallback Input
        if (this.input.x === 0 && this.input.y === 0) {
            let dx=0, dy=0;
            if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
            if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
            if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
            this.input = {x: dx, y: dy};
        }

        // Update local player
        let locP = this.players[this.localPlayerId];
        locP.update(dt, this.input, this.worldObjects);

        // Update Bots
        if (this.mode === 'offline') {
            for (let bot of this.bots) {
                bot.update(dt, this.worldObjects, this.players);
                // Handle bot shooting
                if (bot.wantsToShoot) {
                    bot.wantsToShoot = false;
                    let ray = this.performRaycast(bot.player);
                    this.explosions.push({ x: ray.hitX, y: ray.hitY, radius: 10, maxRadius: 40, life: 1.0 });
                    if(ray.hitTarget === 'player') {
                        this.players[ray.hitObjIndex].takeDamage();
                    }
                }
            }
        } else {
            // Online Sync
            Network.syncPosition(locP.x, locP.y, locP.isAiming, locP.aimDir);
        }

        // Camera Logic
        let tCamX = locP.x - this.canvas.width / 2; 
        let tCamY = locP.y - this.canvas.height / 2;
        if(this.camera.shakeTime > 0) { 
            tCamX += (Math.random() - 0.5) * this.camera.shakeIntensity; 
            tCamY += (Math.random() - 0.5) * this.camera.shakeIntensity; 
            this.camera.shakeTime -= dt * 60; 
        }
        this.camera.x += (tCamX - this.camera.x) * (dt * 6); 
        this.camera.y += (tCamY - this.camera.y) * (dt * 6);

        // Render
        this.render();

        // Round Checks
        let msLeft = this.roundEndTime - Date.now();
        UI.updateHUDTimer(msLeft);

        let teamStats = { A: {alive:0, total:0}, B: {alive:0, total:0} };
        for(let id in this.players) {
            let p = this.players[id];
            teamStats[p.teamId].total++;
            if(!p.isDead) teamStats[p.teamId].alive++;
        }
        UI.updateHUDTeams(teamStats.A.alive, teamStats.A.total, teamStats.B.alive, teamStats.B.total);

        let check = TeamManager.checkRoundEnd(this.players);
        if (check.ended || msLeft <= 0) {
            this.endRound(check.reason);
            return;
        }

        requestAnimationFrame((ts) => this.gameLoop(ts));
    },

    render: function() {
        const ctx = this.ctx;
        ctx.fillStyle = '#6ab04c'; 
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.save(); 
        ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));
        
        // Draw Map Border
        ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 5;
        ctx.strokeRect(0, 0, CONFIG.MAP_PIXEL_SIZE, CONFIG.MAP_PIXEL_SIZE);

        // Sort Y for depth
        let renderQ = [];
        for(let i=0; i<this.worldObjects.length; i++) {
            renderQ.push({ type: 'obj', y: this.worldObjects[i].y + this.worldObjects[i].size, item: this.worldObjects[i], id: i });
        }
        for(let id in this.players) {
            if(!this.players[id].isDead) {
                renderQ.push({ type: 'player', y: this.players[id].y, item: this.players[id] });
            }
        }
        renderQ.sort((a,b) => a.y - b.y);

        for(let q of renderQ) {
            if (q.type === 'player') {
                q.item.draw(ctx, this.images);
            } else {
                let obj = q.item;
                ctx.fillStyle = obj.type === 'wall' ? '#34495e' : (obj.type === 'tree' ? '#27ae60' : '#e67e22');
                ctx.fillRect(obj.x, obj.y, obj.size, obj.size);
                
                // Debug text
                ctx.fillStyle = '#fff'; ctx.font = '12px Arial';
                ctx.fillText(obj.type, obj.x + 5, obj.y + 20);

                // Highlight if it contains diamond (only Fox sees this)
                if (this.players[this.localPlayerId].role === 'Fox' && this.mapItems[q.id] === 'diamond') {
                    ctx.strokeStyle = '#3498db'; ctx.lineWidth = 3;
                    ctx.strokeRect(obj.x, obj.y, obj.size, obj.size);
                }
            }
        }

        // Draw Aim Lines
        for(let id in this.players) {
            let p = this.players[id];
            if (p.isAiming && !p.isDead) {
                let r = this.performRaycast(p);
                ctx.beginPath(); ctx.moveTo(r.gunX, r.gunY); ctx.lineTo(r.hitX, r.hitY);
                ctx.strokeStyle = "rgba(231, 76, 60, 0.5)"; ctx.lineWidth = 4; ctx.stroke();
            }
        }

        // Draw Explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            let exp = this.explosions[i];
            ctx.beginPath(); ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2); 
            ctx.fillStyle = `rgba(241, 196, 15, ${exp.life})`; ctx.fill();
            exp.radius += 400 * 0.016; 
            exp.life -= 3 * 0.016; 
            if (exp.life <= 0) this.explosions.splice(i, 1);
        }

        ctx.restore();
    }
};
