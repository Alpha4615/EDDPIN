var events = function () {
    this.registrations = {};
};

/**
 * Binds an event to a module.
 *
 * Options:
 *  selfish : if set to true, the callback function will only be called if the event victim is a user that belong the module or is in an channel that includes one of its users
 *  pretest : If set, this callback must return true for the binding's callback to be executed
 * @param eventToken {String} the name of the event being listened for
 * @param module {module} The module requesting the bind
 * @param callback {Function} Function to call when the eventToken is triggered
 * @param options {Object}
 * @returns {boolean}
 * @see trigger
 */
events.prototype.listen = function (eventToken, module, callback, options) {
    var defaultOptions = {selfish: false, pretest: null};
    if (typeof options !== "object") {
        options = defaultOptions;
    } else {
        // merge with default options
        options = {...defaultOptions, ...options};
    }

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
/**
 * Notifies all modules that a specified event has occurred
 * @param eventToken {string} The name of the event
 * @param eventObject {eventObject} Information about the event
 * @see listen
 */
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

                // selfish binds are only called if the victim is a user of the module.
                if ((eventCursor.options.selfish == false) || (eventCursor.options.selfish == true && eventCursor.module.eventAffectsMe(eventObject))) {
                    if (typeof eventCursor.options.pretest == "function" ) {
                        if (eventCursor.options.pretest.call(eventCursor.module, eventObject) === true) {
                            eventCursor.callback.call(eventCursor.module, eventObject);
                        }
                    } else {
                        eventCursor.callback.call(eventCursor.module, eventObject);
                    }
                }
            }
        }
    }
};

module.exports = events;