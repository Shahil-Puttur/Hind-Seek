// js/ui.js

const UI = {
    screens: [
        'screen-loading', 'screen-start', 'screen-menu', 'screen-shop', 'screen-friends-menu', 
        'screen-host-options', 'screen-join', 'screen-lobby', 'screen-transition', 
        'screen-blocker', 'screen-game-hud', 'screen-result', 'screen-paper', 'screen-keypad'
    ],
    enteredPwd: "",

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

    updateHUDTeams: function(foxHP, pandaHP) {
        document.getElementById('hud-fox-stats').innerText = `Fox HP: ${Math.max(0, foxHP)}`;
        document.getElementById('hud-panda-stats').innerText = `Panda HP: ${Math.max(0, pandaHP)}`;
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
    },

    // --- PUZZLE OVERLAYS ---
    showPaper: function(password) {
        document.getElementById('paper-pwd-text').innerText = password;
        document.getElementById('screen-paper').classList.remove('hidden');
        document.getElementById('screen-paper').classList.add('active');
    },

    showKeypad: function() {
        this.enteredPwd = "";
        this.updatePwdDisplay();
        document.getElementById('screen-keypad').classList.remove('hidden');
        document.getElementById('screen-keypad').classList.add('active');
    },

    closeOverlays: function() {
        document.getElementById('screen-paper').classList.add('hidden');
        document.getElementById('screen-paper').classList.remove('active');
        document.getElementById('screen-keypad').classList.add('hidden');
        document.getElementById('screen-keypad').classList.remove('active');
    },

    pressKey: function(k) {
        if (k === 'C') {
            this.enteredPwd = "";
        } else if (this.enteredPwd.length < 4) {
            this.enteredPwd += k.toString();
        }
        this.updatePwdDisplay();
        
        if (this.enteredPwd.length === 4) {
            setTimeout(() => this.submitPassword(), 150);
        }
    },

    updatePwdDisplay: function() {
        document.getElementById('pwd-display').innerText = this.enteredPwd.padEnd(4, "_").split("").join(" ");
    },

    submitPassword: function() {
        if(this.enteredPwd.length === 0) return;
        
        if(this.enteredPwd === Game.safePassword) {
            this.closeOverlays();
            this.showAlert("💉 SAFE UNLOCKED! HEALTH +30", "#2ecc71");
            Game.unlockSafe();
        } else {
            let pwdDisp = document.getElementById('pwd-display');
            pwdDisp.innerText = "WRONG!"; 
            pwdDisp.style.color = "#e74c3c";
            this.showAlert("INCORRECT CODE!", "#e74c3c");
            
            setTimeout(() => {
                this.enteredPwd = ""; 
                pwdDisp.style.color = "#2c3e50"; 
                this.updatePwdDisplay();
                this.closeOverlays();
            }, 800);
        }
    }
};
