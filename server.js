const _ = require('lodash');
const Promise = require('bluebird');
const rest = require('rest');
const mime = require('rest/interceptor/mime');
const allCoins = require('./lib/coin-names').all;

const client = rest.wrap(mime);

var express = require("express");
var app = express();
var router = express.Router();
var path = __dirname + '/views/';

app.use(express.static('public'));

router.use(function(req, res, next) {
	console.log("/" + req.method);
	next();
});


router.get("/chart", function(req, res) {
	res.sendFile(path + "chart.html");
});

var crypto = require('./lib/cryptocompare.js');
router.get("/info", function(req, res) {
	crypto.index().then(function(data){
		res.json(data);
	}).catch(function(error){
		res.status(500).send(error);
	});
});

router.get("/prices", function (req, res) {
	const theCoins = {};

	client({ path: 'https://www.cryptocompare.com/api/data/coinlist/' }).then((respData) => {
	    const allCoinNames = Object.keys(respData.entity.Data);
	    // Split list of all coins into chunks of 10 coins each for querying
	    const chunks = _.chunk(allCoinNames, 10);

	    return Promise.all(chunks.map((set) => {
			return client({ path: `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${set.join(',')}&tsyms=BTC`})
		}))
		.then((parts) => {
			parts.forEach((response) => {
				const coinData = response.entity;
				Object.keys(coinData).forEach((coinName) => {
					theCoins[coinName] = coinData[coinName];
				})
			});
			res.json(theCoins);
		});
	}).catch((error) => {
		res.status(500).send(error);
	});
})

app.use("/", router);

app.use("*", function(req, res) {
	res.sendFile(path + "404.html");
});

app.listen(3000, function() {
	console.log("Live at Port 3000");
});
