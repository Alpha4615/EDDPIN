var moduleObj = function(core) {
    this.core = core;
};
moduleObj.prototype.events = {};
moduleObj.prototype.myUsers = [];
moduleObj.prototype.biography = {
    title: 'Untitled Module',
    description: 'An enigmatic module',
    author: 'Anonymous',
    version: '1.0'
};

moduleObj.prototype.createBot = function (optionsObj) {
    return this.core.createPseudoUser(this, optionsObj);
}

moduleObj.prototype.isMyUser = function (user) {
    for (var key in this.myUsers) {
        if (key === user.numeric) {
            return true;
        }
    }

    return false;
}

module.exports = moduleObj;