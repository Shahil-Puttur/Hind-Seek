// js/bot.js

class BotController {
    constructor(playerInstance) {
        this.player = playerInstance;
        this.state = 'wander'; // wander, chase, flee, hide
        this.targetNode = { x: 0, y: 0 };
        this.actionTimer = 0;
        this.input = { x: 0, y: 0 };
        this.pickNewTarget();
    }

    pickNewTarget() {
        // Pick a random valid spot on the map
        this.targetNode = {
            x: (Math.random() * (CONFIG.MAP_SIZE - 4) + 2) * CONFIG.TILE_SIZE,
            y: (Math.random() * (CONFIG.MAP_SIZE - 4) + 2) * CONFIG.TILE_SIZE
        };
    }

    update(dt, worldObjects, allPlayers) {
        if (this.player.isDead) return;

        this.actionTimer -= dt;

        // Reset input
        this.input.x = 0;
        this.input.y = 0;
        this.player.isAiming = false;

        // 1. Behavior logic based on Role
        let nearestEnemy = this.findNearestEnemy(allPlayers);
        let distToEnemy = nearestEnemy ? Utils.getDistance(this.player.x, this.player.y, nearestEnemy.x, nearestEnemy.y) : Infinity;

        if (this.player.role === 'Panda') {
            // PANDA LOGIC: Chase and Shoot Fox
            if (nearestEnemy && distToEnemy < 400) {
                this.state = 'chase';
                this.targetNode = { x: nearestEnemy.x, y: nearestEnemy.y };
                
                // Shoot if close enough
                if (distToEnemy < 200 && this.actionTimer <= 0) {
                    this.player.isAiming = true;
                    // Will trigger shoot event in game.js via callback logic
                    this.wantsToShoot = true; 
                    this.actionTimer = 1.5; // Cooldown
                } else {
                    this.wantsToShoot = false;
                }
            } else if (distToEnemy >= 400 && this.state === 'chase') {
                this.state = 'wander';
                this.pickNewTarget();
            }
        } else {
            // FOX LOGIC: Run away from Pandas
            if (nearestEnemy && distToEnemy < 350) {
                this.state = 'flee';
                // Move in opposite direction
                let dirX = this.player.x - nearestEnemy.x;
                let dirY = this.player.y - nearestEnemy.y;
                let len = Math.sqrt(dirX*dirX + dirY*dirY);
                this.targetNode = { x: this.player.x + (dirX/len)*100, y: this.player.y + (dirY/len)*100 };
            } else if (this.state === 'flee') {
                this.state = 'wander';
                this.pickNewTarget();
            }
            // Offline Fox bots don't actively hide diamonds yet, they just run to survive.
        }

        // 2. Movement Execution
        if (this.state === 'wander' && this.actionTimer <= 0) {
            let distToTarget = Utils.getDistance(this.player.x, this.player.y, this.targetNode.x, this.targetNode.y);
            if (distToTarget < 50) {
                this.pickNewTarget();
                this.actionTimer = 2.0; // Wait 2 seconds before moving again
            }
        }

        if (this.actionTimer <= 0 || this.state === 'chase' || this.state === 'flee') {
            let dx = this.targetNode.x - this.player.x;
            let dy = this.targetNode.y - this.player.y;
            let len = Math.sqrt(dx*dx + dy*dy);
            
            if (len > 5) {
                this.input.x = dx / len;
                this.input.y = dy / len;
            }
        }

        // Apply input to player object
        this.player.update(dt, this.input, worldObjects);
    }

    findNearestEnemy(players) {
        let nearest = null;
        let minDist = Infinity;
        for(let key in players) {
            let p = players[key];
            if(!p.isDead && p.teamId !== this.player.teamId) {
                let d = Utils.getDistance(this.player.x, this.player.y, p.x, p.y);
                if(d < minDist) {
                    minDist = d;
                    nearest = p;
                }
            }
        }
        return nearest;
    }
            }
