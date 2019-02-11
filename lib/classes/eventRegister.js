var events = function () {
    this.registrations = {};
};

events.prototype.listen = function (eventToken, module, callback, options) {
    if (this.registrations[eventToken] === undefined) {
        this.registrations[eventToken] = [];
    }
    if (this.registrations[eventToken][module.moduleSignature] === undefined) {
        this.registrations[eventToken][module.moduleSignature] = [];
    }
    if (callback !== null && callback !== undefined) {

        this.registrations[eventToken][module.moduleSignature].push({module: module, callback: callback, options: options});
        return true;
    }

    return false;
};

events.prototype.trigger = function (eventToken, eventObject) {
    var events = this.registrations;
    if (eventObject === null || eventObject === undefined) {
        eventObject = {};
    }
    var eventCursor;
    var moduleEvents;

    if (events[eventToken] !== undefined) {
        for (var sequence in events[eventToken]) {
            moduleEvents = events[eventToken][sequence];

            for (var x = 0; x < moduleEvents.length; x++) {
                eventCursor = moduleEvents[x];

                if (typeof eventCursor.options === "undefined") {
                    eventCursor.options = {};
                }
                // selfish binds are only called if the victim is a user of the module.
                if ((eventCursor.options.selfish == false) || (eventCursor.options.selfish == true && eventCursor.module.eventAffectsMe(eventObject))) {
                    eventCursor.callback.call(eventCursor.module, eventObject);
                }
            }
        }
    }
};

module.exports = events;