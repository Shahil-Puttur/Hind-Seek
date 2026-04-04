// js/network.js
const Network = {
    roomRef: null,
    syncInterval: null,
    hostTimerInterval: null,
    serverEndTime: 0,

    quickMatch() {
        UI.showAlert("Searching for match...", "#f1c40f");
        db.ref('rooms').once('value', snap => {
            let rooms = snap.val();
            let joined = false;
            if (rooms) {
                for (let id in rooms) {
                    let r = rooms[id];
                    let pCount = r.players ? Object.keys(r.players).length : 0;
                    if (r.settings.isPublic && r.state.phase === 'lobby' && pCount < r.settings.maxPlayers) {
                        this.joinRoom(id, 'internal');
                        joined = true;
                        break;
                    }
                }
            }
            if (!joined) this.createRoom('1v1', 'Foxes', 'Pandas', true);
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
                mode: mode, password: roomPass, maxPlayers: maxPlayers,
                teamAName: teamAName || "Foxes", teamBName: teamBName || "Pandas",
                isPublic: isPublic, mapSeed: Math.floor(Math.random() * 99999)
            },
            state: { phase: 'lobby', timer: 0 },
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
            
            let tA = 0, tB = 0;
            if (data.players) Object.values(data.players).forEach(p => p.team === 'teamA' ? tA++ : tB++);
            GlobalState.myTeam = tA <= tB ? 'teamA' : 'teamB';
            
            let pRef = this.roomRef.child('players/' + GlobalState.myId);
            pRef.set({
                name: GlobalState.username, team: GlobalState.myTeam,
                hp: 100, x: 0, y: 0, isAiming: false, aimDir: {x: 1, y: 0}, diamondsFound: 0
            });
            pRef.onDisconnect().remove();

            if (GlobalState.isHost) {
                this.roomRef.child('state').onDisconnect().update({ phase: 'finished', winner: 'Host Disconnected' });
                this.startHostTimerManager();
            }

            if(window.Matchmaking) Matchmaking.enterLobby(data);
            this.setupListeners();
        });
    },

    setupListeners() {
        this.roomRef.child('state').on('value', s => { 
            let state = s.val();
            if(state && state.timer) this.serverEndTime = state.timer;
            if(window.Game) window.Game.handleStateChange(state); 
        });
        this.roomRef.child('players').on('value', s => { if(window.Game) window.Game.updatePlayers(s.val()); });
        this.roomRef.child('events').on('child_added', s => { if(window.Game) window.Game.handleEvent(s.val()); s.ref.remove(); });
        this.roomRef.child('objects').on('value', s => { if(window.Game) window.Game.updateWorldObjects(s.val()); });
    },

    startSync() {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => {
            // Update HUD timer locally for smooth countdown
            let timeLeft = (this.serverEndTime - getSyncTime()) / 1000;
            if (Game.phase === 'hiding' || Game.phase === 'playing') {
                UI.updateHUD(timeLeft, Game.phase, Game.localPlayer.inventory);
            } else if (Game.phase === 'transition') {
                document.getElementById('transition-countdown').innerText = Math.max(1, Math.ceil(timeLeft));
            }

            // Sync Local Player Position
            if (!GlobalState.isSpectating && window.Game && window.Game.localPlayer) {
                this.roomRef.child('players/' + GlobalState.myId).update({
                    x: window.Game.localPlayer.x, y: window.Game.localPlayer.y,
                    isAiming: window.Game.localPlayer.isAiming, aimDir: window.Game.localPlayer.aimDir
                });
            }
        }, CONFIG.TIMERS.SYNC_RATE);
    },

    // THE HOST CONTROLS THE GAME FLOW AUTOMATICALLY
    startHostTimerManager() {
        if (this.hostTimerInterval) clearInterval(this.hostTimerInterval);
        this.hostTimerInterval = setInterval(() => {
            if (!window.Game) return;
            
            let timeLeft = this.serverEndTime - getSyncTime();
            
            if (timeLeft <= 0) {
                if (Game.phase === 'transition') {
                    // Start Hiding Phase (60 Seconds)
                    this.roomRef.child('state').update({ phase: 'hiding', timer: getSyncTime() + (CONFIG.TIMERS.HIDING * 1000) });
                } 
                else if (Game.phase === 'hiding') {
                    // Start Playing Phase (3 Minutes)
                    this.roomRef.child('state').update({ phase: 'playing', timer: getSyncTime() + (CONFIG.TIMERS.PLAYING * 1000) });
                } 
                else if (Game.phase === 'playing') {
                    // Time Up! Foxes Win by default if Pandas don't find diamonds in time
                    this.roomRef.child('state').update({ phase: 'finished', winner: 'Time Up! Foxes Win!' });
                }
            }
        }, 500);
    },
    
    triggerSafeUnlock() {
        this.roomRef.child('objects/safeUnlocked').set(true);
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
