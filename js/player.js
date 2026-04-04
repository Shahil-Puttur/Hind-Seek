// js/player.js
class Player {
    constructor(id, name, team, isLocal) {
        this.id = id;
        this.name = name;
        this.team = team;
        this.isLocal = isLocal;
        this.isDead = false;
        
        // Physics
        this.x = team === 'teamA' ? 200 : CONFIG.MAP.PIXEL_SIZE - 200;
        this.y = team === 'teamA' ? 200 : CONFIG.MAP.PIXEL_SIZE - 200;
        this.targetX = this.x;
        this.targetY = this.y;
        this.width = 100;
        this.height = 100;
        this.speed = 400;
        this.hitbox = { w: 30, h: 25 };
        
        // State
        this.hp = 100;
        this.isAiming = false;
        this.aimDir = { x: 1, y: 0 };
        this.frameX = 0;
        this.frameY = 2;
        this.gameFrame = 0;
        this.facingRight = true;
        this.isMoving = false;
    }

    update(dt) {
        if (this.isDead) return;

        if (this.isLocal) {
            let dx = window.Input.x;
            let dy = window.Input.y;

            if (Game.phase !== 'playing' && Game.phase !== 'hiding') { dx = 0; dy = 0; }
            if (Game.phase === 'hiding' && Game.myRole === 'panda') { dx = 0; dy = 0; } // Pandas can't move in hiding phase
            if (Date.now() < Game.frozenUntil) { dx = 0; dy = 0; } // Freeze bomb effect

            this.isMoving = (dx !== 0 || dy !== 0);
            
            if (this.isMoving) {
                let len = Math.sqrt(dx * dx + dy * dy);
                dx /= len; dy /= len;
                this.aimDir = { x: dx, y: dy };
                this.updateSpriteDirection(dx, dy);
            }

            let moveSpeed = this.isAiming ? this.speed * 0.4 : this.speed;
            let px = this.x; this.x += dx * moveSpeed * dt;
            if (this.checkCollision()) this.x = px;
            
            let py = this.y; this.y += dy * moveSpeed * dt;
            if (this.checkCollision()) this.y = py;

        } else {
            // Dead Reckoning & Lerping for remote players to hide latency
            let dx = this.targetX - this.x;
            let dy = this.targetY - this.y;
            this.isMoving = (Math.abs(dx) > 2 || Math.abs(dy) > 2);
            
            if (Utils.distance(this.x, this.y, this.targetX, this.targetY) > 240) {
                this.x = this.targetX; this.y = this.targetY; // Teleport if desynced heavily
            } else {
                this.x += dx * 10 * dt;
                this.y += dy * 10 * dt;
            }
            if (this.isMoving && !this.isAiming) this.updateSpriteDirection(dx, dy);
        }

        // Animation Loop
        if (this.isMoving && !this.isAiming) {
            this.gameFrame += dt * 60;
            if (Math.floor(this.gameFrame) % 5 === 0) this.frameX = (Math.floor(this.gameFrame / 5)) % 4;
        } else {
            this.frameX = 0; this.gameFrame = 0;
        }
    }

    updateSpriteDirection(dx, dy) {
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle > -45 && angle <= 45) { this.frameY = 2; this.facingRight = true; } 
        else if (angle > 45 && angle <= 135) { this.frameY = 0; } 
        else if (angle > 135 || angle <= -135) { this.frameY = 2; this.facingRight = false; } 
        else if (angle > -135 && angle <= -45) { this.frameY = 1; }
    }

    checkCollision() {
        let box = { left: this.x - this.hitbox.w/2, right: this.x + this.hitbox.w/2, top: this.y + 10, bottom: this.y + 10 + this.hitbox.h };
        if (box.left < 0 || box.right > CONFIG.MAP.PIXEL_SIZE || box.top < 0 || box.bottom > CONFIG.MAP.PIXEL_SIZE) return true;
        
        for (let obj of Object.values(Game.worldObjects)) {
            if (obj.isSolid) {
                let oBox = { left: obj.x, right: obj.x + obj.size, top: obj.y + (obj.size*0.5), bottom: obj.y + obj.size };
                if (Utils.checkCollision(box, oBox)) return true;
            }
        }
        return false;
    }

    draw(ctx) {
        if (this.isDead) return;
        
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath(); ctx.ellipse(this.x, this.y + 40, 25, 10, 0, 0, Math.PI * 2); ctx.fill();

        // Fallback drawing if images fail
        ctx.save(); ctx.translate(this.x, this.y);
        if (!this.facingRight) ctx.scale(-1, 1);
        ctx.fillStyle = this.team === 'teamA' ? CONFIG.TEAMS.FOX.color : CONFIG.TEAMS.PANDA.color;
        ctx.beginPath(); ctx.arc(0, -10, this.width * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // HP Bar
        if (!this.isLocal) {
            ctx.fillStyle = "#e74c3c"; ctx.fillRect(this.x - 20, this.y - 45, 40, 5);
            ctx.fillStyle = "#2ecc71"; ctx.fillRect(this.x - 20, this.y - 45, (this.hp/100)*40, 5);
        }
    }
            }
