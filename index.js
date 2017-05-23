'use strict';

var express = require('express');
var server = express();
var client = require('prom-client');


var h = new client.Histogram({ name: 'test_histogram', help: 'Example of a histogram', labelNames: [ 'code' ] });

var c = new client.Counter({ name: 'test_counter', help: 'Example of a counter', labelNames: [ 'code' ] });

var g = new client.Gauge({ name: 'test_gauge', help: 'Example of a gauge', labelNames: [ 'method', 'code' ] });

setTimeout(function() {
	h.labels('200').observe(Math.random());
	h.labels('300').observe(Math.random());
}, 10);

setInterval(function() {
	c.inc({ code: 200 });
}, 5000);

setInterval(function() {
	c.inc({ code: 400 });
}, 2000);

setInterval(function() {
	c.inc();
}, 2000);

setInterval(function() {
	g.set({ method: 'get', code: 200 }, Math.random());
	g.set(Math.random());
	g.labels('post', '300').inc();
}, 100);


server.get('/metrics', function(req, res) {
	res.set('Content-Type', client.register.contentType);
	res.end(client.register.metrics());
});

console.log('Server listening to 3000, metrics exposed on /metrics endpoint'); //eslint-disable-line no-console
server.listen(3000);