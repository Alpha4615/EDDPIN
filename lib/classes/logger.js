var logger = {

    log: function () {
        arguments[0] = arguments[0].bgBlack;
        console.log.apply(null, arguments);
    },
    green: function () {
        arguments[0] = arguments[0].green;
        this.log.apply(this, arguments);
    },
    red: function () {
        arguments[0] = arguments[0].red;
        this.log.apply(this, arguments);
    },
    blue: function () {
        arguments[0] = arguments[0].blue;
        this.log.apply(this, arguments);
    },
    info: function () {
        arguments[0] = "INFO: ".bold.blue + arguments[0];
        this.log.apply(this, arguments);
    },
    warn: function () {
        arguments[0] = "WARNING: ".bold.yellow + arguments[0];
        arguments[0] = arguments[0].blackBG;
        console.warn.apply(null, arguments);
    },
    error: function () {
        arguments[0] = "ERROR: ".bold.red + arguments[0];
        arguments[0] = arguments[0].blackBG;
        console.error.apply(null, arguments);
    }
};

module.exports = logger;