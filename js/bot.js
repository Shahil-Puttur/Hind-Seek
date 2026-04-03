// js/bot.js

class BotController {
    constructor(playerInstance) {
        this.player = playerInstance;
        this.state = 'wander'; 
        this.targetNode = { x: 0, y: 0 };
        this.actionTimer = 0;
        this.input = { x: 0, y: 0 };
        this.pickNewTarget();
    }

    pickNewTarget() {
        this.targetNode = {
            x: (Math.random() * (CONFIG.MAP_SIZE - 4) + 2) * CONFIG.TILE_SIZE,
            y: (Math.random() * (CONFIG.MAP_SIZE - 4) + 2) * CONFIG.TILE_SIZE
        };
    }

    update(dt, worldObjects, allPlayers) {
        if (this.player.isDead || this.player.hp <= 0) return;

        // BOTS STOP DURING HIDING PHASE
        if (Game.phase === 'hiding') {
            this.input.x = 0; this.input.y = 0; this.player.isAiming = false;
            this.player.update(dt, this.input, worldObjects);
            return;
        }

        this.actionTimer -= dt;
        this.input.x = 0; this.input.y = 0; this.player.isAiming = false;

        let nearestEnemy = this.findNearestEnemy(allPlayers);
        let distToEnemy = nearestEnemy ? Utils.getDistance(this.player.x, this.player.y, nearestEnemy.x, nearestEnemy.y) : Infinity;

        if (this.player.role === 'Panda') {
            if (nearestEnemy && distToEnemy < 400) {
                this.state = 'chase';
                this.targetNode = { x: nearestEnemy.x, y: nearestEnemy.y };
                if (distToEnemy < 200 && this.actionTimer <= 0) {
                    this.player.isAiming = true;
                    this.wantsToShoot = true; 
                    this.actionTimer = 1.5; 
                } else {
                    this.wantsToShoot = false;
                }
            } else if (distToEnemy >= 400 && this.state === 'chase') {
                this.state = 'wander'; this.pickNewTarget();
            }
        } else {
            if (nearestEnemy && distToEnemy < 350) {
                this.state = 'flee';
                let dirX = this.player.x - nearestEnemy.x;
                let dirY = this.player.y - nearestEnemy.y;
                let len = Math.sqrt(dirX*dirX + dirY*dirY);
                this.targetNode = { x: this.player.x + (dirX/len)*100, y: this.player.y + (dirY/len)*100 };
            } else if (this.state === 'flee') {
                this.state = 'wander'; this.pickNewTarget();
            }
        }

        if (this.state === 'wander' && this.actionTimer <= 0) {
            let distToTarget = Utils.getDistance(this.player.x, this.player.y, this.targetNode.x, this.targetNode.y);
            if (distToTarget < 50) {
                this.pickNewTarget(); this.actionTimer = 2.0; 
            }
        }

        if (this.actionTimer <= 0 || this.state === 'chase' || this.state === 'flee') {
            let dx = this.targetNode.x - this.player.x; let dy = this.targetNode.y - this.player.y;
            let len = Math.sqrt(dx*dx + dy*dy);
            if (len > 5) { this.input.x = dx / len; this.input.y = dy / len; }
        }

        this.player.update(dt, this.input, worldObjects);
    }

    findNearestEnemy(players) {
        let nearest = null, minDist = Infinity;
        for(let key in players) {
            let p = players[key];
            if(!p.isDead && p.hp > 0 && p.teamId !== this.player.teamId) {
                let d = Utils.getDistance(this.player.x, this.player.y, p.x, p.y);
                if(d < minDist) { minDist = d; nearest = p; }
            }
        }
        return nearest;
    }
            }
