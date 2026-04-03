// js/config.js

const CONFIG = {
    // Game Version
    VERSION: '3.0',
    
    // Map Settings
    TILE_SIZE: 80,
    MAP_SIZE: 22,
    
    // Player Settings
    PLAYER_SPEED: 420,
    PLAYER_SIZE: 100,
    HITBOX_W: 30,
    HITBOX_H: 25,
    MAX_HEARTS: 1, // 1 hit = spectator
    
    // Game Rules
    DIAMONDS_PER_ROUND: 5,
    ROUND_TIME_MS: 5 * 60 * 1000, // 5 minutes
    
    // Team Definitions
    TEAM_A: {
        id: 'A',
        color: '#e67e22', // Orange
        defaultRole: 'Fox' // Hider
    },
    TEAM_B: {
        id: 'B',
        color: '#3498db', // Blue
        defaultRole: 'Panda' // Seeker
    },
    
    // Rewards
    REWARD_WIN: 50,
    REWARD_DRAW: 20,
    REWARD_LOSE: 10,
    
    // Firebase Configuration (Replace with your own keys)
    FIREBASE: {
        apiKey: "AIzaSyBJSpiM9JezegPH0LkXInfgbyPWyzs6Epk",
        authDomain: "hideandhunt.firebaseapp.com",
        databaseURL: "https://hideandhunt-default-rtdb.firebaseio.com/",
        projectId: "hideandhunt",
        storageBucket: "hideandhunt.firebasestorage.app",
        messagingSenderId: "613687870413",
        appId: "1:613687870413:web:4053277053fbbd4f05ba84"
    }
};

// Derived Configuration
CONFIG.MAP_PIXEL_SIZE = CONFIG.MAP_SIZE * CONFIG.TILE_SIZE;
