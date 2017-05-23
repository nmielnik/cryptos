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


app.use("/", router);

app.use("*", function(req, res) {
	res.sendFile(path + "404.html");
});

app.listen(3000, function() {
	console.log("Live at Port 3000");
});