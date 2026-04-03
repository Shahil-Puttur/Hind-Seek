// js/economy.js

const Economy = {
    coins: 0,
    inventory: [],

    init: function() {
        this.loadData();
        this.updateUI();
    },

    loadData: function() {
        let savedCoins = localStorage.getItem('hidehunt_coins');
        this.coins = savedCoins ? parseInt(savedCoins) : 0;
        
        let savedInv = localStorage.getItem('hidehunt_inv');
        this.inventory = savedInv ? JSON.parse(savedInv) : [];
    },

    saveData: function() {
        localStorage.setItem('hidehunt_coins', this.coins.toString());
        localStorage.setItem('hidehunt_inv', JSON.stringify(this.inventory));
        this.updateUI();
    },

    addCoins: function(amount) {
        this.coins += amount;
        this.saveData();
    },

    deductCoins: function(amount) {
        if (this.coins >= amount) {
            this.coins -= amount;
            this.saveData();
            return true;
        }
        return false;
    },

    buyItem: function(itemId, cost) {
        if (this.inventory.includes(itemId)) {
            return "ALREADY_OWNED";
        }
        if (this.deductCoins(cost)) {
            this.inventory.push(itemId);
            this.saveData();
            return "SUCCESS";
        }
        return "NO_FUNDS";
    },

    updateUI: function() {
        const displayCoins = document.getElementById('display-coins');
        const shopCoins = document.getElementById('shop-coins');
        if(displayCoins) displayCoins.innerText = this.coins;
        if(shopCoins) shopCoins.innerText = this.coins;
    }
};
