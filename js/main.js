// js/main.js

window.onload = function() {
    // Basic Asset Loader Mockup
    Game.images['fox'] = new Image();
    Game.images['fox'].src = 'assets/images/fox.png'; // Will use fallback circle if fails
    Game.images['panda'] = new Image();
    Game.images['panda'].src = 'assets/images/panda.png';

    // Initialize Modules
    Economy.init();
    Network.init();
    Matchmaking.init();
    Game.init();

    // Check Orientation
    window.addEventListener('resize', () => {
        const warning = document.getElementById('orientation-warning');
        if (window.innerHeight > window.innerWidth) warning.style.display = 'flex';
        else warning.style.display = 'none';
        
        Utils.checkFullscreen();
    });
    // Trigger on boot
    if (window.innerHeight > window.innerWidth) {
        document.getElementById('orientation-warning').style.display = 'flex';
    }

    // Bind Fullscreen Button
    document.getElementById('btn-fullscreen').onclick = () => {
        Utils.enterFullscreen();
        document.getElementById('btn-fullscreen').style.display = 'none';
    };

    // Main Menu Bindings
    document.getElementById('btn-login').onclick = () => {
        let u = document.getElementById('input-username').value.trim();
        if (u.length < 3) {
            UI.showError("Username must be at least 3 characters!");
            return;
        }
        document.getElementById('display-username').innerText = u;
        document.getElementById('auth-error').classList.add('hidden');
        Utils.enterFullscreen();
        UI.showScreen('screen-menu');
    };

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

    // Copy to clipboard mapping
    document.getElementById('btn-copy-room').onclick = function() {
        let id = document.getElementById('display-room-id').innerText;
        let pass = document.getElementById('display-room-pass').innerText;
        Utils.copyToClipboard(`Join my Hide & Hunt room!\nID: ${id}\nPass: ${pass}`);
        
        let old = this.innerText;
        this.innerText = "COPIED!";
        setTimeout(() => this.innerText = old, 1500);
    };

    // Preload dummy items in shop
    document.querySelectorAll('.shop-btn').forEach(btn => {
        btn.onclick = (e) => {
            let cost = parseInt(e.target.getAttribute('data-cost'));
            let res = Economy.buyItem('item_' + Date.now(), cost);
            if(res === "SUCCESS") e.target.innerText = "OWNED";
            else alert("Not enough coins!");
        };
    });
};
