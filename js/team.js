// js/team.js

const TeamManager = {
    teams: {
        A: { id: 'A', name: 'Team A', score: 0, currentRole: 'Fox', members: [] },
        B: { id: 'B', name: 'Team B', score: 0, currentRole: 'Panda', members: [] }
    },
    currentRound: 1,
    maxRounds: 2,
    
    initTeams: function(nameA, nameB) {
        this.teams.A.name = nameA || "Team A";
        this.teams.B.name = nameB || "Team B";
        this.teams.A.score = 0;
        this.teams.B.score = 0;
        this.teams.A.members = [];
        this.teams.B.members = [];
        this.currentRound = 1;
        this.assignRolesForRound();
    },

    addPlayer: function(playerId, teamId) {
        if(this.teams[teamId] && !this.teams[teamId].members.includes(playerId)) {
            this.teams[teamId].members.push(playerId);
        }
    },

    assignRolesForRound: function() {
        if (this.currentRound === 1) {
            this.teams.A.currentRole = 'Fox';
            this.teams.B.currentRole = 'Panda';
        } else if (this.currentRound === 2) {
            this.teams.A.currentRole = 'Panda';
            this.teams.B.currentRole = 'Fox';
        }
    },

    getRoleForTeam: function(teamId) {
        return this.teams[teamId].currentRole;
    },

    addScore: function(teamId, diamonds) {
        this.teams[teamId].score += diamonds;
    },

    checkRoundEnd: function(playersObj) {
        // Round ends if time is up (handled externally) OR all Pandas are dead
        
        let pandasAlive = 0;
        let pandaTeamId = this.teams.A.currentRole === 'Panda' ? 'A' : 'B';
        
        for(let key in playersObj) {
            let p = playersObj[key];
            if (p.teamId === pandaTeamId && !p.isDead) {
                pandasAlive++;
            }
        }

        if (pandasAlive === 0 && this.teams[pandaTeamId].members.length > 0) {
            return { ended: true, reason: "ALL_PANDAS_DEAD" };
        }

        return { ended: false };
    },

    getWinner: function() {
        // Fox team gets points for diamonds they successfully hid and protected.
        // We compare the scores (which are updated at the end of each round).
        if (this.teams.A.score > this.teams.B.score) return this.teams.A.name;
        if (this.teams.B.score > this.teams.A.score) return this.teams.B.name;
        return "DRAW";
    }
};
