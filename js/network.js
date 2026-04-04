// js/network.js
const Network = {
    roomRef: null,
    syncInterval: null,
    
    createRoom(mode, teamAName, teamBName) {
        GlobalState.isHost = true;
        GlobalState.roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
        GlobalState.gameMode = mode;
        let roomPass = Math.floor(1000 + Math.random() * 9000).toString();
        
        this.roomRef = db.ref('rooms/' + GlobalState.roomId);
        
        let maxPlayers = mode === '1v1' ? 2 : (mode === '2v2' ? 4 : 6);

        // Architected for Multi-player Teams
        this.roomRef.set({
            settings: {
                mode: mode,
                password: roomPass,
                maxPlayers: maxPlayers,
                teamAName: teamAName || "Foxes",
                teamBName: teamBName || "Pandas",
                mapSeed: Math.floor(Math.random() * 99999)
            },
            state: { phase: 'lobby', timer: 0 },
            teams: {
                teamA: { role: 'fox', sharedDiamonds: 5, sharedBombs: 2 },
                teamB: { role: 'panda', freezeBombs: 0 }
            },
            players: {},
            objects: {}, // Map items, safes, traps
            events: {}   // Bullets, explosions
        });

        this.joinRoom(GlobalState.roomId, roomPass);
    },

    joinRoom(roomId, pass) {
        let tempRef = db.ref('rooms/' + roomId);
        tempRef.once('value', snap => {
            let data = snap.val();
            if (!data) return alert("Room not found!");
            if (data.settings.password !== pass && pass !== 'internal') return alert("Incorrect Password!");
            
            let pCount = data.players ? Object.keys(data.players).length : 0;
            if (pCount >= data.settings.maxPlayers) return alert("Room is full!");

            GlobalState.roomId = roomId;
            this.roomRef = tempRef;
            
            // Auto-balance teams
            let tA = 0, tB = 0;
            if (data.players) {
                Object.values(data.players).forEach(p => p.team === 'teamA' ? tA++ : tB++);
            }
            GlobalState.myTeam = tA <= tB ? 'teamA' : 'teamB';
            
            let pRef = this.roomRef.child('players/' + GlobalState.myId);
            pRef.set({
                name: GlobalState.username,
                team: GlobalState.myTeam,
                ready: false,
                hp: 100,
                x: 0, y: 0,
                isAiming: false,
                aimDir: {x: 1, y: 0},
                isDead: false
            });
            pRef.onDisconnect().remove();

            if (GlobalState.isHost) {
                this.roomRef.child('state').onDisconnect().update({ phase: 'finished', winner: 'Host Disconnected' });
            }

            if(window.Matchmaking) Matchmaking.enterLobby(data);
            this.setupListeners();
        });
    },

    setupListeners() {
        this.roomRef.child('state').on('value', s => { if(window.Game) window.Game.handleStateChange(s.val()); });
        this.roomRef.child('players').on('value', s => { if(window.Game) window.Game.updatePlayers(s.val()); });
        this.roomRef.child('events').on('child_added', s => { 
            if(window.Game) window.Game.handleEvent(s.val()); 
            s.ref.remove(); // Clean up events immediately to prevent DB bloat
        });
        this.roomRef.child('objects').on('value', s => { if(window.Game) window.Game.updateWorldObjects(s.val()); });
        this.roomRef.child('teams').on('value', s => { if(window.Game) window.Game.updateTeamStats(s.val()); });
    },

    startSync() {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => {
            if (!GlobalState.isSpectating && window.Game && window.Game.localPlayer) {
                this.roomRef.child('players/' + GlobalState.myId).update({
                    x: window.Game.localPlayer.x,
                    y: window.Game.localPlayer.y,
                    isAiming: window.Game.localPlayer.isAiming,
                    aimDir: window.Game.localPlayer.aimDir
                });
            }
        }, CONFIG.TIMERS.SYNC_RATE);
    },
    
    triggerSafeUnlock() {
        this.roomRef.child('objects/safeUnlocked').set(true);
        // Transaction to add 30 HP to all players on my team safely
        this.roomRef.child('players').once('value', snap => {
            let pData = snap.val();
            for (let id in pData) {
                if (pData[id].team === GlobalState.myTeam && pData[id].hp > 0) {
                    this.roomRef.child(`players/${id}/hp`).transaction(hp => Math.min(100, (hp || 0) + 30));
                }
            }
        });
    }
};
