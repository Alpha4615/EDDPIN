var userObject = require('./user.js');
util = require('util');

function pseudouserObject() {
    userObject.apply(this, arguments);

    if (arguments[0].core !== undefined) {
        this.core = arguments[0].core;
    }
    if (arguments[0].parentModule !== undefined) {
        this.parentModule = arguments[0].parentModule;
    }

    this.isPseudo = true;
}

util.inherits(pseudouserObject, userObject);

pseudouserObject.prototype.isPseudo = true;
pseudouserObject.prototype.simulateActualUser = false;

pseudouserObject.prototype.writeToServer = function(string) {
    this.core.write(this.numeric +" "+string);
}

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

pseudouserObject.prototype.join = function(channel) {
    var channelOrig = channel;

    if (typeof channel == "string") {
        channel = this.core.getChannelbyName(channel);
    }

    if (channel != false) {
        this.writeToServer("J " + channel.name + " " + this.core.getTimestampUTC());
    } else {
        // Channel doesn't exist, we must create it!
        channel = new this.core.generic.channel();
        channel.name = channelOrig;
        this.core.channels[channel.name] = channel;
        this.writeToServer("C " + channelOrig + " "+this.core.getTimestampUTC());
    }
    channel.userJoin(this, "");

    return this;
};

pseudouserObject.prototype.part = function (channel, message) {

    if (typeof channel == "string") {
        channel = this.core.getChannelbyName(channel);
    }

    this.writeToServer('L ' + channel.name +  " :"+message);

    channel.userPart(this);
}

pseudouserObject.prototype.quit  = function(message) {
    this.writeToServer('Q :'+message);

    //Clean up after self
    this.core.destroyUser(this);
    this.parentModule.myUsers[this.numeric] = null;
    this.core.myUsers[this.numeric] = null;

    return this;
};

pseudouserObject.prototype.kick = function(channel, user, reason) {
    this.writeToServer(util.format("K %s %s :%s", channel.name, user.numeric, reason));

    return this;
};

pseudouserObject.prototype.setTopic = function (channel, topicStr) {
    this.writeToServer(util.format('T %s :%s', channel.name, topicStr));
    channel.topic = topicStr;
    return this;
}

pseudouserObject.prototype.privmsg = function(target, message) {
    var finalTarget = '';
    var targetType = '';
    var valid = true;
    // allow devs to send us strings or object references
    if (typeof target == "string") {
        // Channel or nickname?
        if (this.core.isChannel(target) === true) {
            // no change needed here
            finalTarget = target;
            targetType = 'channelStr';
        } else {

            targetType = 'userNickname';
            var user = this.core.getUserByNickname(target);

            if (user === null) {
                throw new Error("No such nickname");
            } else {
                finalTarget = user.numeric;
            }
        }
    } else {
        if (target instanceof this.core.generic.channel) {
            targetType = "channelObject";
            finalTarget = target.name;
        } else if (target instanceof this.core.generic.user) {
            targetType = "userObject";
            finalTarget = target.numeric;
        }
    }

        // If the module wants this user to be treated like a real user, it must be in the channel to send the message.
        if (this.simulateActualUser === true) {
            var channelTest = null;
            if (targetType == "channelStr") {
                channelTest = this.core.getChannelbyName(target);
            } else if (targetType == "channelObj") {
                channelTest = target;
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

pseudouserObject.prototype.announce = function() {
    var sendString = util.format('N %s 1 %s ~%s %s %s AAAAAA %s :%s',this.nickname, this.core.getTimestampUTC(), this.ident, this.host, this.usermodes, this.numeric, this.GECOS);
    this.core.serverWrite(sendString);
};


module.exports = pseudouserObject;