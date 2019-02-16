var channel = function (name) {
    this.name = name;
    this.nameSafe = name.toLowerCase();
    this.modes = '';
    this.modeParams = [];
    this.topic = '';
    this.bans = [];
    this.ban_exceptions = [];
    this.users = {};

};

channel.prototype.getTargetString = function () {
    return this.name;
};
channel.prototype.membershipCount = function () {
    return Object.keys(this.users).length
};

channel.prototype.banAdd = function (mask) {
    this.bans[this.bans.length] = mask.toLowerCase();
};

channel.prototype.banExists = function (mask) {
    for (var x = 0; x < this.bans.length; x++) {
        if (mask.toLowerCase() == this.bans[x]) {
            return true;
        }
    }

    return false;
};

channel.prototype.banRemove = function (mask) {
    this.bans = this.bans.filter(function (banSearch) {
        return mask.toLowerCase() !== banSearch;
    });
};


channel.prototype.banExceptionAdd = function (mask) {
    this.ban_exceptions[this.ban_exceptions.length] = mask.toLowerCase();
};

channel.prototype.banExceptionExists = function (mask) {
    for (var x = 0; x < this.ban_exceptions.length; x++) {
        if (mask.toLowerCase() == this.ban_exceptions[x]) {
            return true;
        }
    }

    return false;
};

channel.prototype.banExceptionRemove = function (mask) {
    this.ban_exceptions = this.ban_exceptions.filter(function (banSearch) {
        return mask.toLowerCase() !== banSearch;
    });
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
channel.prototype.userIsHalfOp = function (user) {
    return this.userHasMode(user, 'h');
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


channel.prototype.hasMode = function (modeQuery) {
    return (this.modes.split('').indexOf(modeQuery) !== -1);
};

channel.prototype.getParameterModeValue = function (modeQuery) {
    if (!this.hasMode(modeQuery) || typeof this.modeParams[modeQuery] !== "string") {
        return false;
    }

    return this.modeParams[modeQuery];
};

channel.prototype.isModerated = function () {
    return this.hasMode('m');
};
channel.prototype.isRegistered = function () {
    return this.hasMode('r');
};
channel.prototype.isInviteOnly = function () {
    return this.hasMode('i');
};
channel.prototype.isSecret = function () {
    return this.hasMode('s');
};
channel.prototype.isPrivate = function () {
    return this.hasMode('p');
};
channel.prototype.isNoExternalMsg = function () {
    return this.hasMode('n');
};
channel.prototype.isTopisSetByOps = function () {
    return this.hasMode('t');
};
channel.prototype.isKeyed = function () {
    return this.hasMode('k');
};
channel.prototype.isLimited = function () {
    return this.hasMode('l');
};
channel.prototype.isRedirected = function () {
    return this.hasMode('L');
};

channel.prototype.getChannelKey = function () {
    if (!this.isKeyed()) {
        return false;
    }

    return this.getParameterModeValue('k');
};

channel.prototype.getChannelLimit = function () {
    if (!this.isLimited()) {
        return false;
    }

    var value = this.getParameterModeValue('l');

    return (value != false ? parseInt(value) : false);
};

channel.prototype.getChannelOverflowTarget = function (asObject) {
    return (this.isRedirected() ? this.getParameterModeValue('L') : false);
};


module.exports = channel;