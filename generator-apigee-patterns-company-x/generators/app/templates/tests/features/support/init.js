'use strict';

const apickli = require('apickli');
const {defineSupportCode} = require('cucumber');

defineSupportCode(function({Before}) {
    Before(function() {
	console.log(this.parameters.proxyEndpoint);
	this.apickli = new apickli.Apickli('https', this.parameters.proxyEndpoint);

	this.apickli.addRequestHeader('Cache-Control', 'no-cache');
    });
});

defineSupportCode(function({setDefaultTimeout}) {
    setDefaultTimeout(60 * 1000); // this is in ms
});
