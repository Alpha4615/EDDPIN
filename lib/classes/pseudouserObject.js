var userObject = require('./user.js');
util = require('util');

/**
 * A fake user created by a module. This is used for bots managed by this application.
 * @class
 * @implements user
 * @constructor
 */
function pseudouserObject() {
    userObject.apply(this, arguments);

    if (arguments[0].parentModule !== undefined) {
        this.parentModule = arguments[0].parentModule;
    }

    this.isPseudo = true;
}

util.inherits(pseudouserObject, userObject);

pseudouserObject.prototype.isPseudo = true;

/**
 * If set to true, this means the pseudo user should respect mode settings and not join through invite-only, bans, etc
 * @type {boolean}
 */
pseudouserObject.prototype.simulateActualUser = false;

/**
 * Writes a raw string to the socket prefixed with the numeric of the pseudo user
 * @param string {string}
 */
pseudouserObject.prototype.writeToServer = function(string) {
    core.write(this.numeric + " " + string);
}

/**
 * Gets the location in the myUser array of this pseudo user
 * @returns {number}
 */
pseudouserObject.prototype.getPlacement = function() {
    var users = this.parentModule.core.getPseudoUserNumerics();
    var x = 0;
    var targetPosition = null;
    while (x < users.length && targetPosition == null) {
       if (users[x] == this.numeric) {
           targetPosition = x;
       }
        x++;
    }

    // The first user is literally 1, no zero start.
    return x+1;
};

/**
 * Joins the pseudo to a channel
 *
 * If the channel does not exist it will create it.
 *
 * @param channel {String|channel}
 * @returns {pseudouserObject} Returns self
 */
pseudouserObject.prototype.join = function(channel) {
    var channelOrig = channel;
    var isNew = false;
    if (typeof channel == "string") {
        channel = core.getChannelbyName(channel);
    }

    if (channel != false) {
        if (this.simulateActualUser === true && !this.canJoin(channel)) {
            console.warn("Pseudo-user %s:%s (module %s) cannot join %s because of a ban setting.", this.nickname, this.numeric, this.parentModule.moduleName, channel.name);
        } else {
            this.writeToServer("J " + channel.name + " " + core.getTimestampUTC());
        }
    } else {
        // Channel doesn't exist, we must create it!
        channel = new core.generic.channel(channelOrig);
        channel.name = channelOrig;
        core.channels[channel.nameSafe] = channel;
        this.writeToServer("C " + channelOrig + " " + core.getTimestampUTC());

        // So we determine if the pseudo should be +o
        isNew = true;
    }
    channel.userJoin(this, (isNew ? "o" : ""));

    return this;
};

/**
 * Causes the Pseudo user to leave a channel
 * @param channel {channel|String}
 * @param message {String} The message to include with the part
 * @throws TypeError
 * @returns {pseudouserObject}
 */
pseudouserObject.prototype.part = function (channel, message) {

    if (typeof channel == "string") {
        channel = core.getChannelbyName(channel);
    }
    if (typeof message == "undefined") {
        message = '';
    }

    if (!core.isType_channel(channel)) {
        throw new TypeError("Valid channel instance expected");
    }

    this.writeToServer('L ' + channel.name +  " :"+message);
    channel.userPart(this);

    return this;
};

/**
 * Causes the pseudo user to quit network
 * @param message {String}
 * @returns {pseudouserObject}
 */

pseudouserObject.prototype.quit  = function(message) {
    this.writeToServer('Q :'+message);

    //Clean up after self
    core.destroyUser(this);
    this.parentModule.myUsers[this.numeric] = null;
    core.myUsers[this.numeric] = null;

    return this;
};

/**
 * Has the pseudo user kick a target user out of a channel
 * @param channel {channel}
 * @param user {user}
 * @param reason {String}
 * @throws TypeError
 * @returns {pseudouserObject}
 */

pseudouserObject.prototype.kick = function(channel, user, reason) {

    if (!core.isType_channel(channel)) {
        throw new TypeError("Valid channel instance expected.");
    }
    if (!core.isType_user(user)) {
        throw new TypeError("Valid user instance expected.");
    }

    this.writeToServer(util.format("K %s %s :%s", channel.name, user.numeric, reason));

    return this;
};

/**
 * Has the pseudo user set a topic in a channel.
 * @param channel {channel}
 * @param topicStr {String}
 * @throws TypeError
 * @returns {pseudouserObject}
 */
pseudouserObject.prototype.setTopic = function (channel, topicStr) {
    if (!core.isType_channel(channel)) {
        throw new TypeError("Valid channel instance expected");
    }
    this.writeToServer(util.format('T %s :%s', channel.name, topicStr));
    channel.topic = topicStr;
    return this;
}

/**
 * Sends a CTCP request to a target
 * @param target {channel|user|String} If a string is provided, it will attempt to intelligently determine the proper target. Only nickname is support to resolve into a user object
 * @param message {string} The CTCP token to send
 * @returns {pseudouserObject}
 * @see privmsg
 */
pseudouserObject.prototype.ctcp = function (target, message) {
    this.privmsg(target, util.format('P %s :%s', target.getTargetString(), message.toUpperCase()));

    return this;
}

/**
 *
 * @param target {channel|user|String} If a string is provided, it will attempt to intelligently determine the proper target. Only nickname is support to resolve into a user object
 * @param message {string} The message to send
 * @throws TypeError
 * @returns {pseudouserObject}
 */
pseudouserObject.prototype.privmsg = function(target, message) {
    var finalTarget = '';
    var targetType = '';
    var valid = true;
    // allow devs to send us strings or object references
    if (typeof target == "string") {
        // Channel or nickname?
        if (core.isChannel(target) === true) {
            // no change needed here
            finalTarget = target;
            targetType = 'channelStr';
        } else {

            targetType = 'userNickname';
            var user = core.getUserByNickname(target);

            if (user === null) {
                throw new Error("No such nickname: " + target);
            } else {
                finalTarget = user.numeric;
            }
        }
    } else {
        if (core.isType_channel(target)) {
            targetType = "channelObject";
            finalTarget = target.name;
        } else if (core.isType_user(target)) {
            targetType = "userObject";
            finalTarget = target.numeric;
        } else {
            throw new TypeError("Valid channel or user instance expected.");
        }
    }

    // If the module wants this user to be treated like a real user, it must be in the channel to send the message.
    if (this.simulateActualUser === true && (targetType == "channelStr" || targetType == "channelObj")) {
        var channelTest = null;
        if (targetType == "channelStr") {
            channelTest = core.getChannelbyName(target);
        } else if (targetType == "channelObj") {
            channelTest = target;
        }

        if (!core.isType_channel(channelTest)) {
            throw new TypeError("Valid channel instance expected.");
        }

        if (channelTest !== null && channelTest.hasUser(this) === false) {
            valid = false;
            console.warn("simulateActualUser: %s (%s) is not on %s; PRIVMSG not sent.", this.nickname, this.numeric, channelTest.name);
        }

    }
    if (valid) {
        this.writeToServer('P ' + finalTarget + " :" + message);
    }
    return this;
};

/**
 * Announces the pseudo user to the network
 */
pseudouserObject.prototype.announce = function() {
    var sendString = util.format('N %s 1 %s ~%s %s %s AAAAAA %s :%s', this.nickname, core.getTimestampUTC(), this.ident, this.host, this.usermodes, this.numeric, this.GECOS);
    core.serverWrite(sendString);
};


module.exports = pseudouserObject;