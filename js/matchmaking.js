// js/matchmaking.js
const Matchmaking = {
    enterLobby(data) {
        UI.showScreen('screen-lobby');
        document.getElementById('display-room-id').innerText = GlobalState.roomId;
        document.getElementById('display-room-pass').innerText = data.settings.password === 'internal' ? 'None' : data.settings.password;
        
        document.getElementById('lobby-name-team-a').innerText = data.settings.teamAName;
        document.getElementById('lobby-name-team-b').innerText = data.settings.teamBName;
        
        if (GlobalState.isHost) {
            document.getElementById('btn-start-match').classList.remove('hidden');
        }
    },

    updateLobbyUI(players) {
        if (GlobalState.gameMode === 'offline') return;
        
        const listA = document.getElementById('list-team-a');
        const listB = document.getElementById('list-team-b');
        
        // Keep titles, clear old players
        listA.innerHTML = `<h3 class="text-orange" id="lobby-name-team-a">Team 1 (Foxes)</h3>`;
        listB.innerHTML = `<h3 class="text-blue" id="lobby-name-team-b">Team 2 (Pandas)</h3>`;
        
        let pCount = 0;
        
        for (let id in players) {
            pCount++;
            let p = players[id];
            let isMe = (id === GlobalState.myId);
            
            let row = document.createElement('div');
            row.className = 'player-row';
            row.innerHTML = `<span>${p.name} ${isMe ? '(You)' : ''}</span>`;
            
            if (isMe) {
                let swapBtn = document.createElement('button');
                swapBtn.className = 'swap-btn';
                swapBtn.innerText = 'Swap';
                swapBtn.onclick = () => this.swapTeam(p.team);
                row.appendChild(swapBtn);
            }
            
            if (p.team === 'teamA') listA.appendChild(row);
            else listB.appendChild(row);
        }

        document.getElementById('lobby-status').innerText = `Players: ${pCount} / ${Game.maxPlayers || '?'}`;
        
        // Auto-start offline logic check
        if(GlobalState.isHost && pCount > 0) {
            document.getElementById('btn-start-match').onclick = () => {
                Network.roomRef.child('state').update({
                    phase: 'transition',
                    timer: getSyncTime() + (CONFIG.TIMERS.PRE_GAME * 1000)
                });
            };
        }
    },

    swapTeam(currentTeam) {
        let newTeam = currentTeam === 'teamA' ? 'teamB' : 'teamA';
        GlobalState.myTeam = newTeam;
        Network.roomRef.child(`players/${GlobalState.myId}/team`).set(newTeam);
    }
};
