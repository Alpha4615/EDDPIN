var parser = function (core) {
    this.tokenMap = {
        'B': this.handleBurst,
        'C': this.handleChannelCreate,
        'EB': this.handleEndofBurst,
        'G': this.handleServerPing, // Uplink Pinging us
        'J': this.handleChannelJoin,
        'K': this.handleKick,
        'L': this.handleChannelPart, // user leaving a channel
        'N': this.handleN, // Newly connecting user or nick change
        'P': this.handlePrivmsg,
        'SERVER': this.handleNewServer_uplink, // Uplink connected
        'S': this.handleNewServer // New server
    };

    this.core = core;
};

parser.prototype.parse = function (parseObj) {

    if (typeof this.tokenMap[parseObj.token] !== "function") {
        return false;
    }
    this.tokenMap[parseObj.token].call(this, parseObj)

    return true;
};


parser.prototype.handleBurst = function (parseObj) { // channel introduced by netburst
    var core = this.core;
    var eventObj = parseObj.eventObj;
    var spaceDelimited = parseObj.spaceDelimited;
    var string = parseObj.string;
    var stringlessSplit = parseObj.stringlessSplit;

    var numeric = '';
    var chanName = spaceDelimited[2];
    var channel = (core.getChannelbyName(chanName) === false ? new core.generic.channel() : core.getChannelbyName(chanName));
    var workingUser;
    var userSplit;
    var modes;
    var foundUser;

    channel.name = chanName;
    channel.modes = (spaceDelimited.length > 5 ? spaceDelimited[4].substring(1) : '');

    // We need to parse for the param modes' values
    if (channel.modes !== '') {
        var separated = core.separateChannelModes(channel.modes);
        var paramModes = separated.paramModes.substr(1).split('');
        for (var paramIterator = 0; paramIterator < paramModes.length; paramIterator++) {
            //The original offset at is 4 for where mode declaration starts, so we increment from there to retrieve the values
            channel.modeParams[paramModes[paramIterator]] = spaceDelimited[4 + paramIterator + 1];
        }
    }

    core.channels[channel.name] = channel;

    //figure out the users
    // if the string contains no modes, everything is shifted over

    // The symbol :% signals the ban list
    if (string !== null && string !== '' && typeof string !== 'undefined') {
        var banArray = string.substr(1).split(' ');
        for (var banX = 0; banX < banArray.length; banX++) {
            if (channel.banExists(banArray[banX]) !== true) {
                channel.banAdd(banArray[banX]);
            }
        }
    }

    // We use stringlessSplit as it already has the ban stuff removed
    var delimitPosition = stringlessSplit.length - 1;
    var userRaw = stringlessSplit[delimitPosition].split(',');
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

        // So with that in mind, we'll apply the usermodes from instruction until we get a new set of modes
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
};

parser.prototype.handleChannelCreate = function (parseObj) { // user is creating a channel (first one to join it after emptied)
    var core = this.core;
    var spaceDelimited = parseObj.spaceDelimited;
    var channel = new core.generic.channel();
    var eventObj = parseObj.eventObj;

    channel.name = spaceDelimited[2];
    core.channels[channel.name] = channel;

    var foundUser = core.getUserByNumeric(spaceDelimited[0]);
    channel.userJoin(foundUser, 'o'); // since they are the first one in the channel, they get +o automatically

    eventObj.actor = foundUser;
    eventObj.channel = channel;
    core.event.trigger('join', eventObj);
    core.event.trigger('channelCreated', eventObj);
};

parser.prototype.handleChannelJoin = function (parseObj) {
    var spaceDelimited = parseObj.spaceDelimited;
    var eventObj = parseObj.eventObj;
    var core = this.core;

    var channel = core.getChannelbyName(spaceDelimited[2]);
    var user = core.getUserByNumeric(spaceDelimited[0]);
    eventObj.channel = channel;
    eventObj.actor = user;
    channel.userJoin(user);

    this.core.event.trigger('join', eventObj);
};

parser.prototype.handleChannelPart = function (parseObj) { // user parts channel
    var core = this.core;
    var spaceDelimited = parseObj.spaceDelimited;
    var eventObj = parseObj.eventObj;
    var string = parseObj.string;

    var channel = core.getChannelbyName(spaceDelimited[2]);
    var user = core.getUserByNumeric(spaceDelimited[0]);
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


};

parser.prototype.handleEndofBurst = function (parseObj) { // end of burst (supposedly sync'd to network)
    var core = this.core;
    // Only load these delayed-start modules on the initial end of burst
    if (core.inBurst === true) {
        core.loadModule_group('uponUplinkBurst');
    }

    core.inBurst = false;
    core.serverWrite('EA');
    core.event.trigger('EndOfBurst');
};

parser.prototype.handleKick = function (parseObj) {
    var core = this.core;
    var spaceDelimited = parseObj.spaceDelimited;
    var eventObj = parseObj.eventObj;
    var string = parseObj.string;

    var channel = core.getChannelbyName(spaceDelimited[2]);
    var actor = core.getUserByNumeric(spaceDelimited[0]);
    var victim = core.getUserByNumeric(spaceDelimited[3]);

    eventObj.actor = actor;
    eventObj.victim = victim;
    eventObj.channel = channel;
    eventObj.data.reason = string;

    channel.userPart(victim);

    core.event.trigger('kick', eventObj);

    if (channel.membershipCount() === 0) {
        core.destroyChannel(channel);
    }

};

parser.prototype.handleN = function (parseObj) { // new user connecting to network!
    var core = this.core;
    var eventObj = parseObj.eventObj;
    var server = core.getServerByNumeric(parseObj.originatingServer);
    var spaceDelimited = parseObj.spaceDelimited;
    var emittedString = parseObj.emittedString;

    if (spaceDelimited.length === 4) { // this is a user changing their nickname!
        var actor = core.getUserByNumeric(spaceDelimited[0]);
        var newNickname = spaceDelimited[2];
        eventObj.actor = actor;
        eventObj.data.oldNickname = actor.nickname;

        // Remove old nickname from the map and replace it with the new one
        delete core.usersNickname[actor.nickname];
        core.usersNickname[newNickname] = actor;

        actor.nickname = newNickname;
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
        core.usersNickname[optionsObject.nickname] = newUser;
        server.addUser(newUser);

        eventObj.actor = newUser;
        eventObj.data.inBurst = core.inBurst;
        core.event.trigger('newUser', eventObj);
    }

};

parser.prototype.handleNewServer_uplink = function (parseObj) {
    var core = this.core;
    var eventObj = parseObj.eventObj;
    var description = parseObj.string;
    var name = parseObj.spaceDelimited[1];
    var numeric = parseObj.spaceDelimited[6].substring(0, 2);
    var server = new core.generic.server(name, numeric, description);

    server.uplinkServer = true;
    core.servers[numeric] = server;

    eventObj.data.server = server;
    core.event.trigger('uplinkConnected', eventObj);
};

parser.prototype.handleNewServer = function (parseObj) {
    var core = this.core;
    var eventObj = parseObj.eventObj;
    var description = parseObj.string;
    var name = parseObj.spaceDelimited[2];
    var numeric = parseObj.spaceDelimited[7].substring(0, 2);
    var server = new core.generic.server(name, numeric, description);

    core.servers[numeric] = server;
    eventObj.data.server = server;

    core.event.trigger('serverConnected', eventObj);
};

parser.prototype.handlePrivmsg = function (parseObj) {
    var eventObj = parseObj.eventObj;
    var core = this.core;

    eventObj.actor = core.getUserByNumeric(parseObj.spaceDelimited[0]);
    var target = parseObj.spaceDelimited[2];
    var isCTCP = false;

    eventObj.data.text = parseObj.string;

    // If it's wrapped in this symbol, it's actually a CTCP
    if (parseObj.string.substr(0, 1) == '' && parseObj.string.substr(parseObj.string.length - 1, 1) == '') {
        isCTCP = true;

        //remove the signal character and make upper case for consistency sake
        eventObj.data.text = parseObj.string.substr(1, parseObj.string.length - 2).toUpperCase();
    }

    if (core.isChannel(target) === true) { // message sent to a channel (server will only see this if a pseudo user is on target channel)
        eventObj.channel = core.getChannelbyName(parseObj.spaceDelimited[2]);

        core.event.trigger((isCTCP ? 'ctcpChannel' : 'messageChannel'), eventObj);
    } else { // message sent a user (server will only see this if the pseudo user is the target)
        eventObj.victim = core.getUserByNumeric(parseObj.spaceDelimited[2]);

        core.event.trigger((isCTCP ? 'ctcpUser' : 'messageUser'), eventObj)
    }

    //it's a little redundant but let's also trigger an event for any kind of message
    core.event.trigger((isCTCP ? 'ctcp' : 'message'), eventObj);
};

parser.prototype.handleServerPing = function (parseObj) {
    this.core.pong();
    this.core.event.trigger('ping');
};

module.exports = parser;