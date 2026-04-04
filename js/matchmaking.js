// js/matchmaking.js
const Matchmaking = {
    enterLobby(data) {
        UI.showScreen('screen-lobby');
        
        // Hide password if it's a public QuickMatch room
        let passDisplay = data.settings.isPublic ? 'PUBLIC (No Pass)' : data.settings.password;
        document.getElementById('display-room-id').innerText = GlobalState.roomId;
        document.getElementById('display-room-pass').innerText = passDisplay;
        
        document.getElementById('lobby-name-team-a').innerText = data.settings.teamAName;
        document.getElementById('lobby-name-team-b').innerText = data.settings.teamBName;
        
        document.getElementById('room-info').classList.remove('hidden');
        
        // Only Host sees the Start Button
        if (GlobalState.isHost) {
            document.getElementById('btn-start-match').classList.remove('hidden');
        } else {
            document.getElementById('btn-start-match').classList.add('hidden');
        }
    },

    updateLobbyUI(players) {
        if (GlobalState.gameMode === 'offline') return;
        
        const listA = document.getElementById('list-team-a');
        const listB = document.getElementById('list-team-b');
        
        // Preserve titles
        let titleA = listA.querySelector('h3').outerHTML;
        let titleB = listB.querySelector('h3').outerHTML;
        listA.innerHTML = titleA;
        listB.innerHTML = titleB;
        
        let pCount = 0;
        
        for (let id in players) {
            pCount++;
            let p = players[id];
            let isMe = (id === GlobalState.myId);
            
            let row = document.createElement('div');
            row.className = 'player-row';
            row.innerHTML = `<span>${p.name} ${isMe ? '(You)' : ''} ${GlobalState.isHost && id === Object.keys(players)[0] ? '👑' : ''}</span>`;
            
            // HOST PRIVILEGE: Host can swap anyone. Regular players can only swap themselves.
            let canSwap = GlobalState.isHost || isMe;
            
            if (canSwap) {
                let swapBtn = document.createElement('button');
                swapBtn.className = 'swap-btn';
                swapBtn.innerText = 'Swap';
                swapBtn.onclick = () => this.swapTeam(id, p.team); // Target specific ID
                row.appendChild(swapBtn);
            }
            
            if (p.team === 'teamA') listA.appendChild(row);
            else listB.appendChild(row);
        }

        let maxP = Game.maxPlayers || 2;
        document.getElementById('lobby-status').innerText = `Players: ${pCount} / ${maxP}`;
        
        // Start match binding
        if(GlobalState.isHost && pCount > 0) {
            document.getElementById('btn-start-match').onclick = () => {
                if (pCount < maxP && !confirm("Start game without full lobby?")) return;
                Network.roomRef.child('state').update({
                    phase: 'transition',
                    timer: getSyncTime() + (CONFIG.TIMERS.PRE_GAME * 1000)
                });
            };
        }
    },

    swapTeam(playerId, currentTeam) {
        let newTeam = currentTeam === 'teamA' ? 'teamB' : 'teamA';
        
        // If swapping myself, update my local state
        if (playerId === GlobalState.myId) {
            GlobalState.myTeam = newTeam;
        }
        
        // Push team change to Firebase
        Network.roomRef.child(`players/${playerId}/team`).set(newTeam);
    }
};
