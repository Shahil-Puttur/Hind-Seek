// js/utils.js
const Utils = {
    mapSeed: 1,
    setMapSeed(seed) { this.mapSeed = seed; },
    
    // Seeded Randomizer ensuring 6 players see the EXACT same map without downloading heavy arrays
    random() {
        this.mapSeed |= 0; this.mapSeed = this.mapSeed + 0x6D2B79F5 | 0;
        let t = Math.imul(this.mapSeed ^ this.mapSeed >>> 15, 1 | this.mapSeed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    },
    
    randomInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    },
    
    checkCollision(box1, box2) {
        return box1.right > box2.left && box1.left < box2.right &&
               box1.bottom > box2.top && box1.top < box2.bottom;
    },
    
    distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },
    
    // Linear Interpolation for smooth remote player movement
    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }
};
