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

    this.servers = [];
    this.users = [];
    this.myUsers = [];
    this.channels = [];
    this.modules = [];

    this.net = require('net');
    this.socket = null;
    this.port = 6660;
    this.callback = {};
    this.event = new EventMgr();
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

EDDPIN.prototype.loadModule = function (moduleName) {
    var proposedPath = '../../modules/' + moduleName + '/' + moduleName + '.js';

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

                if (typeof module[finalToken] == "function") {
                    finalCallback = module[finalToken];
                    this.event.listen(eventToken, module, finalCallback);
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
                }
            } else {
                modePosition = newModes.indexOf(cursor);
                if (modePosition !== -1) {
                    newModes.splice(modePosition, 1);
                }
            }
        }
    }

    newModes.sort();
    return newModes.join('');
};

EDDPIN.prototype.separateChannelModes = function (modeList) {
    var paramModeFlags = ['o', 'v', 'k', 'l'];
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
    var key;
    for (key in this.users) {
        if (this.users.hasOwnProperty(key) && this.users[key].nickname.toLowerCase() === nickname.toLowerCase()) {
            return this.users[key];
        }
    }

    return false;
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
};

EDDPIN.prototype.stringFinder = function (msgString) {
    return msgString.split(":", 2)[1];
};

EDDPIN.prototype.start = function () {
    this.socket = new this.net.Socket();
    var core = this;

    this.socket.connect(core.config.uplink.port, core.config.uplink.server,
        function () {
            console.log("Connected!");
            var sendString = util.format("SERVER %s 1 %s %s J10 %s 0 :%s", core.config.me.serverName, core.getTimestampUTC(), core.getTimestampUTC(), core.serverNumeric+']]]', core.config.me.description);
            core.write("PASS :" + core.config.uplink.password);
            core.write(sendString);
            core.serverWrite('EB');

            core.loadModule('testModule');
        }
    );
    this.socket.on("data", function (data) {
        var incomingData = data.toString().trim().split("\r\n");
        var emittedString = null;
        var spaceDelimited;
        var token;
        var string = '';
        var stringlessEmitted;
        var stringlessSplit;
        var originatingServer;
        var eventObj = new core.generic.event();

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

        for (x = 0; x < incomingData.length; x++) {
            emittedString = incomingData[x];
            stringlessEmitted = emittedString.split(" :", 1)[0];
            console.log("<- " + emittedString);

            spaceDelimited = emittedString.split(" ");
            stringlessSplit = stringlessEmitted.split(" ");

            token = spaceDelimited[1];
            string = core.stringFinder(emittedString);
            eventObj.raw = {
                full: emittedString,
                stringless: stringlessEmitted,
                string: string
            };
            originatingServer = spaceDelimited[0];

            // If it's SERVER (instead of S) it's our uplink server
            if (spaceDelimited[0] === 'SERVER') {
                description = string;
                name = spaceDelimited[1];
                numeric = spaceDelimited[6].substring(0, 2);
                server = new core.generic.server(name, numeric, description);

                server.uplinkServer = true;
                core.servers[numeric] = server;

                eventObj.data.server = server;
                core.event.trigger('uplinkConnected', eventObj);
            }
            // new server connecting to network
            if (token === 'S') {
                description = string;
                name = spaceDelimited[2];
                numeric = spaceDelimited[7].substring(0, 2);
                server = new core.generic.server(name, numeric, description);
                core.servers[numeric] = server;

                eventObj.data.server = server;
                core.event.trigger('serverConnected', eventObj);
            } else if (token === 'N') { // new user connecting to network!
                server = core.getServerByNumeric(originatingServer);
                if (spaceDelimited.length === 4) { // this is a user changing their nickname!
                    var actor = core.getUserByNumeric(spaceDelimited[0]);
                    eventObj.actor = actor;
                    eventObj.data.oldNickname = actor.nickname;
                    actor.nickname = spaceDelimited[2];

                    core.event.trigger('userNicknameChange', eventObj);
                } else {
                    // oh my god, I am so so sorry
                    var regexPattern = /[A-Za-z0-9\[\]]{2} N ([^ ]+) [0-9] ([0-9]{10}) ([^ ]+) ([^ ]+) ?\+?(\w+)? ?(([^ ]+):([0-9]{10}) ?([^ ]+)?)? ([^ ]{6}) ([^ ]{5}) :(.*)/m;
                    var regexMatches = emittedString.match(regexPattern);

                    var userNumeric = regexMatches[11];
                    var optionsObject = {
                        numeric: regexMatches[11],
                        nickname: regexMatches[1],
                        GECOS: regexMatches[12],
                        ident: regexMatches[3],
                        host: regexMatches[4],
                        fakehost: regexMatches[9],
                        account: regexMatches[7],
                        usermodes: regexMatches[5]
                    };

                    var newUser = new core.generic.user(optionsObject);
                    core.users[userNumeric] = newUser;
                    server.addUser(newUser);

                    eventObj.actor = newUser;
                    eventObj.data.inBurst = core.inBurst;
                    core.event.trigger('newUser', eventObj);
                }

            } else if (token === 'B') { // channel introduced by netburst
                channel = new core.generic.channel();
                var workingUser;
                var userSplit;
                var modes;

                channel.name = spaceDelimited[2];
                channel.modes = (spaceDelimited.length > 5 ? spaceDelimited[4].substring(1) : '');

                core.channels[channel.name] = channel;

                //figure out the users
                // if the string contains no modes, everything is shifted over
                var delimitPosition = spaceDelimited.length - 1;
                var userRaw = spaceDelimited[delimitPosition].split(',');
                var userIndex;
                var workingModes = '';
                for (userIndex = 0; userIndex < userRaw.length; userIndex++) {
                    workingUser = userRaw[userIndex];
                    userSplit = workingUser.split(':');
                    numeric = userSplit[0];
                    modes = (userSplit[1] != null ? userSplit[1] : '');

                    //The BURST dataline is grouped by modes that user has, here is it explained by Jobe of Evilnet Development
                    /*
                     <@Jobe>he list of users is sorted so that users without modes are first, then they're grouped by what modes they have, where only the  first user in each grouping is listed with the modes
                     <@Jobe> eg
                     <@Jobe> A,B,C,D:v,E,F,G:o,H,I:ov,J
                     <@Jobe> A B and C dont have modes
                     <@Jobe> D E and F have +v
                     <@Jobe> G and H have +o
                     <@Jobe> I and J have +o and +v
                     */

                    //So with that in mind, we'll apply the usermodes from instruction until we get a new set of modes
                    if (modes !== workingModes && modes !== '') {
                        workingModes = modes;
                    }

                    foundUser = core.getUserByNumeric(numeric);
                    channel.userJoin(foundUser, workingModes);
                    eventObj.actor = foundUser;
                    eventObj.channel = channel;
                    core.event.trigger('join', eventObj);
                }
                core.event.trigger('channelBurst', eventObj);
            } else if (token === 'EB') { // end of burst (supposedly sync'd to network)
                core.inBurst = false;
                core.serverWrite('EA');
                core.event.trigger('EndOfBurst');
            } else if (token === 'G') { // ping from uplink
                core.pong();
                core.event.trigger('ping');
            } else if (token === 'J') { // user joining channel
                channel = core.getChannelbyName(spaceDelimited[2]);
                user = core.getUserByNumeric(spaceDelimited[0]);
                eventObj.channel = channel;
                eventObj.actor = user;
                channel.userJoin(user);

                core.event.trigger('join', eventObj);
            } else if (token === 'L') { // user parts channel
                channel = core.getChannelbyName(spaceDelimited[2]);
                user = core.getUserByNumeric(spaceDelimited[0]);
                channel.userPart(user);

                eventObj.actor = user;
                eventObj.channel = channel;
                eventObj.data.reason = string;

                core.event.trigger('part', eventObj);

                // if this channel is empty, we no longer have to keep track of it!
                // clear it from our memory
                if (channel.membershipCount() === 0) {
                    core.event.trigger('channelDestroyed', eventObj);
                    core.destroyChannel(channel);
                }


            } else if (token === 'C') { // user is creating a channel (first one to join it after emptied)
                channel = new core.generic.channel();
                channel.name = spaceDelimited[2];
                core.channels[channel.name] = channel;
                foundUser = core.getUserByNumeric(spaceDelimited[0]);
                channel.userJoin(foundUser, 'o'); // since they are the first one in the channel, they get +o automatically

                eventObj.actor = foundUser;
                eventObj.channel = channel;
                core.event.trigger('join', eventObj);
                core.event.trigger('channelCreated', eventObj);


            } else if (token === 'K') { // user kicks someone else

                channel = core.getChannelbyName(spaceDelimited[2]);
                actor = core.getUserByNumeric(spaceDelimited[0]);
                victim = core.getUserByNumeric(spaceDelimited[3]);

                eventObj.actor = actor;
                eventObj.victim = victim;
                eventObj.channel = channel;
                eventObj.data.reason = string;

                channel.userPart(victim);

                core.event.trigger('kick', eventObj);

                if (channel.membershipCount() === 0) {
                    core.destroyChannel(channel);
                }

            } else if (token === 'Q') { // user quitting the server
                var quitter = core.getUserByNumeric(spaceDelimited[0]);
                eventObj.actor = quitter;
                eventObj.data.reason = string;
                core.event.trigger('quit', eventObj);
                core.destroyUser(quitter);
            } else if (token === 'M') {
                var target = spaceDelimited[2];

                if (core.isChannel(target) === true) {
                    //handle mode changes to channel
                    var channel = core.getChannelbyName(target);
                    var modeList = spaceDelimited[3];
                    var separated = core.separateChannelModes(modeList);
                    var paramModes = separated.paramModes;
                    var finalChannelModes = core.resolveModes(channel.modes, separated.channelModes);
                    var oldModes = channel.modes;

                    var offset = 3;
                    var position = 0;
                    var x = 0;
                    var cursor;
                    var newKey;
                    var value;
                    var user;
                    var isUser;
                    channel.modes = finalChannelModes;

                    eventObj.channel = channel;
                    eventObj.actor = core.getUserByNumeric(spaceDelimited[0]);
                    if (separated.channelModes.length > 1) { //old modes seems to always have one of the operators on it, even if no channel-specific modes are applied
                        eventObj.data.oldModes = oldModes;
                        core.event.trigger('channelModeChange', eventObj);
                    }

                    //now we handle the param modes (+/- o/v/k/l)
                    for (x = 0; x < paramModes.length; x++) {
                        cursor = paramModes[x];
                        if (cursor !== '+' && cursor !== '-') {
                            position++;
                            newKey = offset + position;
                            value = spaceDelimited[newKey];
                            user = core.getUserByNumeric(value);
                            // could this be for a +k or +l ?
                            isUser = (user !== null && user !== false);

                            if (isUser === true) {
                                console.log(channel.users[value]);
                                console.log(cursor + " matches with " + spaceDelimited[newKey]);
                            }
                        }
                    }

                } else {
                    //user is changing another (their own? probably?) user mode
                    victim = core.getUserByNickname(target);
                    var actor = core.getUserByNumeric(spaceDelimited[0]);
                    var oldModes = (victim.usermodes !== undefined && victim.usermodes !== null ? victim.usermodes : '');
                    var newModeList = spaceDelimited[3];
                    var modeFinal = core.resolveModes(oldModes, newModeList);
                    victim.usermodes = modeFinal;

                    eventObj.actor = actor;
                    eventObj.victim = victim;
                    eventObj.data.oldModes = oldModes;
                    eventObj.data.modeDelta = newModeList;
                    eventObj.data.modeFinal = modeFinal;
                    core.event.trigger('userModeChange', eventObj);

                    // events for special mode changes
                    var finalSplit = modeFinal.split('');
                    if (finalSplit.indexOf('o') !== -1) {
                        core.event.trigger('operUp', eventObj);
                    }
                    if (finalSplit.indexOf('x') !== -1) {
                        core.event.trigger('ipNowHidden', eventObj);
                    }
                    if (finalSplit.indexOf('a') !== -1) {
                        core.event.trigger('ircAdminApplied', eventObj);
                    }
                }
            } else if (token === 'P') { // PRIV msg
                eventObj.actor = core.getUserByNumeric(spaceDelimited[0]);
                var target = spaceDelimited[2];
                eventObj.data.text = string;

                if (core.isChannel(target) === true) { // message sent to a channel (server will only see this if a pseudo user is on target channel)
                    eventObj.channel = core.getChannelbyName(spaceDelimited[2]);

                    core.event.trigger('messageChannel', eventObj);
                } else { // message sent a user (server will only see this if the pseudo user is the target)
                    eventObj.victim = core.getUserByNumeric(spaceDelimited[2]);

                    core.event.trigger('messageUser', eventObj)
                }

                //it's a little redundant but let's also trigger an event for any kind of message
                core.event.trigger('message', eventObj);
            } else if (token === 'AC') {
                var actor = core.getUserByNumeric(spaceDelimited[2]);
                var account = spaceDelimited[4];
                actor.account = account;
                eventObj.actor = account;
                core.event.trigger("accountAuth", eventObj);
            } else if (token === 'SW') {
                var actor = core.getUserByNumeric(spaceDelimited[2]);
                actor.swhois = string;
                eventObj.actor = actor;

                core.event.trigger('swhoisSet', eventObj);
            } else if (token === 'W') { // user is whoised
                var actor = core.getUserByNumeric(spaceDelimited[0]);
                var victim = core.getUserByNickname(string);

                core.serverWrite(util.format("%d %s %s %s %s * :%s", 311, actor.numeric, string, victim.ident, victim.host, victim.GECOS));
                core.serverWrite(util.format("%d %s %s :%s", 319, actor.numeric, string, victim.chanListArray().join(" ")));
                core.serverWrite(util.format("%d %s %s :%s", 318, actor.numeric, string, "End of /WHOIS List"));
            }
        }

    });
    this.socket.on("close", function () {
        console.log("Disconnected!");

        core.event.trigger('uplinkDisconnected');
    });
};

module.exports = EDDPIN;