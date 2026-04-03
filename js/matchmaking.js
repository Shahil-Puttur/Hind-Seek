// js/matchmaking.js

const Matchmaking = {
    isOffline: false,
    currentPassword: "000",
    
    init: function() {
        // --- MENU NAVIGATION ---
        
        // Host Match
        document.getElementById('btn-menu-host').onclick = () => {
            this.isOffline = false;
            UI.showScreen('screen-team-setup');
        };

        // Join Friend
        document.getElementById('btn-menu-join').onclick = () => {
            UI.showScreen('screen-join');
        };

        // Practice Offline
        document.getElementById('btn-menu-offline').onclick = () => {
            this.isOffline = true;
            UI.showScreen('screen-team-setup');
        };

        // --- HOST LOGIC ---
        document.getElementById('btn-confirm-teams').onclick = () => {
            let tA = document.getElementById('input-team-a').value.trim() || "Team A";
            let tB = document.getElementById('input-team-b').value.trim() || "Team B";
            TeamManager.initTeams(tA, tB);
            
            if (this.isOffline) {
                this.startOfflineMatch();
            } else {
                this.createPrivateRoom();
            }
        };

        // --- JOIN LOGIC (For Player 2) ---
        document.getElementById('btn-submit-join').onclick = () => {
            let rId = document.getElementById('input-room-id').value.trim().toUpperCase();
            let rPass = document.getElementById('input-room-pass').value.trim();
            
            if(!rId || !rPass) {
                UI.showAlert("Enter Room ID and Password!", "#e74c3c");
                return;
            }

            Network.joinRoom(rId, rPass, (res) => {
                if(res.success) {
                    Game.mode = 'online';
                    TeamManager.initTeams(res.roomData.teamAName, res.roomData.teamBName);
                    
                    // Auto-balance logic
                    let players = res.roomData.players || {};
                    let countA = 0, countB = 0;
                    for(let k in players) {
                        if(players[k].teamId === 'A') countA++;
                        else countB++;
                    }
                    
                    // Put player in whichever team has less people
                    let myTeam = (countA > countB) ? 'B' : 'A';

                    Network.joinPlayer({
                        name: document.getElementById('display-username').innerText,
                        teamId: myTeam,
                        isReady: true
                    });

                    UI.showScreen('screen-lobby');
                    document.getElementById('lobby-title').innerText = "PRIVATE ROOM";
                    document.getElementById('room-info').classList.add('hidden'); // Guests don't need to see password
                    document.getElementById('btn-start-match').classList.add('hidden'); // Only host can start
                    
                    this.setupLobbyListeners();
                } else {
                    UI.showAlert(res.msg, "#e74c3c");
                }
            });
        };

        // Back Buttons
        document.getElementById('btn-team-back').onclick = () => UI.showScreen('screen-menu');
        document.getElementById('btn-join-back').onclick = () => UI.showScreen('screen-menu');
        
        // Lobby Actions
        document.getElementById('btn-leave-lobby').onclick = () => {
            Network.leaveRoom();
            UI.showScreen('screen-menu');
        };

        document.getElementById('btn-start-match').onclick = () => {
            if(Network.isHost) Network.updateRoomState({ gameState: 'transition' });
        };
    },

    startOfflineMatch: function() {
        Game.mode = 'offline';
        Game.players = {};
        Game.bots = [];
        
        let p1 = new Player(Network.myId, 200, 200, true);
        p1.teamId = 'A';
        p1.name = document.getElementById('display-username').innerText;
        TeamManager.addPlayer(p1.id, 'A');
        Game.players[p1.id] = p1;
        Game.localPlayerId = p1.id;

        for(let i=0; i<3; i++) {
            let botId = 'BOT_B_' + i;
            let b = new Player(botId, 500, 500, false);
            b.teamId = 'B';
            b.name = "Bot " + (i+1);
            TeamManager.addPlayer(b.id, 'B');
            Game.players[b.id] = b;
            Game.bots.push(new BotController(b));
        }

        TeamManager.assignRolesForRound();
        Game.startTransition();
    },

    createPrivateRoom: function() {
        Game.mode = 'online';
        this.currentPassword = Math.floor(1000 + Math.random() * 9000).toString();
        let mapSeed = Math.floor(Math.random() * 99999);
        
        let roomData = {
            password: this.currentPassword,
            gameState: 'lobby',
            mapSeed: mapSeed,
            teamAName: TeamManager.teams.A.name,
            teamBName: TeamManager.teams.B.name,
            round: 1
        };

        UI.showScreen('screen-lobby');
        document.getElementById('lobby-title').innerText = "PRIVATE ROOM";
        document.getElementById('lobby-status').innerText = "Creating room...";

        Network.createRoom(roomData, (roomId) => {
            document.getElementById('room-info').classList.remove('hidden');
            document.getElementById('display-room-id').innerText = roomId;
            document.getElementById('display-room-pass').innerText = this.currentPassword;
            document.getElementById('btn-start-match').classList.remove('hidden'); 
            
            Network.joinPlayer({
                name: document.getElementById('display-username').innerText,
                teamId: 'A',
                isReady: true
            });
            
            this.setupLobbyListeners();
        });
    },

    setupLobbyListeners: function() {
        document.getElementById('lobby-status').innerText = "Waiting for players...";
        
        Network.listenToRoom({
            onPlayersUpdate: (playersData) => {
                this.renderLobbyPlayers(playersData);
            },
            onStateChange: (state) => {
                if (state === 'transition') {
                    Game.startTransition();
                }
            }
        });
    },

    renderLobbyPlayers: function(playersData) {
        const listA = document.getElementById('list-team-a');
        const listB = document.getElementById('list-team-b');
        
        listA.innerHTML = `<h3 class="text-orange">${TeamManager.teams.A.name}</h3>`;
        listB.innerHTML = `<h3 class="text-blue">${TeamManager.teams.B.name}</h3>`;

        let countA = 0;
        let countB = 0;

        for (let id in playersData) {
            let p = playersData[id];
            TeamManager.addPlayer(id, p.teamId);
            
            let row = document.createElement('div');
            row.className = 'player-row';
            
            let nameSpan = document.createElement('span');
            nameSpan.innerText = p.name + (id === Network.myId ? " (You)" : "");
            row.appendChild(nameSpan);

            // HOST ONLY: Render the Swap Button
            if (Network.isHost) {
                let swapBtn = document.createElement('button');
                swapBtn.className = 'swap-btn';
                swapBtn.innerText = '🔄 Swap';
                
                // When Host clicks this, it moves this specific player to the other team
                swapBtn.onclick = () => {
                    let newTeam = (p.teamId === 'A') ? 'B' : 'A';
                    Network.updateAnyPlayerStatus(id, { teamId: newTeam });
                };
                row.appendChild(swapBtn);
            }
            
            if (p.teamId === 'A') { listA.appendChild(row); countA++; }
            else { listB.appendChild(row); countB++; }
        }

        document.getElementById('lobby-status').innerText = `Players: ${countA + countB} connected.`;
    }
};
