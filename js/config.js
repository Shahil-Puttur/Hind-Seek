// js/config.js
const GAME_VERSION = "3.1-Ultimate";

const CONFIG = {
    FIREBASE: {
        apiKey: "AIzaSyBJSpiM9JezegPH0LkXInfgbyPWyzs6Epk",
        authDomain: "hideandhunt.firebaseapp.com",
        databaseURL: "https://hideandhunt-default-rtdb.firebaseio.com/",
        projectId: "hideandhunt",
        storageBucket: "hideandhunt.firebasestorage.app",
        messagingSenderId: "613687870413",
        appId: "1:613687870413:web:4053277053fbbd4f05ba84"
    },
    MAP: {
        SIZE: 22,
        TILE_SIZE: 80,
        get PIXEL_SIZE() { return this.SIZE * this.TILE_SIZE; }
    },
    TIMERS: {
        PRE_GAME: 5,
        HIDING: 60,
        PLAYING: 180, // Updated to exactly 3 Minutes (180 seconds)
        SYNC_RATE: 100 
    },
    TEAMS: {
        FOX: { id: 'fox', name: 'Foxes', color: '#e67e22' },
        PANDA: { id: 'panda', name: 'Pandas', color: '#3498db' }
    }
};

firebase.initializeApp(CONFIG.FIREBASE);
const db = firebase.database();

let serverTimeOffset = 0;
db.ref('.info/serverTimeOffset').on('value', snap => { serverTimeOffset = snap.val() || 0; });
function getSyncTime() { return Date.now() + serverTimeOffset; }

window.GlobalState = {
    myId: Math.random().toString(36).substr(2, 9),
    username: "Player",
    roomId: null,
    isHost: false,
    gameMode: '1v1',
    myTeam: null,
    isSpectating: false
};
