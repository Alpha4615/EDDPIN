var eventObject = function () {
    this.channel = null; // pointer to channel object where event took place
    this.actor = null; // pointer to user that initiated action
    this.victim = null; // pointer to user that received an action
    this.data = {};
    this.originatingServer = null;
};

module.exports = eventObject;