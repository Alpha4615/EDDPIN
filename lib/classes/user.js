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
    this.swhois = '';

    this.isPseudo = false;

    /**
     * List of channels the user is a member of
     * @type {Array}
     */
    this.channels = [];
};

/**
 * Returns the numeric, which is used in protocol messages as a target
 * @returns {string}
 */
user.prototype.getTargetString = function () {
    return this.numeric;
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