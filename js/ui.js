// js/ui.js
const UI = {
    enteredPwd: "",
    alertTimeout: null,
    
    init() {
        this.checkOrientation();
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
    },

    checkOrientation() {
        const warning = document.getElementById('orientation-warning');
        if (window.innerHeight > window.innerWidth) warning.style.display = 'flex';
        else warning.style.display = 'none';
    },

    showAlert(text, color) {
        const alertBox = document.getElementById('alert-text');
        alertBox.innerText = text; 
        alertBox.style.color = color;
        alertBox.classList.remove('hidden', 'show-alert');
        void alertBox.offsetWidth; // Force DOM Reflow
        alertBox.classList.add('active', 'show-alert');
        
        if (this.alertTimeout) clearTimeout(this.alertTimeout);
        this.alertTimeout = setTimeout(() => {
            alertBox.classList.remove('show-alert', 'active');
            alertBox.classList.add('hidden');
        }, 1500);
    },

    updateHUD(timeLeft, phase, foxHP, pandaHP) {
        let m = Math.floor(timeLeft / 60); let s = timeLeft % 60;
        document.getElementById('hud-timer').innerText = `${m}:${s < 10 ? '0':''}${s}`;
        document.getElementById('hud-phase').innerText = phase.toUpperCase();
        
        document.getElementById('hud-fox-stats').innerText = `Foxes: ${foxHP} HP`;
        document.getElementById('hud-panda-stats').innerText = `Pandas: ${pandaHP} HP`;
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
        if (this.enteredPwd === window.Game.safePassword) {
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
