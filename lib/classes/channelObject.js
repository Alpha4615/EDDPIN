var channel = function (name) {
    this.name = name;
    this.modes = '';
    this.modeParams = [];
    this.topic = '';
    this.users = {};

};

channel.prototype.getTargetString = function () {
    return this.name;
};
channel.prototype.membershipCount = function () {
    return Object.keys(this.users).length
};

channel.prototype.userHasMode = function (user, modeQuery) {
    if (this.hasUser(user) === false) {
        return false;
    }

    var foundUser = this.users[user.numeric];
    var splitModes = foundUser.mode.split('');
    return (splitModes.indexOf(modeQuery) !== -1);
};

channel.prototype.userIsOp = function (user) {
    return this.userHasMode(user, 'o');
};
channel.prototype.userIsVoice = function (user) {
    return this.userHasMode(user, 'v');
};

channel.prototype.userJoin = function (user, modes) {
    modes = (modes === undefined ? '' : modes);

    this.users[user.numeric] = {'user': user, 'mode': modes};
    user.channels[this.name] = {channel: this, mode: modes};
};

channel.prototype.userPart = function (user) {
    delete this.users[user.numeric];
    delete user.channels[this.name];
};


channel.prototype.hasUserNumeric = function (numeric) {
    return (this.users[numeric] !== undefined);
};

channel.prototype.hasUser = function (user) {
    for (var key in this.users) {
        if (key === user.numeric) {
            return true;
        }
    }
    return false;
};

module.exports = channel;