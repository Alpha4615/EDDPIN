var moduleObj = function(core) {
    this.core = core;
};
moduleObj.prototype.events = {};
moduleObj.prototype.myUsers = [];
moduleObj.prototype.biography = {
    title: 'Untitled Module',
    description: 'An enigmatic module',
    author: 'Anonymous',
    version: '1.0'
};

/**
 * Determines if the event in question deals with any of the module's pseudo users.
 * @param eventObj
 * @return bool Returns true if eventObj.victim is one of the module's users or if eventObj.channel contains one of the module's users
 */
moduleObj.prototype.eventAffectsMe = function(eventObj) { return (this.isMyUser(eventObj.victim) || this.hasPresenceOnChannel(eventObj.channel)) };

moduleObj.prototype.hasPresenceOnChannel = function(channel) {
    for (var user in channel.users) {
        if (this.isMyUser(user) == true)
        {
            return true;
        }
    }

    return false;
}
moduleObj.prototype.subscribeToEvent = function (eventName, callback, options) {
    return this.core.event.listen(eventName, this, callback, options);
};

/**
 * Subscribes to an event, where callback is only occured if a module's is affected by that particular event
 * @param eventName
 * @param callback
 * @param options
 */
moduleObj.prototype.subscribeToEvent_selfish = function(eventName, callback, options) {
    if (typeof options != "object") { options = {}; }

    options.selfish = true;

    return this.subscribeToEvent(eventName, callback, options);
};

moduleObj.prototype.createBot = function (optionsObj) {
    if (optionsObj.events === "object") {

    }
    return this.core.createPseudoUser(this, optionsObj);
};

moduleObj.prototype.isMyUser = function (user) {
    if (user !== null) {
        for (var key in this.myUsers) {
            if (key === user.numeric) {
                return true;
            }
        }
    }

    return false;
}
/**
 * @module moduleObj
 * @type {moduleObj}
 */
module.exports = moduleObj;