// js/main.js
window.Input = { x: 0, y: 0 };
const keys = {};

window.addEventListener('keydown', (e) => { keys[e.code] = true; if(e.code === 'Space') Game.handleShoot(); });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// Joystick Logic
const joyZone = document.getElementById('joystick-zone');
const joyKnob = document.getElementById('joystick-knob');
let isDragging = false, joyCenter = {x:0, y:0}, touchId = null;

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
            isDragging = false; touchId = null; joyKnob.style.transform = `translate(-50%, -50%)`; Input = {x:0, y:0};
        }
    }
});

function updateJoystick(cx, cy) {
    let dx = cx - joyCenter.x; let dy = cy - joyCenter.y;
    let dist = Math.sqrt(dx*dx + dy*dy); let maxR = 45;
    if(dist < maxR * 0.15) { Input = {x:0, y:0}; joyKnob.style.transform = `translate(-50%, -50%)`; return; }
    if(dist > maxR) { dx = (dx/dist)*maxR; dy = (dy/dist)*maxR; }
    joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    Input = { x: dx/maxR, y: dy/maxR };
}

// Keyboard fallback loop
setInterval(() => {
    if(!isDragging) {
        let dx=0, dy=0;
        if(keys['KeyW'] || keys['ArrowUp']) dy -= 1;
        if(keys['KeyS'] || keys['ArrowDown']) dy += 1;
        if(keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
        if(keys['KeyD'] || keys['ArrowRight']) dx += 1;
        Input = {x: dx, y: dy};
    }
}, 50);

// UI Wiring
window.onload = () => {
    UI.init();
    Game.init();

    // Fake Auth for Web Version Demo
    document.getElementById('btn-login').onclick = () => {
        let u = document.getElementById('input-username').value;
        if(u.length < 3) return UI.showAlert("Username too short!", "#e74c3c");
        GlobalState.username = u;
        document.getElementById('display-username').innerText = u;
        UI.showScreen('screen-menu');
    };

    // Main Menu
    document.getElementById('btn-menu-offline').onclick = () => { Bot.initOfflineMatch(); };
    document.getElementById('btn-menu-friends').onclick = () => { UI.showScreen('screen-friends-menu'); };
    
    // Hosting
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
        Network.createRoom(selectedMode, document.getElementById('input-team-a').value, document.getElementById('input-team-b').value);
    };

    // Joining
    document.getElementById('btn-friend-join').onclick = () => { UI.showScreen('screen-join'); };
    document.getElementById('btn-submit-join').onclick = () => {
        Network.joinRoom(document.getElementById('input-room-id').value, document.getElementById('input-room-pass').value);
    };

    // Back Buttons
    document.getElementById('btn-friends-back').onclick = () => UI.showScreen('screen-menu');
    document.getElementById('btn-host-back').onclick = () => UI.showScreen('screen-friends-menu');
    document.getElementById('btn-join-back').onclick = () => UI.showScreen('screen-friends-menu');
    document.getElementById('btn-leave-lobby').onclick = () => { location.reload(); };
    document.getElementById('btn-result-menu').onclick = () => { location.reload(); };

    // In Game Actions
    document.getElementById('btn-shoot').addEventListener('pointerdown', (e) => { e.preventDefault(); Game.handleShoot(); });
    
    // Clear Loading screen after slight delay for visual aesthetics
    setTimeout(() => { UI.showScreen('screen-start'); }, 1000);
};
