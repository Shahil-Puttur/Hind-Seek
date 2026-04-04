// js/bot.js
const Bot = {
    active: false,
    bots: [],
    
    initOfflineMatch() {
        GlobalState.gameMode = 'offline';
        GlobalState.myTeam = 'teamA'; // Player is Fox
        
        // Mock the state changes
        Game.handleStateChange({ phase: 'transition' });
        setTimeout(() => Game.handleStateChange({ phase: 'hiding' }), 3000);
        setTimeout(() => {
            Game.handleStateChange({ phase: 'playing' });
            this.spawnBots();
        }, 10000); // 10 second hiding for offline
    },

    spawnBots() {
        this.active = true;
        // Spawn 3 Pandas
        for(let i=0; i<3; i++) {
            let botId = 'bot_' + i;
            let p = new Player(botId, `Bot ${i+1}`, 'teamB', false);
            p.x = 1000 + (i*100); p.y = 1000; p.targetX = p.x; p.targetY = p.y;
            Game.players[botId] = p;
            this.bots.push(p);
        }
    },

    update(dt) {
        if(Game.phase !== 'playing') return;
        
        let player = Game.localPlayer;
        if (!player || player.isDead) return;

        this.bots.forEach(bot => {
            if (bot.isDead) return;
            
            // Simple Seek AI
            let dist = Utils.distance(bot.x, bot.y, player.x, player.y);
            if (dist > 150) {
                let dx = player.x - bot.x; let dy = player.y - bot.y;
                let len = Math.sqrt(dx*dx + dy*dy);
                bot.targetX = bot.x + (dx/len) * 200;
                bot.targetY = bot.y + (dy/len) * 200;
            } else {
                // Shoot!
                if(Math.random() < 0.02) {
                    Game.explosions.push({ x: player.x, y: player.y, r: 5, maxR: 40, life: 1.0 });
                    player.hp -= 10;
                    UI.showAlert("YOU WERE HIT!", "#e74c3c");
                    if(player.hp <= 0) Game.handleStateChange({ phase: 'finished', winner: 'Pandas (Bots)' });
                }
            }
        });
    },

    handleShootEvent(hitX, hitY) {
        Game.explosions.push({ x: hitX, y: hitY, r: 5, maxR: 40, life: 1.0 });
        this.bots.forEach(bot => {
            if(!bot.isDead && Utils.distance(hitX, hitY, bot.x, bot.y) < 60) {
                bot.hp -= 34; // 3 hits to kill
                bot.isDead = bot.hp <= 0;
                UI.showAlert("BOT HIT!", "#f1c40f");
            }
        });
        
        let aliveBots = this.bots.filter(b => !b.isDead).length;
        if(aliveBots === 0) Game.handleStateChange({ phase: 'finished', winner: 'Foxes (Player)' });
    }
};
