// js/ui.js
const UI = {
    enteredPwd: "",
    alertTimeout: null,
    
    init() {
        this.checkOrientation();
        // Check orientation on resize or rotation
        window.addEventListener('resize', () => this.checkOrientation());
    },

    showScreen(screenId) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(s => {
            if(s.id === screenId) {
                s.classList.remove('hidden'); s.classList.add('active');
            } else {
                s.classList.remove('active'); s.classList.add('hidden');
            }
        });
        
        // Re-check orientation whenever we change screens
        this.checkOrientation();
    },

    checkOrientation() {
        const warning = document.getElementById('orientation-warning');
        
        // Think like a Gamer: Only force Landscape when the actual match starts!
        const activePhases = ['transition', 'hiding', 'playing'];
        const isGameActive = window.Game && activePhases.includes(window.Game.phase);

        // If the match is running AND the phone is in Portrait -> Show Warning
        if (isGameActive && window.innerHeight > window.innerWidth) {
            warning.style.display = 'flex';
        } else {
            // Otherwise (Menus, Lobby, or already in Landscape) -> Hide Warning
            warning.style.display = 'none';
        }
    },

    showAlert(text, color) {
        const alertBox = document.getElementById('alert-text');
        alertBox.innerText = text; 
        alertBox.style.color = color;
        alertBox.classList.remove('hidden', 'show-alert');
        void alertBox.offsetWidth; // Force DOM reflow
        alertBox.classList.add('active', 'show-alert');
        
        if (this.alertTimeout) clearTimeout(this.alertTimeout);
        this.alertTimeout = setTimeout(() => {
            alertBox.classList.remove('show-alert', 'active');
            alertBox.classList.add('hidden');
        }, 1500);
    },

    updateHUD(timeLeft, phase, inventory) {
        // Timer
        let m = Math.floor(Math.max(0, timeLeft) / 60); 
        let s = Math.floor(Math.max(0, timeLeft) % 60);
        document.getElementById('hud-timer').innerText = `${m}:${s < 10 ? '0':''}${s}`;
        document.getElementById('hud-phase').innerText = phase.toUpperCase();
        
        const foxStats = document.getElementById('hud-fox-stats');
        const pandaStats = document.getElementById('hud-panda-stats');
        const freezeBtn = document.getElementById('btn-throw-freeze');

        if (Game.myRole === 'fox') {
            foxStats.classList.remove('hidden');
            pandaStats.classList.add('hidden');
            freezeBtn.classList.add('hidden');

            if (phase === 'hiding') {
                let currentItem = inventory.diamondsToHide > 0 ? '💎 DIAMOND' : (inventory.bombsToHide > 0 ? '💣 BOMB' : '✅ DONE');
                foxStats.innerText = `PLACING: ${currentItem} | Left: ${inventory.diamondsToHide}D, ${inventory.bombsToHide}B`;
                foxStats.style.borderColor = inventory.diamondsToHide > 0 ? '#3498db' : '#e74c3c';
            } else {
                foxStats.innerText = `🦊 HUNT THEM DOWN!`;
                foxStats.style.borderColor = '#e74c3c';
            }
        } 
        else if (Game.myRole === 'panda') {
            foxStats.classList.add('hidden');
            pandaStats.classList.remove('hidden');
            
            pandaStats.innerText = `🐼 HP: ${Math.max(0, Game.localPlayer.hp)} | 💎 Found: ${inventory.diamondsFound}/5`;
            
            // Show Freeze Bomb button if Panda has them
            if (inventory.freezeBombs > 0 && phase === 'playing' && !GlobalState.isSpectating) {
                freezeBtn.classList.remove('hidden');
                freezeBtn.innerText = `🧨 x${inventory.freezeBombs}`;
            } else {
                freezeBtn.classList.add('hidden');
            }
        }
        
        // Trigger a check just in case Phase changed
        this.checkOrientation();
    },

    closeOverlays() {
        document.getElementById('screen-paper').classList.remove('active');
        document.getElementById('screen-paper').classList.add('hidden');
        document.getElementById('screen-keypad').classList.remove('active');
        document.getElementById('screen-keypad').classList.add('hidden');
    },

    showKeypad() {
        this.enteredPwd = "";
        this.updatePwdDisplay();
        document.getElementById('screen-keypad').classList.remove('hidden');
        document.getElementById('screen-keypad').classList.add('active');
    },

    pressKey(k) {
        if (k === 'C') { this.enteredPwd = ""; } 
        else if (this.enteredPwd.length < 4) {
            this.enteredPwd += k.toString();
            if (this.enteredPwd.length === 4) { setTimeout(() => this.submitPassword(), 150); }
        }
        this.updatePwdDisplay();
    },

    updatePwdDisplay() {
        document.getElementById('pwd-display').innerText = this.enteredPwd.padEnd(4, "_").split("").join(" ");
    },

    submitPassword() {
        if (this.enteredPwd === Game.safePassword) {
            this.closeOverlays();
            this.showAlert("💉 TEAM HEAL +30%!", "#2ecc71");
            Network.triggerSafeUnlock();
        } else {
            let disp = document.getElementById('pwd-display');
            disp.innerText = "WRONG!"; disp.style.color = "#e74c3c";
            this.showAlert("INCORRECT CODE!", "#e74c3c");
            setTimeout(() => {
                this.enteredPwd = ""; disp.style.color = "#2c3e50"; this.updatePwdDisplay();
                this.closeOverlays();
            }, 800);
        }
    }
};
