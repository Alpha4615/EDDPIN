var events = function () {
    this.registrations = {};
};

events.prototype.listen = function (eventToken, module, callback) {
    if (this.registrations[eventToken] === undefined) {
        this.registrations[eventToken] = [];
    }
    if (this.registrations[eventToken][module.moduleSignature] === undefined) {
        this.registrations[eventToken][module.moduleSignature] = [];
    }
    if (callback !== null && callback !== undefined) {

        this.registrations[eventToken][module.moduleSignature].push({module: module, callback: callback});
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
                eventCursor.callback.call(eventCursor.module, eventObject);

            }
        }
    }
};

module.exports = events;