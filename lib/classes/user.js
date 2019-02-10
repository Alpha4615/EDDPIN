var user = function (options, nickname, numeric, GECOS, ident, host, fakehost, account, usermodes) {

    this.nickname = options.nickname;
    this.numeric = options.numeric;
    this.GECOS = options.GECOS;
    this.ident = options.ident;
    this.host = options.host;
    this.fakehost = (options.fakehost !== null && options.fakehost !== undefined ? options.fakehost : host);
    this.account = options.account;
    this.usermodes = options.usermodes;
    this.swhois = '';

    this.isPseudo = false;

    this.channels = [];
};

user.prototype.hasMode = function (mode) {
    if (this.usermodes === null || this.usermodes === 'undefined') {
        return false;
    }
    var modeSplit = this.usermodes.split('');

    return (modeSplit.indexOf(mode) != -1);
};

user.prototype.isOper = function () {
    return this.hasMode('o');
};

user.prototype.isIRCAdmin = function () {
    return this.hasMode('a');
};
user.prototype.isService = function () {
    return this.hasMode('k');
};
user.prototype.isXtraOp = function () {
    return this.hasMode('X');
};
user.prototype.isHiddenOper = function () {
    return this.hasMode('H');
};

user.prototype.isHostmaskCloaked = function () {
    return this.hasMode('x');
}

user.prototype.quit = function () {
    for (var key in this.channels) {
        this.channels[key].userPart(this);
    }

    console.log(this.channels);
};


module.exports = user;