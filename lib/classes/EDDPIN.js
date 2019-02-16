var util = require('util');
var EventMgr = require("./eventRegister.js");

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

EDDPIN.prototype.getTimestampUTC = function () {
    var d1 = new Date();
    d1.toUTCString();
    //    "Sun, 18 Mar 2012 05:50:34 GMT" // two hours less than my local time, that makes sense
    return Math.floor(d1.getTime() / 1000);
};

EDDPIN.prototype.write = function (data) {
    if (this.socket !== null) {
        this.socket.write(data + "\r\n");
        console.log("-> " + data);
    }
};

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

EDDPIN.prototype.loadModule_group = function (group) {
    var list = this.config.modules[group];
    if (typeof list !== 'object') {
        throw new TypeError();
    }
    for (var key in list) {
        this.loadModule(list[key]);
    }

}

EDDPIN.prototype.loadModule = function (moduleName) {
    var proposedPath = '../../modules/' + moduleName + '/' + moduleName + '.js';

    console.log('Attempting to load module %s from %s', moduleName, moduleName);
    var moduleStructure = require(proposedPath);
    var module = new moduleStructure(this);

    var events;
    var moduleSignature = this.getModuleGUID(module);
    var finalToken;
    var finalCallback;
    var eventToken;
    if (typeof module.onLoad == "function") {
        module.moduleSignature = moduleSignature;
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
                    console.log("MODULE:%s lazy-binding to event %s", moduleName, eventToken);
                } else {
                    console.warn('Lazy-Bind value for %s:%s must be a callback function but is %s, ignoring.', moduleName, eventToken, typeof module[finalToken]);
                }
            }
        }
        this.modules[module.biography.name] = module;
    }

};

EDDPIN.prototype.isChannel = function (stringTest) {
    return (stringTest.substr(0, 1) === '#');
};

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

EDDPIN.prototype.separateChannelModes = function (modeList) {
    var paramModeFlags = ['o', 'h', 'v', 'k', 'l', 'L', 'b', 'e'];
//<- ABAAK M #vico +mvv ABAAM ABAAL 1399900275
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
        if (paramModeFlags.indexOf(cursor) !== -1) { // this mode is a mode that affects a user, we'll handle this later, for now filter it
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

EDDPIN.prototype.serverWrite = function (data) {
    this.write(this.serverNumeric + " " + data);
};
EDDPIN.prototype.pong = function () {
    this.serverWrite('Z ' + this.getTimestampUTC());
};
EDDPIN.prototype.getServerByNumeric = function (numeric) {
    return (this.servers[numeric] !== undefined && this.servers[numeric] !== null ? this.servers[numeric] : null);
};

EDDPIN.prototype.getUserByNumeric = function (numeric) {
    return (this.users[numeric] !== undefined && this.users[numeric] !== null ? this.users[numeric] : null);
};

EDDPIN.prototype.getUserByNickname = function (nickname) {
    return (this.usersNickname[nickname] !== undefined && this.usersNickname[nickname] !== null ? this.usersNickname[nickname]: null);
};

EDDPIN.prototype.getChannelbyName = function (name) {
    var key;
    for (key in this.channels) {
        if (key.toLowerCase() === name.toLowerCase()) {
            return this.channels[key];
        }
    }
    return false;
};

EDDPIN.prototype.getServerByName = function (name) {
    var key;
    for (key in this.servers) {
        if (this.servers[key].name.toLowerCase() === name.toLowerCase()) {
            return this.servers[key];
        }
    }
    return false;
};

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

EDDPIN.prototype.getPseudoUserNumerics = function () {
    return Object.keys(this.myUsers);
}
/**
 * Converts a number to a sequencing string
 * @param num int The number to be converted into string
 * @param length int 2 or 3
 * @return string
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
EDDPIN.prototype.generateNumeric = function () {
    return this.serverNumeric + this.sequence2CharString(Object.keys(this.myUsers).length, 3);
};

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

EDDPIN.prototype.stringFinder = function (msgString) {
    return msgString.split(" :", 2)[1];
};

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
    // stuff that's likely to be used in below event parsings:
    var description;
    var name;
    var numeric;
    var server;
    var channel;
    var foundUser;
    var user;
    var victim;

    var x;
    var protoMessage = {};

    for (x = 0; x < incomingData.length; x++) {
        emittedString = incomingData[x];
        stringlessEmitted = emittedString.split(" :", 1)[0];
        console.log("<- " + emittedString);

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

EDDPIN.prototype.start = function () {
    this.socket = new this.net.Socket();
    var core = this;
    core.loadModule_group('appInit');

    this.socket.connect(core.config.uplink.port, core.config.uplink.server,
        function () {
            console.log("Connected!");
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
        console.log("Disconnected!");

        core.event.trigger('uplinkDisconnected');
    });
};

module.exports = EDDPIN;