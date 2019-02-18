/**
 * Creates a user
 * @class
 * @param options
 * @constructor
 */
var user = function (options) {

    /**
     * Nickname of the user
     * @type {string}
     */
    this.nickname = options.nickname;
    /**
     * type {string}
     */
    this.numeric = options.numeric;
    /**
     * The "real name" of the user
     * @type {string}
     */
    this.GECOS = options.GECOS;
    /**
     * @type {string}
     */
    this.ident = options.ident;
    /**
     * @type {*|string|string}
     */
    this.host = options.host;
    this.fakehost = (options.fakehost !== null && options.fakehost !== undefined ? options.fakehost : options.host);
    this.account = options.account;
    this.usermodes = options.usermodes;
    this.usermodes_params = (options.usermodes_params !== undefined ? options.usermodes_params : []);
    this.swhois = '';

    this.isPseudo = false;

    /**
     * List of channels the user is a member of
     * @type {Array}
     */
    this.channels = [];
    /**
     * List of privileges user is assigned by server
     * @type {Array}
     */
    this.privs = [];
};

/**
 * Returns the numeric, which is used in protocol messages as a target
 * @returns {string}
 */
user.prototype.getTargetString = function () {
    return this.numeric;
};

/**
 * Adds a privilege to the user that has been assigned by their server (Example: when they oper up)
 * @param privName {String}
 * @return user
 */
user.prototype.addPriv = function (privName) {
    this.privs[this.privs.length] = privName;
    return this;
};

/**
 * Checks to see if the user has a privilege that was assigned to them
 * @param privName
 * @returns {boolean}
 * @see addPriv
 */
user.prototype.hasPriv = function (privName) {
    for (var x in this.privs) {
        if (this.privs[x] == privName) {
            return true;
        }
    }

    return false;
};

/**
 * Deletes a privilege (assigned by server) from the user
 * @param privName {string}
 * @returns {user}
 */
user.prototype.deletePriv = function (privName) {
    this.privs = this.privs.filter(function (privSearch) {
        return privSearch !== privName;
    });

    return this;
};


/**
 * Determines if the user has a specified mode set
 * @param mode {string}
 * @returns {boolean}
 */
user.prototype.hasMode = function (mode) {
    if (this.usermodes === null || this.usermodes === 'undefined') {
        return false;
    }
    var modeSplit = this.usermodes.split('');

    return (modeSplit.indexOf(mode) != -1);
};

/**
 * Returns an array (rather than an object) of the channel objects of which the member is a member
 * @returns {Array}
 */
user.prototype.chanListArray = function () {
    var returnArr = [];
    for (var key in this.channels) {
        returnArr[returnArr.length] = key;
    }
    return returnArr;
};

/**
 * Tests if the user possesses the 'o' user mode
 * @returns {boolean}
 */
user.prototype.isOper = function () {
    return this.hasMode('o');
};

/**
 * Tests if the user possesses the 'a' user mode
 * @returns {boolean}
 */
user.prototype.isIRCAdmin = function () {
    return this.hasMode('a');
};

/**
 * Tests if the user possesses the 'k' user mode
 * @returns {boolean}
 */
user.prototype.isService = function () {
    return this.hasMode('k');
};
/**
 * Tests if the user possesses the 'X' user mode
 * @returns {boolean}
 */
user.prototype.isXtraOp = function () {
    return this.hasMode('X');
};
/**
 * Tests if the user possesses the 'H' user mode
 * @returns {boolean}
 */
user.prototype.isHiddenOper = function () {
    return this.hasMode('H');
};

/**
 * Tests if the user possesses the 'x' user mode
 * @returns {boolean}
 */
user.prototype.isHostmaskCloaked = function () {
    return this.hasMode('x');
}

/**
 * Removes user from all channels
 */
user.prototype.quit = function () {
    for (var key in this.channels) {
        this.channels[key].userPart(this);
    }
};

/**
 * @module user
 * @type {user}
 */
module.exports = user;