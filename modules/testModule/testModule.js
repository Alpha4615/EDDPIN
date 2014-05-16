var mod = {

    biography: {
        title: 'Test module',
        description: 'A module written for testing',
        author: 'Jonathan Knippschild',
        version: '1.0'
    },
    core: '',
    events: {
        'kick': 'onKick',
        'join': 'onJoin',
        'newUser': 'onNewUser',
        'part': 'onPart',
        'userModeChange': 'onUserModeChange'
    },


    onLoad: function (core) {
        this.core = core;
    },

    onKick: function (event) {
    },
    onJoin: function (event) {
    },
    onPart: function (event) {
    },
    onNewUser: function (event) {
    },
    onUserModeChange: function (event) {
    }

};


module.exports = mod;