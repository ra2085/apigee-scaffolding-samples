var ApiMocker = require('apimocker');

var options = {};

var apiMocker = ApiMocker.createServer(options)
    .setConfigFile('config-generated.json')
    .start();
