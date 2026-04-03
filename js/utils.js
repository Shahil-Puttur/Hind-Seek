// js/utils.js

const Utils = {
    // Seeded Random Number Generator
    mapSeed: 1,
    randomSeed: function() {
        this.mapSeed |= 0; 
        this.mapSeed = this.mapSeed + 0x6D2B79F5 | 0;
        let t = Math.imul(this.mapSeed ^ this.mapSeed >>> 15, 1 | this.mapSeed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    },
    
    setSeed: function(seed) {
        this.mapSeed = seed;
    },

    // Distance between two points
    getDistance: function(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },

    // AABB Collision Detection
    checkCollision: function(rect1, rect2) {
        return (
            rect1.left < rect2.right &&
            rect1.right > rect2.left &&
            rect1.top < rect2.bottom &&
            rect1.bottom > rect2.top
        );
    },

    // Fullscreen API Handling
    enterFullscreen: function() {
        let elem = document.documentElement;
        if (elem.requestFullscreen) { 
            elem.requestFullscreen().catch(()=>{}); 
        } else if (elem.webkitRequestFullscreen) { 
            elem.webkitRequestFullscreen().catch(()=>{}); 
        }
    },

    checkFullscreen: function() {
        const btn = document.getElementById('btn-fullscreen');
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            btn.style.display = 'block';
        } else {
            btn.style.display = 'none';
        }
    },
    
    // Copy Text to Clipboard (Room code)
    copyToClipboard: function(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text);
        } else {
            let textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try { document.execCommand('copy'); } catch (err) {}
            textArea.remove();
        }
    }
};
