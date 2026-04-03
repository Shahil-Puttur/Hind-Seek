// js/network.js

const Network = {
    db: null,
    roomId: null,
    myId: null,
    isHost: false,
    serverTimeOffset: 0,
    
    init: function() {
        if (!firebase.apps.length) {
            firebase.initializeApp(CONFIG.FIREBASE);
        }
        this.db = firebase.database();
        this.myId = Math.random().toString(36).substr(2, 9);
        
        this.db.ref('.info/serverTimeOffset').on('value', snap => { 
            this.serverTimeOffset = snap.val() || 0; 
        });
    },

    getSyncTime: function() {
        return Date.now() + this.serverTimeOffset;
    },

    listenToConnection: function(callback) {
        this.db.ref('.info/connected').on('value', snap => {
            callback(snap.val() === true);
        });
    },

    createRoom: function(roomData, callback) {
        this.roomId = Math.random().toString(36).substr(2, 6).toUpperCase();
        this.isHost = true;
        let ref = this.db.ref('rooms/' + this.roomId);
        
        ref.set(roomData).then(() => {
            ref.onDisconnect().remove();
            callback(this.roomId);
        });
    },

    joinRoom: function(roomId, password, callback) {
        let ref = this.db.ref('rooms/' + roomId);
        ref.once('value', snap => {
            let data = snap.val();
            if (!data) return callback({ success: false, msg: "Room not found!" });
            if (data.password !== password) return callback({ success: false, msg: "Incorrect Password!" });
            if (data.players && Object.keys(data.players).length >= 6) return callback({ success: false, msg: "Room is full!" }); 
            
            this.roomId = roomId;
            this.isHost = false;
            callback({ success: true, roomData: data });
        });
    },

    joinPlayer: function(playerData) {
        if (!this.roomId) return;
        let pRef = this.db.ref(`rooms/${this.roomId}/players/${this.myId}`);
        pRef.set(playerData);
        pRef.onDisconnect().remove();
    },

    updatePlayerStatus: function(updates) {
        if (!this.roomId) return;
        this.db.ref(`rooms/${this.roomId}/players/${this.myId}`).update(updates);
    },

    // NEW: Lets the Host update anyone's status (like moving them to a different team)
    updateAnyPlayerStatus: function(playerId, updates) {
        if (!this.roomId || !this.isHost) return;
        this.db.ref(`rooms/${this.roomId}/players/${playerId}`).update(updates);
    },

    updateRoomState: function(updates) {
        if (!this.roomId || !this.isHost) return;
        this.db.ref(`rooms/${this.roomId}`).update(updates);
    },

    syncPosition: function(x, y, isAiming, aimDir) {
        if (!this.roomId || !Game.isPlaying) return;
        this.db.ref(`rooms/${this.roomId}/players/${this.myId}`).update({
            x: Math.round(x), 
            y: Math.round(y), 
            isAiming: isAiming, 
            aimDir: aimDir
        });
    },

    sendShootEvent: function(x, y) {
        if (!this.roomId) return;
        this.db.ref(`rooms/${this.roomId}/events`).push({
            type: 'shoot',
            x: x,
            y: y,
            sender: this.myId,
            time: this.getSyncTime()
        });
    },

    listenToRoom: function(callbacks) {
        if (!this.roomId) return;
        let ref = this.db.ref(`rooms/${this.roomId}`);
        
        ref.child('players').on('value', snap => {
            if(callbacks.onPlayersUpdate) callbacks.onPlayersUpdate(snap.val() || {});
        });
        
        ref.child('gameState').on('value', snap => {
            if(callbacks.onStateChange) callbacks.onStateChange(snap.val());
        });
        
        ref.child('timerEnd').on('value', snap => {
            if(callbacks.onTimerUpdate) callbacks.onTimerUpdate(snap.val());
        });

        ref.child('events').on('child_added', snap => {
            let ev = snap.val();
            if(callbacks.onEventReceived) callbacks.onEventReceived(ev);
            snap.ref.remove();
        });
        
        ref.child('mapItems').on('value', snap => {
            if(callbacks.onItemsUpdate) callbacks.onItemsUpdate(snap.val() || {});
        });
    },

    leaveRoom: function() {
        if (this.roomId) {
            this.db.ref(`rooms/${this.roomId}/players/${this.myId}`).remove();
            this.db.ref(`rooms/${this.roomId}`).off();
            this.roomId = null;
            this.isHost = false;
        }
    }
};
