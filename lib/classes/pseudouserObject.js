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
}

util.inherits(pseudouserObject, userObject);

pseudouserObject.prototype.isPseudo = true;


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

pseudouserObject.prototype.announce = function() {
    var sendString = util.format('N %s 1 %s ~%s %s DAqAAB %s %s :%s',this.nickname, this.core.getTimestampUTC(), this.ident, this.host, this.usermodes, this.numeric, this.GECOS);
    this.core.serverWrite(sendString);
};


module.exports = pseudouserObject;