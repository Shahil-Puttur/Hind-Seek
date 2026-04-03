// js/main.js

// Global Orientation Check
window.checkOrientation = function() {
    const warning = document.getElementById('orientation-warning');
    const transitionScreen = document.getElementById('screen-transition');
    const gameScreen = document.getElementById('screen-game-hud');

    // ONLY show the phone rotation warning if we are playing or in the 15s countdown
    if (transitionScreen.classList.contains('active') || gameScreen.classList.contains('active')) {
        if (window.innerHeight > window.innerWidth) {
            warning.style.display = 'flex';
        } else {
            warning.style.display = 'none';
        }
    } else {
        // Never show it on the menus
        warning.style.display = 'none';
    }
    Utils.checkFullscreen();
};

window.onload = function() {
    // Basic Asset Loader Mockup
    Game.images['fox'] = new Image();
    Game.images['fox'].src = 'assets/images/fox.png';
    Game.images['panda'] = new Image();
    Game.images['panda'].src = 'assets/images/panda.png';

    // Initialize Modules
    Economy.init();
    Network.init();
    Matchmaking.init();
    Game.init();

    // Event Listeners for Orientation
    window.addEventListener('resize', window.checkOrientation);

    // Bind Fullscreen Button
    document.getElementById('btn-fullscreen').onclick = () => {
        Utils.enterFullscreen();
        document.getElementById('btn-fullscreen').style.display = 'none';
    };

    // --- AUTHENTICATION SYSTEM ---
    const authError = document.getElementById('auth-error');
    const authStatus = document.getElementById('auth-status');
    const inputUser = document.getElementById('input-username');
    const inputPass = document.getElementById('input-password');

    function finalizeLogin(username, password) {
        localStorage.setItem('hidehunt_user', username);
        localStorage.setItem('hidehunt_pass', password);
        document.getElementById('display-username').innerText = username;
        authError.classList.add('hidden');
        authStatus.classList.add('hidden');
        Utils.enterFullscreen();
        UI.showScreen('screen-menu');
    }

    // Auto-Login Check
    let savedU = localStorage.getItem('hidehunt_user');
    let savedP = localStorage.getItem('hidehunt_pass');
    
    if (savedU && savedP) {
        authStatus.classList.remove('hidden');
        // We delay slightly to allow Firebase RTDB to initialize
        setTimeout(() => {
            Network.db.ref('users/' + savedU).once('value', snap => {
                let data = snap.val();
                if (data && data.password === savedP) {
                    finalizeLogin(savedU, savedP);
                } else {
                    authStatus.classList.add('hidden');
                }
            }).catch(() => authStatus.classList.add('hidden'));
        }, 1000);
    }

    // Login Button
    document.getElementById('btn-login').onclick = () => {
        let u = inputUser.value.trim().replace(/[^a-zA-Z0-9]/g, ''); 
        let p = inputPass.value.trim();
        if(!u || !p) return UI.showError("Enter username and password!");
        
        let btn = document.getElementById('btn-login'); 
        btn.innerText = "Wait..."; btn.disabled = true;
        
        Network.db.ref('users/' + u).once('value', snap => {
            btn.innerText = "Login"; btn.disabled = false;
            let data = snap.val(); 
            if (data && data.password === p) {
                finalizeLogin(u, p);
            } else {
                UI.showError("Incorrect password or user not found.");
            }
        }).catch(() => { 
            btn.innerText = "Login"; btn.disabled = false; 
            UI.showError("Network error."); 
        });
    };

    // Register Button
    document.getElementById('btn-register').onclick = () => {
        let u = inputUser.value.trim().replace(/[^a-zA-Z0-9]/g, ''); 
        let p = inputPass.value.trim();
        if(!u || !p) return UI.showError("Enter username and password!");
        if(u.length < 3) return UI.showError("Username must be 3+ letters.");
        
        let btn = document.getElementById('btn-register'); 
        btn.innerText = "Wait..."; btn.disabled = true;
        
        Network.db.ref('users/' + u).once('value', snap => {
            if (snap.exists()) { 
                btn.innerText = "Register"; btn.disabled = false; 
                UI.showError("Username already taken."); 
            } else { 
                Network.db.ref('users/' + u).set({ password: p }).then(() => { 
                    btn.innerText = "Register"; btn.disabled = false; 
                    finalizeLogin(u, p); 
                }); 
            }
        });
    };

    // Main Menu Bindings
    document.getElementById('btn-menu-shop').onclick = () => {
        UI.showScreen('screen-shop');
    };

    document.getElementById('btn-shop-back').onclick = () => {
        UI.showScreen('screen-menu');
    };

    document.getElementById('btn-result-menu').onclick = () => {
        Network.leaveRoom();
        UI.showScreen('screen-menu');
    };

    document.getElementById('btn-copy-room').onclick = function() {
        let id = document.getElementById('display-room-id').innerText;
        let pass = document.getElementById('display-room-pass').innerText;
        Utils.copyToClipboard(`Join my Hide & Hunt room!\nID: ${id}\nPass: ${pass}`);
        
        let old = this.innerText;
        this.innerText = "COPIED!";
        setTimeout(() => this.innerText = old, 1500);
    };

    document.querySelectorAll('.shop-btn').forEach(btn => {
        btn.onclick = (e) => {
            let cost = parseInt(e.target.getAttribute('data-cost'));
            let res = Economy.buyItem('item_' + Date.now(), cost);
            if(res === "SUCCESS") e.target.innerText = "OWNED";
            else alert("Not enough coins!");
        };
    });
};
