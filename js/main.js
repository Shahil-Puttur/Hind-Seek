// js/main.js

window.checkOrientation = function() {
    const warning = document.getElementById('orientation-warning');
    const transitionScreen = document.getElementById('screen-transition');
    const gameScreen = document.getElementById('screen-game-hud');
    const blockerScreen = document.getElementById('screen-blocker');

    if (transitionScreen.classList.contains('active') || gameScreen.classList.contains('active') || blockerScreen.classList.contains('active')) {
        if (window.innerHeight > window.innerWidth) warning.style.display = 'flex';
        else warning.style.display = 'none';
    } else {
        warning.style.display = 'none';
    }
    Utils.checkFullscreen();
};

window.onload = function() {
    // 1. Audio Setup
    window.audioPool = [];
    for(let i=0; i<5; i++) {
        let a = new Audio('assets/sounds/shoot.mp3');
        a.preload = 'auto';
        window.audioPool.push(a);
    }
    window.playShootSound = function() { 
        try { 
            window.audioIndex = window.audioIndex || 0; 
            let snd = window.audioPool[window.audioIndex];
            snd.currentTime = 0; snd.volume = 1.0; 
            let p = snd.play(); 
            if(p !== undefined) p.catch(()=>{});
            window.audioIndex = (window.audioIndex + 1) % window.audioPool.length; 
        } catch(e) {} 
    };

    // 2. Initialize Modules
    Economy.init();
    Network.init();
    Matchmaking.init();
    Game.init();
    window.addEventListener('resize', window.checkOrientation);

    // 3. 10-Second Loading Sequence
    let loadTime = 0;
    const bar = document.getElementById('loading-bar');
    const txt = document.getElementById('loading-text');
    
    // Load images during this time
    Game.images['fox'] = new Image(); Game.images['fox'].src = 'assets/images/fox.png';
    Game.images['panda'] = new Image(); Game.images['panda'].src = 'assets/images/panda.png';
    // Add other images here...

    const loadInterval = setInterval(() => {
        loadTime += 100;
        let percent = Math.min(100, (loadTime / 10000) * 100);
        bar.style.width = percent + "%";
        txt.innerText = `Loading Assets... ${Math.floor(percent)}%`;

        if (loadTime >= 10000) {
            clearInterval(loadInterval);
            checkAutoLogin();
        }
    }, 100);

    // 4. Auto-Login Flow
    function checkAutoLogin() {
        let savedU = localStorage.getItem('hidehunt_user');
        let savedP = localStorage.getItem('hidehunt_pass');
        
        if (savedU && savedP) {
            Network.db.ref('users/' + savedU).once('value', snap => {
                let data = snap.val();
                if (data && data.password === savedP) {
                    finalizeLogin(savedU);
                } else {
                    UI.showScreen('screen-start'); // Failed, show Auth
                }
            }).catch(() => UI.showScreen('screen-start'));
        } else {
            UI.showScreen('screen-start'); // First time, show Auth
        }
    }

    function finalizeLogin(username) {
        document.getElementById('display-username').innerText = username;
        Utils.enterFullscreen();
        UI.showScreen('screen-menu');
    }

    // 5. Auth Buttons
    document.getElementById('btn-login').onclick = () => {
        let u = document.getElementById('input-username').value.trim().replace(/[^a-zA-Z0-9]/g, ''); 
        let p = document.getElementById('input-password').value.trim();
        if(!u || !p) return UI.showError("Enter username and password!");
        
        let btn = document.getElementById('btn-login'); btn.innerText = "Wait..."; btn.disabled = true;
        Network.db.ref('users/' + u).once('value', snap => {
            btn.innerText = "Login"; btn.disabled = false;
            let data = snap.val(); 
            if (data && data.password === p) {
                localStorage.setItem('hidehunt_user', u); localStorage.setItem('hidehunt_pass', p);
                finalizeLogin(u);
            } else UI.showError("Incorrect password or user not found.");
        }).catch(() => { btn.innerText = "Login"; btn.disabled = false; UI.showError("Network error."); });
    };

    document.getElementById('btn-register').onclick = () => {
        let u = document.getElementById('input-username').value.trim().replace(/[^a-zA-Z0-9]/g, ''); 
        let p = document.getElementById('input-password').value.trim();
        if(!u || !p) return UI.showError("Enter username and password!");
        if(u.length < 3) return UI.showError("Username must be 3+ letters.");
        
        let btn = document.getElementById('btn-register'); btn.innerText = "Wait..."; btn.disabled = true;
        Network.db.ref('users/' + u).once('value', snap => {
            if (snap.exists()) { 
                btn.innerText = "Register"; btn.disabled = false; UI.showError("Username already taken."); 
            } else { 
                Network.db.ref('users/' + u).set({ password: p }).then(() => { 
                    btn.innerText = "Register"; btn.disabled = false; 
                    localStorage.setItem('hidehunt_user', u); localStorage.setItem('hidehunt_pass', p);
                    finalizeLogin(u); 
                }); 
            }
        });
    };
    
    // Copy Room
    document.getElementById('btn-copy-room').onclick = function() {
        let id = document.getElementById('display-room-id').innerText;
        let pass = document.getElementById('display-room-pass').innerText;
        Utils.copyToClipboard(`Join my room!\nID: ${id}\nPass: ${pass}`);
        let old = this.innerText; this.innerText = "COPIED!";
        setTimeout(() => this.innerText = old, 1500);
    };
};
