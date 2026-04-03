// js/ui.js

const UI = {
    screens: [
        'screen-start', 'screen-menu', 'screen-shop', 'screen-team-setup',
        'screen-join', 'screen-lobby', 'screen-transition', 'screen-game-hud', 'screen-result'
    ],

    showScreen: function(screenId) {
        this.screens.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === screenId) {
                    el.classList.remove('hidden');
                    el.classList.add('active');
                } else {
                    el.classList.add('hidden');
                    el.classList.remove('active');
                }
            }
        });
        
        // Let the window orientation check re-calculate if the warning is needed
        if(window.checkOrientation) window.checkOrientation();
    },

    showAlert: function(text, color) {
        const alertBox = document.getElementById('alert-text');
        alertBox.innerText = text;
        alertBox.style.color = color;
        alertBox.classList.remove('hidden');
        
        alertBox.classList.remove('show-alert');
        void alertBox.offsetWidth; 
        alertBox.classList.add('show-alert');
        
        if (this.alertTimeout) clearTimeout(this.alertTimeout);
        this.alertTimeout = setTimeout(() => {
            alertBox.classList.remove('show-alert');
            setTimeout(() => alertBox.classList.add('hidden'), 300);
        }, 1500);
    },

    updateHUDTimer: function(msLeft) {
        if (msLeft < 0) msLeft = 0;
        let leftSecs = Math.floor(msLeft / 1000);
        let m = Math.floor(leftSecs / 60);
        let s = leftSecs % 60;
        document.getElementById('hud-timer').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
    },

    updateHUDTeams: function(teamAAlive, teamATotal, teamBAlive, teamBTotal) {
        document.getElementById('hud-team-a-status').innerText = `Team A: ${teamAAlive}/${teamATotal} Alive`;
        document.getElementById('hud-team-b-status').innerText = `Team B: ${teamBAlive}/${teamBTotal} Alive`;
    },

    setSpectatorMode: function(isSpectator) {
        const specEl = document.getElementById('hud-spectator');
        const shootBtn = document.getElementById('btn-shoot');
        const toggleBtn = document.getElementById('btn-toggle-item');
        
        if (isSpectator) {
            specEl.classList.remove('hidden');
            shootBtn.classList.add('hidden');
            toggleBtn.classList.add('hidden');
        } else {
            specEl.classList.add('hidden');
            shootBtn.classList.remove('hidden');
        }
    },

    showError: function(msg) {
        const err = document.getElementById('auth-error');
        err.innerText = msg;
        err.classList.remove('hidden');
    }
};
