// js/matchmaking.js

const Matchmaking = {
    isOffline: false,
    currentPassword: "000",
    maxPlayers: 2,
    
    init: function() {
        // Main Menu -> Online (1v1 Auto-match)
        document.getElementById('btn-menu-online').onclick = () => {
            this.isOffline = false;
            this.maxPlayers = 2;
            this.startAutoMatch();
        };

        // Main Menu -> Friends
        document.getElementById('btn-menu-friends').onclick = () => {
            this.isOffline = false;
            UI.showScreen('screen-friends-menu');
        };

        // Main Menu -> Offline Training (Panda Only)
        document.getElementById('btn-menu-offline').onclick = () => {
            this.isOffline = true;
            this.maxPlayers = 1;
            TeamManager.initTeams("Fox Bots", document.getElementById('display-username').innerText);
            this.startOfflineMatch();
        };

        // Friends Menu -> Host
        document.getElementById('btn-friend-host').onclick = () => {
            UI.showScreen('screen-host-options');
        };

        // Friends Menu -> Join
        document.getElementById('btn-friend-join').onclick = () => {
            UI.showScreen('screen-join');
        };

        // Host Mode Selectors (1v1, 2v2, 3v3)
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.replace('btn-orange', 'btn-blue'));
                e.target.classList.replace('btn-blue', 'btn-orange');
                
                let mode = e.target.getAttribute('data-mode');
                if (mode === '1v1') this.maxPlayers = 2;
                if (mode === '2v2') this.maxPlayers = 4;
                if (mode === '3v3') this.maxPlayers = 6;
                
                document.getElementById('team-names-box').classList.remove('hidden');
            };
        });

        // Host Create Room
        document.getElementById('btn-confirm-host').onclick = () => {
            let tA = document.getElementById('input-team-a').value.trim() || "Team A";
            let tB = document.getElementById('input-team-b').value.trim() || "Team B";
            TeamManager.initTeams(tA, tB);
            this.createPrivateRoom(false);
        };

        // Join Room Submit
        document.getElementById('btn-submit-join').onclick = () => {
            let rId = document.getElementById('input-room-id').value.trim().toUpperCase();
            let rPass = document.getElementById('input-room-pass').value.trim();
            if(!rId || !rPass) return UI.showAlert("Enter Room ID and Password!", "#e74c3c");

            Network.joinRoom(rId, rPass, (res) => {
                if(res.success) {
                    Game.mode = 'online';
                    TeamManager.initTeams(res.roomData.teamAName, res.roomData.teamBName);
                    
                    let players = res.roomData.players || {};
                    let countA = 0, countB = 0;
                    for(let k in players) {
                        if(players[k].teamId === 'A') countA++; else countB++;
                    }
                    let myTeam = (countA > countB) ? 'B' : 'A';

                    Network.joinPlayer({
                        name: document.getElementById('display-username').innerText,
                        teamId: myTeam,
                        hp: 100
                    });

                    UI.showScreen('screen-lobby');
                    document.getElementById('lobby-title').innerText = "PRIVATE ROOM";
                    document.getElementById('room-info').classList.add('hidden');
                    document.getElementById('btn-start-match').classList.add('hidden');
                    this.setupLobbyListeners();
                } else UI.showAlert(res.msg, "#e74c3c");
            });
        };

        // Back Buttons
        document.getElementById('btn-friends-back').onclick = () => UI.showScreen('screen-menu');
        document.getElementById('btn-host-back').onclick = () => UI.showScreen('screen-friends-menu');
        document.getElementById('btn-join-back').onclick = () => UI.showScreen('screen-friends-menu');
        document.getElementById('btn-leave-lobby').onclick = () => { Network.leaveRoom(); UI.showScreen('screen-menu'); };
        document.getElementById('btn-start-match').onclick = () => {
            if(Network.isHost) Network.updateRoomState({ gameState: 'transition' });
        };
    },

    startAutoMatch: function() {
        UI.showScreen('screen-lobby');
        document.getElementById('lobby-title').innerText = "FINDING MATCH...";
        document.getElementById('lobby-status').innerText = "Searching for opponents...";
        
        TeamManager.initTeams("Team Fox", "Team Panda");
        Game.mode = 'online';

        // Find a public room with < 2 players
        Network.db.ref('rooms').orderByChild('isPublic').equalTo(true).once('value', snap => {
            let foundRoom = null;
            snap.forEach(child => {
                let data = child.val();
                let pCount = data.players ? Object.keys(data.players).length : 0;
                if (data.gameState === 'lobby' && pCount < 2) {
                    foundRoom = { id: child.key, data: data };
                    return true;
                }
            });

            if (foundRoom) {
                // Join public room
                Network.joinRoom(foundRoom.id, "0000", (res) => {
                    Network.joinPlayer({ name: document.getElementById('display-username').innerText, teamId: 'B', hp: 100 });
                    this.setupLobbyListeners();
                });
            } else {
                // Create public room
                this.createPrivateRoom(true);
            }
        });
    },

    startOfflineMatch: function() {
        Game.mode = 'offline';
        Game.players = {};
        Game.bots = [];
        
        // You are Panda
        let p1 = new Player(Network.myId, 200, 200, true);
        p1.teamId = 'B';
        p1.name = document.getElementById('display-username').innerText;
        TeamManager.addPlayer(p1.id, 'B');
        Game.players[p1.id] = p1;
        Game.localPlayerId = p1.id;

        TeamManager.assignRolesForRound();
        Game.startTransition(); // Offline starts immediately
    },

    createPrivateRoom: function(isPublic) {
        Game.mode = 'online';
        this.currentPassword = isPublic ? "0000" : Math.floor(1000 + Math.random() * 9000).toString();
        
        let roomData = {
            password: this.currentPassword,
            gameState: 'lobby',
            mapSeed: Math.floor(Math.random() * 99999),
            teamAName: TeamManager.teams.A.name,
            teamBName: TeamManager.teams.B.name,
            maxPlayers: this.maxPlayers,
            isPublic: isPublic,
            round: 1
        };

        UI.showScreen('screen-lobby');
        document.getElementById('lobby-title').innerText = isPublic ? "PUBLIC MATCH" : "PRIVATE ROOM";
        
        Network.createRoom(roomData, (roomId) => {
            if (!isPublic) {
                document.getElementById('room-info').classList.remove('hidden');
                document.getElementById('display-room-id').innerText = roomId;
                document.getElementById('display-room-pass').innerText = this.currentPassword;
            }
            document.getElementById('btn-start-match').classList.remove('hidden'); 
            
            Network.joinPlayer({ name: document.getElementById('display-username').innerText, teamId: 'A', hp: 100 });
            this.setupLobbyListeners();
        });
    },

    setupLobbyListeners: function() {
        Network.listenToRoom({
            onPlayersUpdate: (playersData) => this.renderLobbyPlayers(playersData),
            onStateChange: (state) => { if (state === 'transition') Game.startTransition(); }
        });
    },

    renderLobbyPlayers: function(playersData) {
        const listA = document.getElementById('list-team-a');
        const listB = document.getElementById('list-team-b');
        listA.innerHTML = `<h3 class="text-orange">${TeamManager.teams.A.name}</h3>`;
        listB.innerHTML = `<h3 class="text-blue">${TeamManager.teams.B.name}</h3>`;

        let count = 0;
        for (let id in playersData) {
            let p = playersData[id];
            TeamManager.addPlayer(id, p.teamId);
            
            let row = document.createElement('div');
            row.className = 'player-row';
            let nameSpan = document.createElement('span');
            nameSpan.innerText = p.name + (id === Network.myId ? " (You)" : "");
            row.appendChild(nameSpan);

            if (Network.isHost && !this.isOffline) {
                let swapBtn = document.createElement('button');
                swapBtn.className = 'swap-btn'; swapBtn.innerText = '🔄 Swap';
                swapBtn.onclick = () => Network.updateAnyPlayerStatus(id, { teamId: (p.teamId === 'A') ? 'B' : 'A' });
                row.appendChild(swapBtn);
            }
            
            if (p.teamId === 'A') listA.appendChild(row); else listB.appendChild(row);
            count++;
        }
        document.getElementById('lobby-status').innerText = `Players: ${count}/${this.maxPlayers} connected.`;
    }
};
