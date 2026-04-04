// js/main.js
window.Input = { x: 0, y: 0 };
const keys = {};

// 1. BULLETPROOF ASSET MANAGER
const AssetManager = {
    assets: { fox: 'fox.png', panda: 'panda.png', grass: 'grass.png' },
    images: {},
    loaded: 0,
    total: 0,
    
    load(callback) {
        let assetKeys = Object.keys(this.assets);
        this.total = assetKeys.length;
        
        if (this.total === 0) return callback(); // Safety fallback
        
        assetKeys.forEach(key => {
            let img = new Image();
            // Critical: Handle both load AND error so the screen never gets stuck
            img.onload = () => this.onAssetLoaded(callback);
            img.onerror = () => this.onAssetLoaded(callback); // Proceed even if missing
            img.src = `img/${this.assets[key]}`; // Assuming images are in an 'img' folder
            this.images[key] = img;
        });
    },

    onAssetLoaded(callback) {
        this.loaded++;
        let percent = Math.floor((this.loaded / this.total) * 100);
        document.getElementById('loading-bar').style.width = percent + '%';
        document.getElementById('loading-text').innerText = `Loading Assets... ${percent}%`;
        
        if (this.loaded >= this.total) {
            setTimeout(callback, 500); // Slight delay for smooth visual transition
        }
    }
};

// 2. INPUT CONTROLS
window.addEventListener('keydown', (e) => { keys[e.code] = true; if(e.code === 'Space') Game.handleShoot(); });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

const joyZone = document.getElementById('joystick-zone');
const joyKnob = document.getElementById('joystick-knob');
let isDragging = false, joyCenter = {x:0, y:0}, touchId = null;

if(joyZone) {
    joyZone.addEventListener('touchstart', (e) => {
        e.preventDefault(); if(isDragging) return;
        let t = e.changedTouches[0]; touchId = t.identifier; isDragging = true;
        let r = joyZone.getBoundingClientRect(); joyCenter = { x: r.left + r.width/2, y: r.top + r.height/2 };
        updateJoystick(t.clientX, t.clientY);
    }, {passive: false});

    window.addEventListener('touchmove', (e) => {
        if(!isDragging) return;
        for(let i=0; i<e.changedTouches.length; i++) {
            if(e.changedTouches[i].identifier === touchId) updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        }
    }, {passive: false});

    window.addEventListener('touchend', (e) => {
        for(let i=0; i<e.changedTouches.length; i++) {
            if(e.changedTouches[i].identifier === touchId) {
                isDragging = false; touchId = null; joyKnob.style.transform = `translate(-50%, -50%)`; window.Input = {x:0, y:0};
            }
        }
    });
}

function updateJoystick(cx, cy) {
    let dx = cx - joyCenter.x; let dy = cy - joyCenter.y;
    let dist = Math.sqrt(dx*dx + dy*dy); let maxR = 45;
    if(dist < maxR * 0.15) { window.Input = {x:0, y:0}; joyKnob.style.transform = `translate(-50%, -50%)`; return; }
    if(dist > maxR) { dx = (dx/dist)*maxR; dy = (dy/dist)*maxR; }
    joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    window.Input = { x: dx/maxR, y: dy/maxR };
}

setInterval(() => {
    if(!isDragging) {
        let dx=0, dy=0;
        if(keys['KeyW'] || keys['ArrowUp']) dy -= 1;
        if(keys['KeyS'] || keys['ArrowDown']) dy += 1;
        if(keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
        if(keys['KeyD'] || keys['ArrowRight']) dx += 1;
        window.Input = {x: dx, y: dy};
    }
}, 50);

// 3. UI WIRING & BOOTSTRAP
window.onload = () => {
    UI.init();
    Game.init();

    // Start Asset Loader -> Then show Login Screen
    AssetManager.load(() => {
        UI.showScreen('screen-start');
    });

    document.getElementById('btn-login').onclick = () => {
        let u = document.getElementById('input-username').value;
        if(u.length < 3) return UI.showAlert("Username must be at least 3 characters!", "#e74c3c");
        GlobalState.username = u;
        document.getElementById('display-username').innerText = u;
        UI.showScreen('screen-menu');
    };

    // Main Menu Buttons
    document.getElementById('btn-menu-online').onclick = () => { Network.quickMatch(); }; // Automated Quickplay
    document.getElementById('btn-menu-offline').onclick = () => { Bot.initOfflineMatch(); };
    document.getElementById('btn-menu-friends').onclick = () => { UI.showScreen('screen-friends-menu'); };
    
    // Friends Mode: Hosting
    document.getElementById('btn-friend-host').onclick = () => { UI.showScreen('screen-host-options'); };
    let selectedMode = '1v1';
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll('.mode-btn').forEach(b => b.style.borderColor = "#333");
            e.target.style.borderColor = "#f1c40f";
            selectedMode = e.target.dataset.mode;
            document.getElementById('team-names-box').classList.remove('hidden');
        };
    });

    document.getElementById('btn-confirm-host').onclick = () => {
        Network.createRoom(selectedMode, document.getElementById('input-team-a').value, document.getElementById('input-team-b').value, false);
    };

    // Friends Mode: Joining
    document.getElementById('btn-friend-join').onclick = () => { UI.showScreen('screen-join'); };
    document.getElementById('btn-submit-join').onclick = () => {
        Network.joinRoom(document.getElementById('input-room-id').value, document.getElementById('input-room-pass').value);
    };

    // Navigation & Actions
    document.getElementById('btn-friends-back').onclick = () => UI.showScreen('screen-menu');
    document.getElementById('btn-host-back').onclick = () => UI.showScreen('screen-friends-menu');
    document.getElementById('btn-join-back').onclick = () => UI.showScreen('screen-friends-menu');
    document.getElementById('btn-leave-lobby').onclick = () => { location.reload(); };
    document.getElementById('btn-result-menu').onclick = () => { location.reload(); };
    document.getElementById('btn-shoot').addEventListener('pointerdown', (e) => { e.preventDefault(); Game.handleShoot(); });
};
