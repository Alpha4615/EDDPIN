var modBaseObject = require('../../lib/classes/moduleObject.js');
util = require('util');

function testModule() {
    modBaseObject.apply(this, arguments);

}

util.inherits(testModule, modBaseObject);

testModule.prototype.biography = {
    title: 'Test module',
    description: 'A module written for testing',
    author: 'Joe Shmoe',
    version: '1.0'
};

testModule.prototype.events  = {'kick': 'onKick',
    'join': 'onJoin',
    'newUser': 'onNewUser',
    'part': 'onPart',
    'userModeChange': 'onUserModeChange',
    'EndOfBurst': 'endBurst'};

testModule.prototype.onLoad = function() {

};

testModule.prototype.onJoin = function(event) {
};

testModule.prototype.onNewUser = function(event) {
};

testModule.prototype.onKick = function(event) {
};

testModule.prototype.onEndBurst = function(event) {
};

module.exports = testModule;