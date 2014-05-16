var EDDPIN = require('./lib/classes/EDDPIN');

var server = new EDDPIN(require('./config.json'));

server.start();
