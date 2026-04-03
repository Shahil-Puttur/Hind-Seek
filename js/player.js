// js/player.js

class Player {
    constructor(id, x, y, isLocal) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.targetX = x; // For network interpolation
        this.targetY = y;
        
        this.width = CONFIG.PLAYER_SIZE;
        this.height = CONFIG.PLAYER_SIZE;
        this.speed = CONFIG.PLAYER_SPEED;
        
        // Stats & State
        this.hearts = CONFIG.MAX_HEARTS; 
        this.isDead = false; // true = spectator
        this.role = ""; // 'Fox' or 'Panda'
        this.teamId = ""; // 'A' or 'B'
        
        // Animation & Orientation
        this.frameX = 0;
        this.frameY = 0;
        this.gameFrame = 0;
        this.staggerFrames = 5;
        this.facingRight = true;
        this.isMoving = false;
        
        // Actions
        this.aimDir = { x: 1, y: 0 };
        this.isAiming = false;
        this.isLocal = isLocal;
    }

    update(dt, input, worldObjects) {
        if (this.isDead) return; // Spectators don't move physically

        if (this.isLocal) {
            let dx = input.x;
            let dy = input.y;

            this.isMoving = (dx !== 0 || dy !== 0);
            
            if (this.isMoving) { 
                // Normalize directional vector
                let len = Math.sqrt(dx * dx + dy * dy); 
                dx /= len; 
                dy /= len; 
                this.aimDir.x = dx; 
                this.aimDir.y = dy;
                
                // Determine facing direction for animation
                let angle = Math.atan2(dy, dx) * (180 / Math.PI);
                if (angle > -45 && angle <= 45) { this.frameY = 2; this.facingRight = true; } 
                else if (angle > 45 && angle <= 135) { this.frameY = 0; } 
                else if (angle > 135 || angle <= -135) { this.frameY = 2; this.facingRight = false; } 
                else if (angle > -135 && angle <= -45) { this.frameY = 1; }
            }

            // Aiming slows you down
            let moveSpeed = this.isAiming ? this.speed * 0.4 : this.speed; 
            
            // Move X and check collision
            let prevX = this.x; 
            this.x += dx * moveSpeed * dt; 
            if (this.checkCollision(worldObjects)) this.x = prevX; 
            
            // Move Y and check collision
            let prevY = this.y; 
            this.y += dy * moveSpeed * dt; 
            if (this.checkCollision(worldObjects)) this.y = prevY; 
            
        } else {
            // Remote player interpolation
            let dx = this.targetX - this.x; 
            let dy = this.targetY - this.y;
            this.isMoving = (Math.abs(dx) > 2 || Math.abs(dy) > 2);
            
            if (Math.abs(dx) > CONFIG.TILE_SIZE * 3 || Math.abs(dy) > CONFIG.TILE_SIZE * 3) { 
                this.x = this.targetX; 
                this.y = this.targetY; 
            } else { 
                this.x += dx * 10 * dt; 
                this.y += dy * 10 * dt; 
            }
        }

        // Animation Frames
        if (this.isMoving && !this.isAiming) { 
            this.gameFrame += dt * 60; 
            if (Math.floor(this.gameFrame) % this.staggerFrames === 0) {
                this.frameX = (Math.floor(this.gameFrame / this.staggerFrames)) % 4; 
            }
        } else if (this.isAiming) { 
            this.frameX = 0; 
        } else { 
            this.frameX = 0; 
            this.gameFrame = 0; 
        }
    }

    checkCollision(worldObjects) {
        if (!worldObjects) return false;
        
        let pBox = { 
            left: this.x - CONFIG.HITBOX_W/2, 
            right: this.x + CONFIG.HITBOX_W/2, 
            top: this.y + 10, 
            bottom: this.y + 10 + CONFIG.HITBOX_H 
        };
        
        // Map bounds
        if(pBox.left < 0 || pBox.right > CONFIG.MAP_PIXEL_SIZE || pBox.top < 0 || pBox.bottom > CONFIG.MAP_PIXEL_SIZE) return true;
        
        // World Objects
        for (let i = 0; i < worldObjects.length; i++) {
            let obj = worldObjects[i];
            if (obj.isSolid) {
                let oBox = {
                    left: obj.x, right: obj.x + obj.size,
                    top: obj.y + (obj.size * 0.5), bottom: obj.y + obj.size
                };
                if (Utils.checkCollision(pBox, oBox)) return true;
            }
        }
        return false;
    }

    takeDamage() {
        if (this.isDead) return;
        this.hearts--;
        if (this.hearts <= 0) {
            this.isDead = true; // Becomes spectator
            if(this.isLocal) UI.setSpectatorMode(true);
        }
    }

    draw(ctx, images) {
        if(this.isDead) return; // Don't draw spectators

        // Draw shadow
        ctx.fillStyle = "rgba(0,0,0,0.2)"; 
        ctx.beginPath(); 
        ctx.ellipse(this.x, this.y + 40, 25, 10, 0, 0, Math.PI * 2); 
        ctx.fill();

        // Draw Team Indicator Ring
        ctx.strokeStyle = this.teamId === 'A' ? CONFIG.TEAM_A.color : CONFIG.TEAM_B.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 40, 35, 15, 0, 0, Math.PI * 2);
        ctx.stroke();

        let img = images[this.role === 'Fox' ? 'fox' : 'panda'];
        
        if (img && img.complete) {
            let spriteW = img.width / 4; 
            let spriteH = img.height / 3;
            
            ctx.save(); 
            ctx.translate(this.x, this.y);
            if (!this.facingRight && this.frameY === 2) ctx.scale(-1, 1); 
            if (this.isMoving && !this.isAiming) ctx.translate(0, Math.sin(this.gameFrame*0.5)*2);
            
            ctx.drawImage(img, this.frameX * spriteW, this.frameY * spriteH, spriteW, spriteH, -this.width / 2, -this.height / 2, this.width, this.height);
            ctx.restore();
        } else {
            // Fallback shape
            ctx.save(); 
            ctx.translate(this.x, this.y);
            ctx.fillStyle = this.role === 'Fox' ? '#e67e22' : '#ecf0f1';
            ctx.beginPath(); 
            ctx.arc(0, -10, this.width * 0.3, 0, Math.PI * 2); 
            ctx.fill();
            ctx.restore();
        }
    }
}
