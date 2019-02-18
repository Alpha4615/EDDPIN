/**
 * @constructor
 * @param name {String} Name of channel to be created
 */
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

/**
 * Returns the channel name, which is used in protocol messages as a target
 * @returns {string}
 */
channel.prototype.getTargetString = function () {
    return this.name;
};

/**
 * Returns count of users in the channel
 * @returns {Number}
 */
channel.prototype.membershipCount = function () {
    return Object.keys(this.users).length
};

/**
 * Adds a ban mask to the internal tracking
 * @param mask
 * @see banRemove
 * @see banExists
 */
channel.prototype.banAdd = function (mask) {
    this.bans[this.bans.length] = mask.toLowerCase();
};

/**
 * Tests if the channel has a specific mask banned
 * @param mask
 * @returns {boolean}
 * @see banAdd
 * @see banRemove
 */
channel.prototype.banExists = function (mask) {
    for (var x = 0; x < this.bans.length; x++) {
        if (mask.toLowerCase() == this.bans[x]) {
            return true;
        }
    }

    return false;
};

/**
 * Removes a ban mask from the internal tracking
 * @param mask
 * @see banAdd
 * @see banExists
 */
channel.prototype.banRemove = function (mask) {
    this.bans = this.bans.filter(function (banSearch) {
        return mask.toLowerCase() !== banSearch;
    });
};

/**
 * Adds an exception mask to the internal tracking
 * @param mask
 * @see banExceptionExists
 * @see banExceptionRemove
 */
channel.prototype.banExceptionAdd = function (mask) {
    this.ban_exceptions[this.ban_exceptions.length] = mask.toLowerCase();
};

/**
 * Tests if the channel has a specific mask in its exception list
 * @param mask
 * @returns {boolean}
 * @see banExceptionAdd
 * @see banExceptionRemove
 */
channel.prototype.banExceptionExists = function (mask) {
    for (var x = 0; x < this.ban_exceptions.length; x++) {
        if (mask.toLowerCase() == this.ban_exceptions[x]) {
            return true;
        }
    }

    return false;
};

/**
 * Removes a exception mask from the internal tracking
 * @param mask
 * @see banExceptionAdd
 * @see banExceptionExists
 */
channel.prototype.banExceptionRemove = function (mask) {
    this.ban_exceptions = this.ban_exceptions.filter(function (banSearch) {
        return mask.toLowerCase() !== banSearch;
    });
};

/**
 * Tests if a user has a certain mode on the channel
 * @param user {user}
 * @param modeQuery {String}
 * @returns {boolean}
 * @see userIsOp
 * @see userIsHalfOp
 * @see userIsVoice
 */
channel.prototype.userHasMode = function (user, modeQuery) {
    if (this.hasUser(user) === false) {
        return false;
    }

    var foundUser = this.users[user.numeric];
    var splitModes = foundUser.mode.split('');
    return (splitModes.indexOf(modeQuery) !== -1);
};

/**
 * Tests if a user is op on the channel
 * @param user {user}
 * @returns {boolean}
 * @see userHasMode
 */
channel.prototype.userIsOp = function (user) {
    return this.userHasMode(user, 'o');
};
/**
 * Checks to see if a user is half-op on the channel
 * @param user {user}
 * @returns {boolean}
 * @see userHasMode
 */
channel.prototype.userIsHalfOp = function (user) {
    return this.userHasMode(user, 'h');
};

/**
 * Checks to see if the user is a voice on the channel
 * @param user {user}
 * @returns {boolean}
 * @see userHasMode
 */
channel.prototype.userIsVoice = function (user) {
    return this.userHasMode(user, 'v');
};

/**
 * Internally registers a user as a member of the channel
 * @param user {user} Targeted user
 * @param modes {String} The channel-modes that was applied to the user
 */
channel.prototype.userJoin = function (user, modes) {
    modes = (modes === undefined ? '' : modes);

    this.users[user.numeric] = {'user': user, 'mode': modes};
    user.channels[this.nameSafe] = {channel: this, mode: modes};
};

/**
 * Internally deregisters a user as a member of the channel
 * @param user {user}
 */
channel.prototype.userPart = function (user) {
    delete this.users[user.numeric];
    delete user.channels[this.nameSafe];
};

/**
 * Tests if a user with a specified numeric is a member of the channel
 * @param numeric {String}
 * @returns {boolean}
 */
channel.prototype.hasUserNumeric = function (numeric) {
    return (this.users[numeric] !== undefined);
};

/**
 * Tests if a user object is a member of the channel
 * @param user {user}
 * @returns {boolean}
 */
channel.prototype.hasUser = function (user) {
    for (var key in this.users) {
        if (key === user.numeric) {
            return true;
        }
    }
    return false;
};

/**
 * Tests if the channel has a certain mode set
 * @param modeQuery {String}
 * @returns {boolean}
 */
channel.prototype.hasMode = function (modeQuery) {
    return (this.modes.split('').indexOf(modeQuery) !== -1);
};

/**
 * Retrieves the parameter value of a specified mode
 *
 * Returns false if the channel does not have this param-mode set
 * @param modeQuery
 * @returns {String|Boolean}
 */
channel.prototype.getParameterModeValue = function (modeQuery) {
    if (!this.hasMode(modeQuery) || typeof this.modeParams[modeQuery] !== "string") {
        return false;
    }

    return this.modeParams[modeQuery];
};

/**
 * Tests if the channel has mode +m
 * @returns {boolean}
 */
channel.prototype.isModerated = function () {
    return this.hasMode('m');
};

/**
 * Tests if the channel has mode +r
 * @returns {boolean}
 */
channel.prototype.isRegistered = function () {
    return this.hasMode('r');
};

/**
 * Tests if the channel has mode +i
 * @returns {boolean}
 */
channel.prototype.isInviteOnly = function () {
    return this.hasMode('i');
};

/**
 * Tests if the channel has mode +s
 * @returns {boolean}
 */
channel.prototype.isSecret = function () {
    return this.hasMode('s');
};

/**
 * Tests if the channel has mode +z
 *
 * If true, that means channel can be empty without being destroyed.
 * @returns {boolean}
 */
channel.prototype.isPersisted = function () {
    return this.hasMode('z');
}

/**
 * Tests if the channel has mode +p
 * @returns {boolean}
 */
channel.prototype.isPrivate = function () {
    return this.hasMode('p');
};

/**
 * Tests if the channel has mode +n
 * @returns {boolean}
 */
channel.prototype.isNoExternalMsg = function () {
    return this.hasMode('n');
};

/**
 * Tests if the channel has mode +t
 * @returns {boolean}
 */
channel.prototype.isTopisSetByOps = function () {
    return this.hasMode('t');
};

/**
 * Tests if the channel has mode +k
 * @returns {boolean}
 */
channel.prototype.isKeyed = function () {
    return this.hasMode('k');
};

/**
 * Tests if the channel has mode +l
 * @returns {boolean}
 */
channel.prototype.isLimited = function () {
    return this.hasMode('l');
};
/**
 * Tests if the channel has mode +L
 * @returns {boolean}
 */
channel.prototype.isRedirected = function () {
    return this.hasMode('L');
};

/**
 * Retrieves the channel's key. If it does not have one set, false is returned
 * @returns {String|Boolean}
 * @see isKeyed
 */
channel.prototype.getChannelKey = function () {
    if (!this.isKeyed()) {
        return false;
    }

    return this.getParameterModeValue('k');
};
/**
 * Retrieves the channel's limit. If it does not have one set, false is returned
 * @returns {String|Boolean}
 * @see isLimited
 */
channel.prototype.getChannelLimit = function () {
    if (!this.isLimited()) {
        return false;
    }

    var value = this.getParameterModeValue('l');

    return (value != false ? parseInt(value) : false);
};

/**
 * Retrieves the channel's overflow target. If it does not have one set, false is returned
 * @returns {String|Boolean}
 * @see isRedirected
 */
channel.prototype.getChannelOverflowTarget = function () {
    return (this.isRedirected() ? this.getParameterModeValue('L') : false);
};


/**
 * An instance of a channel
 * @module channel
 */
module.exports = channel;