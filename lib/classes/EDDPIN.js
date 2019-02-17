var util = require('util');
var colors = require('colors');
var EventMgr = require("./eventRegister.js");

/**
 * Sets up this application
 * @param config
 * @constructor
 */
var EDDPIN = function (config) {
    this.config = config;
    this.serverNumeric = this.sequence2CharString(this.config.me.numeric, 2);
    this.generic = {};
    this.generic.user = require('./user.js');
    this.generic.pseudouser = require('./pseudouserObject.js');
    this.generic.event = require('./eventObject.js');
    this.generic.server = require('./serverObject.js');
    this.generic.channel = require('./channelObject.js');
    this.generic.parser = require('./parser.js');

    this.servers = [];
    this.users = [];
    this.usersNickname = [];
    this.myUsers = [];
    this.channels = [];
    this.modules = [];

    this.net = require('net');
    this.socket = null;
    this.port = 6660;
    this.callback = {};
    this.event = new EventMgr();
    this.parser = new this.generic.parser(this);
    this.inBurst = true;
};

/**
 * Gets the current timestamp in UTC
 * @returns {number}
 */
EDDPIN.prototype.getTimestampUTC = function () {
    var d1 = new Date();
    d1.toUTCString();
    //    "Sun, 18 Mar 2012 05:50:34 GMT" // two hours less than my local time, that makes sense
    return Math.floor(d1.getTime() / 1000);
};

/**
 * Writes a raw string to the socket. This does not send the server numeric.
 * @param data {String} Text to be written to socket
 * @see serverWrite
 */
EDDPIN.prototype.write = function (data) {
    if (this.socket !== null) {
        this.socket.write(data + "\r\n");
        this.logger.log("-> ".cyan + this.highlightProtocolString(data));
    }
};

/**
 * Generates a quick GUID for the module based off its bio field.
 *
 * This is to create a unique textual reference point of a module, in the event there are multiple modules with the same name
 *
 * (Which probably isn't a good idea anyway, nor is likely not even possible)
 * @param module {moduleObject}
 * @returns {String}
 */
EDDPIN.prototype.getModuleGUID = function (module) {
    var crypto = require('crypto');
    var shaSum = crypto.createHash('sha1');
    var GUIDFields = ['title', 'description', 'author', 'version'];
    var preGUID = '';
    var x;

    for (x = 0; x < GUIDFields.length; x++) {
        preGUID = preGUID + (module.biography[GUIDFields.x] !== undefined ? module.biography[GUIDFields.x] : '');
    }

    shaSum.update(preGUID);

    return shaSum.digest('hex');
};

/**
 * Loads a named list of modules. This list is the keyname found in {config.modules}
 *
 * @param group {String}
 * @see loadModule
 */
EDDPIN.prototype.loadModule_group = function (group) {
    this.logger.info("Loading module group %s", group.green.underline);
    var list = this.config.modules[group];
    if (typeof list !== 'object') {
        throw new TypeError();
    }
    for (var key in list) {
        this.loadModule(list[key]);
    }
    this.logger.info("Finished loading module group %s", group.green.underline);

}

/**
 * Loads a module and automatically bind any of its lazy-binds (Those defined in the module's events property)
 * @param moduleName {String}
 * @see loadModule_group
 */

EDDPIN.prototype.loadModule = function (moduleName) {
    var logger = require('./logger.js');
    var proposedPath = '../../modules/' + moduleName + '/' + moduleName + '.js';

    logger.info('Attempting to load module %s from %s', moduleName, moduleName);
    var moduleStructure = require(proposedPath);
    var module = new moduleStructure(this);

    var events;
    var moduleSignature = this.getModuleGUID(module);
    var finalToken;
    var finalCallback;
    var eventToken;

    module.moduleSignature = moduleSignature;
    module.moduleName = moduleName;

    if (typeof module.onLoad == "function") {
        module.onLoad(this);

        //Bind events now:
        if (typeof module.events === "object") {
            events = module.events;
            for (eventToken in events) {
                finalToken = events[eventToken];

                // Check if this is a valid callback
                if (typeof module[finalToken] == "function") {
                    finalCallback = module[finalToken];
                    this.event.listen(eventToken, module, finalCallback);
                    logger.info("MODULE:".green + " Creating Lazy-Binding to event %s:%s", moduleName.cyan.bold, eventToken.bold.underline.red);
                } else {
                    logger.warn('Lazy-Bind value for %s:%s must be a callback function but is %s, ignoring.', moduleName.cyan.bold, eventToken.bold.underline.red, (typeof module[finalToken]).yellow.italic);
                }
            }
        }
    }

    this.modules[moduleSignature] = module;
};

/**
 * Tests if a string starts with '#'
 * @param stringTest {String}
 * @returns {boolean}
 */
EDDPIN.prototype.isChannel = function (stringTest) {
    return (stringTest.substr(0, 1) === '#');
};
/**
 * Returns the changes listed in modeAdjustment to oldModes
 * @param oldModes {String}
 * @param modeAdjustment {String}
 * @returns {{added: string, removed: string, final: string}}
 */
EDDPIN.prototype.resolveModes = function (oldModes, modeAdjustment) {
    var addMode = true;
    var currentMode = oldModes.split('');
    var newModes = currentMode;
    var adjustModes = modeAdjustment.split('');
    var cursor;
    var modePosition;
    var x;
    var returnObj = {added: '', removed: '', final: ''};

    for (x = 0; x < adjustModes.length; x++) {
        cursor = adjustModes[x];
        if (cursor === '+') {
            addMode = true; // We don't know if this is going to be in the middle of the string after a - for whatever reason
        } else if (cursor === '-') {
            addMode = false;
        } else {
            if (addMode === true) {
                //don't add it if the mode is already there
                if (newModes.indexOf(cursor) === -1) {
                    newModes.push(cursor);
                    returnObj.added += cursor;
                }
            } else {
                modePosition = newModes.indexOf(cursor);
                if (modePosition !== -1) {
                    newModes.splice(modePosition, 1);
                    returnObj.removed += cursor;
                }
            }
        }
    }

    newModes.sort();
    returnObj.final = newModes.join('');

    return returnObj;
};

/**
 *
 * @param modeList {String}
 * @returns {{channelModes: string, paramModes: string}|*}
 */
EDDPIN.prototype.seperateUserModes = function (modeList) {
    var paramModeFlags = ['r', 'f', 'h', 'C', 'c'];
    return this.separateParamModes(modeList, paramModeFlags);
};
/**
 *
 * @param modeList {String}
 * @returns {{channelModes: string, paramModes: string}|*}
 * @see separateParamModes
 */
EDDPIN.prototype.separateChannelModes = function (modeList) {
    var paramModeFlags = ['o', 'h', 'v', 'k', 'l', 'L', 'b', 'e'];
    return this.separateParamModes(modeList, paramModeFlags);
};
/**
 * Takes a list of modes returns an object that separates regular modes from parameter'able modes
 * @param modeList {String}
 * @param paramList {Array} List of modes that contain parameters
 * @returns {{channelModes: string, paramModes: string}|*}
 * @see {separateChannelModes}
 * @see {separateUserModes}
 */
EDDPIN.prototype.separateParamModes = function (modeList, paramList) {
    var newSplit = modeList.split('');
    var newSplit_changes = modeList.split('');
    var newParamModes = '';
    var cursorMarked = {'+': false, '-': false};

    var x;
    var cursor;
    var currentOp = '+';

    var returnObj;

    for (x = 0; x < newSplit.length; x++) {
        // we need to determine if this is a mode that affects users or just the channel
        cursor = newSplit[x];
        currentOp = (cursor === '+' || cursor === '-' ? cursor : currentOp);
        if (paramList.indexOf(cursor) !== -1) { // this mode is a mode that affects a user, we'll handle this later, for now filter it
            if (cursorMarked[currentOp] !== true) {
                newParamModes += currentOp;
                cursorMarked[currentOp] = true;
            }
            newParamModes += cursor;
            newSplit_changes.splice(newSplit_changes.indexOf(cursor), 1);
        }
    }

    returnObj = {channelModes: newSplit_changes.join(''), paramModes: newParamModes};

    return returnObj;
};
/**
 * Writes a string to the socket, prefixed with the server numeric
 * @param data {String}
 */
EDDPIN.prototype.serverWrite = function (data) {
    this.write(this.serverNumeric + " " + data);
};
/**
 * Sends a Ping reply to the uplink.
 */
EDDPIN.prototype.pong = function () {
    this.serverWrite('Z ' + this.getTimestampUTC());
};

/**
 * Returns the server object that matches the specified numeric.
 *
 * If the numeric does not exist, it returns null
 * @param numeric {String}
 * @returns {serverObject|null}
 */
EDDPIN.prototype.getServerByNumeric = function (numeric) {
    return (this.servers[numeric] !== undefined && this.servers[numeric] !== null ? this.servers[numeric] : null);
};

/**
 * Returns a user object based off numeric.
 *
 * If numeric does not exist, it returns null
 *
 * Does not currently work with psuedo-user numerics
 * @param numeric {String}
 * @returns {user|null}
 * @see getUserByNickname
 */
EDDPIN.prototype.getUserByNumeric = function (numeric) {
    return (this.users[numeric] !== undefined && this.users[numeric] !== null ? this.users[numeric] : null);
};

/**
 * Returns a user object based off nickname.
 *
 * If nickname does not exist, it returns null
 *
 * Does not currently work with psuedo-user nickname
 * @param nickname {String}
 * @returns {user|null}
 * @see getUserByNumeric
 */
EDDPIN.prototype.getUserByNickname = function (nickname) {
    return (this.usersNickname[nickname] !== undefined && this.usersNickname[nickname] !== null ? this.usersNickname[nickname]: null);
};

/**
 * Returns a channel object based off its name
 * @param name {String}
 * @returns {channel|null}
 */
EDDPIN.prototype.getChannelbyName = function (name) {
    var key;
    for (key in this.channels) {
        if (key.toLowerCase() === name.toLowerCase()) {
            return this.channels[key];
        }
    }
    return false;
};

/**
 * Returns a server object based off its name
 *
 * Returns null if a result cannot be found
 * @param name
 * @returns {serverObject}
 */
EDDPIN.prototype.getServerByName = function (name) {
    var key;
    for (key in this.servers) {
        if (this.servers[key].name.toLowerCase() === name.toLowerCase()) {
            return this.servers[key];
        }
    }
    return null;
};

/**
 * Removes a channel from the core.
 * @param {channel} channel
 */
EDDPIN.prototype.destroyChannel = function (channel) {
    //remove all references from this channel's users (this should already be done, but just in case.)
    var users = channel.users;
    var workingUser;
    var foundChannel;
    var name = channel.name;
    var key;
    var channelKey;
    for (key in users) {
        workingUser = users[key];

        for (channelKey in workingUser.channels) {
            foundChannel = workingUser.channels[channelKey];
            if (foundChannel.name === name) {
                delete workingUser.channels[channelKey];
            }
        }
    }

    //remove reference from core
    delete this.channels[name];
};

/**
 * Returns a list of internally-created users
 * @returns {Array}
 */
EDDPIN.prototype.getPseudoUserNumerics = function () {
    return Object.keys(this.myUsers);
}
/**
 * Converts a number to a sequencing string
 * @param num {Number} The number to be converted into string
 * @param length {Number} 2 or 3
 * @return {String}
 */
EDDPIN.prototype.sequence2CharString = function (num, length) {
    var chrList = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789[]";
    var chrSplit = chrList.split("");
    var offsetX = 0, offsetY= 0, offsetZ = 0;
    var index = 0;
    var returnStr = "";

    if (length !== 2 && length !== 3) {
        throw new RangeError("Argument length must be exactly 2 or 3");
    }
    if (Number.isInteger(num) == false) {
        throw new TypeError("Argument num must be an integer");
    }

    while (index < num) {
        offsetZ++;

        if (offsetZ == chrSplit.length) {
            offsetZ = 0;
            offsetY++;

            if (offsetY == chrSplit.length) {

                if (length == 3) {
                    offsetY = 0;
                    offsetX++;
                    // Maximum number reached
                    if (offsetX == chrSplit.length) {
                        throw new Error("Overflow Exception");
                    }
                } else {
                    throw new Error("Overflow Exception");
                }
            }
        }

        index++;
    }

    if (length == 3) {
        returnStr = chrSplit[offsetX] + chrSplit[offsetY] + chrSplit[offsetZ];
    } else {
        returnStr = chrSplit[offsetY] + chrSplit[offsetZ];
    }
    return returnStr;
};

/**
 * Generates a nicknum to be used in creation of a pseudo user, based on number of current number of pseudo users
 * @returns {String}
 * @see createPseudoUser
 */
EDDPIN.prototype.generateNumeric = function () {
    return this.serverNumeric + this.sequence2CharString(Object.keys(this.myUsers).length, 3);
};

/**
 * Creates a new pseudo user, attached to a module
 * @param module {moduleObject} The module to attach this pseudo user to
 * @param optionsObj {Object} The biographical information about the user
 * @returns {pseudouserObject} Object instance of the user created
 */
EDDPIN.prototype.createPseudoUser = function (module, optionsObj) {
    var numeric = this.generateNumeric();

    optionsObj.numeric = numeric;
    optionsObj.parentModule = module;
    optionsObj.core = this;

    var created = new this.generic.pseudouser(optionsObj);

   // Add to core's list so we can track what user's we own
    this.myUsers[numeric] = created;
    this.users[numeric] = created;
    if (module.myUsers === undefined) {
        module.myUsers = [];
    }
    module.myUsers[numeric] = created;

    // Tell the uplink we have a user
    created.announce();

    return created;
};

/**
 * Removes a user from the core
 * @param user
 */
EDDPIN.prototype.destroyUser = function (user) {

    //remove the user from all channel objects he previously belonged to
    var channels = user.channels;
    var workingChannel;
    var numeric = user.numeric;
    var nickname = user.nickname;
    var key;
    for (key in channels) {
        workingChannel = channels[key].channel;
        workingChannel.userPart(user);

        // did we just empty this channel?
        // if so, we gotta delete it to keep memory usage low
        if (workingChannel.membershipCount() === 0) {
            this.destroyChannel(workingChannel);
        }
    }

    // remove reference from core
    delete this.users[numeric];
    delete this.usersNickname[nickname];
};

EDDPIN.prototype.logger = require('./logger.js');
EDDPIN.prototype.highlightProtocolString = function (originalString) {
    // Make the string
    var newString = originalString.split(" :");
    var token = '';

    if (typeof newString[1] == "string") {
        newString[1] = newString[1].bgWhite.blue;
    }
    newString = newString.join(" :");

    newString = newString.split(" ");

    // highlight the token; its placement is different depending if we're in a burst.
    if (newString[0] == "PASS" | newString[0] == "SERVER") {
        newString[0] = newString[0].bold.magenta;
        token = newString[0];
    } else {
        // Server Numerics vs user numerics
        if (newString[0].length == 2) {
            if (newString[0] == this.serverNumeric) {
                newString[0] = newString[0].bold.cyan.underline + "\t";
            } else {
                newString[0] = newString[0].bold.green + "\t";
            }
        } else {
            if (this.myUsers[newString[0]] !== undefined) {
                newString[0] = newString[0].red.italic;
            } else {
                newString[0] = newString[0].bold.blue;
            }
        }
        token = newString[1];
        newString[1] = newString[1].magenta + "\t";

        if (newString.length > 2) {
            // Target
            if (this.isChannel(newString[2])) {
                newString[2] = newString[2].underline.blue;
            } else if (this.getUserByNumeric(newString[2] || this.myUsers[newString[3]] !== undefined) !== null) {
                newString[2] = newString[2].black.bgYellow;
            } else if (this.getUserByNickname(newString[2]) instanceof this.generic.user || token === 'N') {
                newString[2] = newString[2].yellow;
            }
        }
    }

    newString = newString.join(" ");

    return newString;
}

/**
 * Gets the 'string' value for a parameter message
 * @param msgString
 * @returns {String}
 * @see parse
 */
EDDPIN.prototype.stringFinder = function (msgString) {
    return msgString.split(" :", 2)[1];
};

/**
 * Parses data from the socket
 * @param data
 */
EDDPIN.prototype.parse = function (data) {
    var incomingData = data.toString().trim().split("\r\n");
    var emittedString = null;
    var core = this;
    var spaceDelimited;
    var token;
    var string = '';
    var stringlessEmitted;
    var stringlessSplit;
    var originatingServer;
    var eventObj;
    var x;

    for (x = 0; x < incomingData.length; x++) {
        emittedString = incomingData[x];
        stringlessEmitted = emittedString.split(" :", 1)[0];
        this.logger.log("<- ".yellow + this.highlightProtocolString(emittedString));
        spaceDelimited = emittedString.split(" ");
        stringlessSplit = stringlessEmitted.split(" ");

        token = (Object.keys(this.servers).length === 0 ? spaceDelimited[0] : spaceDelimited[1]);
        string = core.stringFinder(emittedString);
        eventObj = new core.generic.event();

        eventObj.raw = {
            full: emittedString,
            stringless: stringlessEmitted,
            string: string
        };
        originatingServer = spaceDelimited[0];

        var parseData = {
            originatingServer: originatingServer,
            emittedString: emittedString,
            stringlessEmitted: stringlessEmitted,
            spaceDelimited: spaceDelimited,
            stringlessSplit: stringlessSplit,
            token: token,
            string: string,
            eventObj: eventObj
        };

        this.parser.parse(parseData);
    }
};

/**
 * Initializes the application
 */
EDDPIN.prototype.start = function () {
    this.socket = new this.net.Socket();
    var core = this;
    core.loadModule_group('appInit');

    this.socket.connect(core.config.uplink.port, core.config.uplink.server,
        function () {
            console.log("Connected!".green.bold);
            core.loadModule_group('uponUplinkConnection');
            var sendString = util.format("SERVER %s 1 %s %s J10 %s 0 :%s", core.config.me.serverName, core.getTimestampUTC(), core.getTimestampUTC(), core.serverNumeric+']]]', core.config.me.description);
            core.write("PASS :" + core.config.uplink.password);
            core.write(sendString);
            core.serverWrite('EB');

            core.loadModule_group('uponUplinkConnection_Registration');
        }
    );
    this.socket.on("data", function (data) {
        //   var incomingData = data.toString().trim().split("\r\n");
        core.parse(data);

    });
    this.socket.on("close", function () {
        console.log("Disconnected!".bold);

        core.event.trigger('uplinkDisconnected');
    });
};

module.exports = EDDPIN;