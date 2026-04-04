// js/network.js
const Network = {
    roomRef: null,
    syncInterval: null,

    // NEW: "Play Online" Logic
    quickMatch() {
        UI.showAlert("Searching for match...", "#f1c40f");
        
        // Query database for open public rooms
        db.ref('rooms').once('value', snap => {
            let rooms = snap.val();
            let joined = false;
            
            if (rooms) {
                for (let id in rooms) {
                    let r = rooms[id];
                    let pCount = r.players ? Object.keys(r.players).length : 0;
                    
                    // Look for a Public Room, currently in Lobby phase, with open slots
                    if (r.settings.isPublic && r.state.phase === 'lobby' && pCount < r.settings.maxPlayers) {
                        this.joinRoom(id, 'internal'); // Bypass password
                        joined = true;
                        break;
                    }
                }
            }
            
            // If no open rooms found, create a new public 1v1 room
            if (!joined) {
                this.createRoom('1v1', 'Foxes', 'Pandas', true);
            }
        });
    },
    
    createRoom(mode, teamAName, teamBName, isPublic = false) {
        GlobalState.isHost = true;
        GlobalState.roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
        GlobalState.gameMode = mode;
        let roomPass = isPublic ? 'internal' : Math.floor(1000 + Math.random() * 9000).toString();
        
        this.roomRef = db.ref('rooms/' + GlobalState.roomId);
        let maxPlayers = mode === '1v1' ? 2 : (mode === '2v2' ? 4 : 6);

        this.roomRef.set({
            settings: {
                mode: mode,
                password: roomPass,
                maxPlayers: maxPlayers,
                teamAName: teamAName || "Foxes",
                teamBName: teamBName || "Pandas",
                isPublic: isPublic, // Marks room for QuickMatch
                mapSeed: Math.floor(Math.random() * 99999)
            },
            state: { phase: 'lobby', timer: 0 },
            teams: { teamA: { sharedDiamonds: 5, bombs: 2 }, teamB: { freezeBombs: 0 } },
            players: {}, objects: {}, events: {}
        });

        this.joinRoom(GlobalState.roomId, roomPass);
    },

    joinRoom(roomId, pass) {
        let tempRef = db.ref('rooms/' + roomId);
        tempRef.once('value', snap => {
            let data = snap.val();
            if (!data) return UI.showAlert("Room not found!", "#e74c3c");
            if (!data.settings.isPublic && data.settings.password !== pass && pass !== 'internal') return UI.showAlert("Incorrect Password!", "#e74c3c");
            
            let pCount = data.players ? Object.keys(data.players).length : 0;
            if (pCount >= data.settings.maxPlayers) return UI.showAlert("Room is full!", "#e74c3c");

            GlobalState.roomId = roomId;
            this.roomRef = tempRef;
            
            // Auto-balance teams
            let tA = 0, tB = 0;
            if (data.players) { Object.values(data.players).forEach(p => p.team === 'teamA' ? tA++ : tB++); }
            GlobalState.myTeam = tA <= tB ? 'teamA' : 'teamB';
            
            let pRef = this.roomRef.child('players/' + GlobalState.myId);
            pRef.set({
                name: GlobalState.username,
                team: GlobalState.myTeam,
                hp: 100, x: 0, y: 0, isAiming: false, aimDir: {x: 1, y: 0}, isDead: false
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
        this.roomRef.child('events').on('child_added', s => { if(window.Game) window.Game.handleEvent(s.val()); s.ref.remove(); });
        this.roomRef.child('objects').on('value', s => { if(window.Game) window.Game.updateWorldObjects(s.val()); });
    },

    startSync() {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => {
            if (!GlobalState.isSpectating && window.Game && window.Game.localPlayer) {
                this.roomRef.child('players/' + GlobalState.myId).update({
                    x: window.Game.localPlayer.x, y: window.Game.localPlayer.y,
                    isAiming: window.Game.localPlayer.isAiming, aimDir: window.Game.localPlayer.aimDir
                });
            }
        }, CONFIG.TIMERS.SYNC_RATE);
    }
};
