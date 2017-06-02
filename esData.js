var elasticsearch = require('elasticsearch');
var async = require('async');
// var allCoins = require('./lib/coin-names').all;
global.fetch = require('node-fetch')
var cc = require('cryptocompare')

var client = new elasticsearch.Client({
	host: 'search-coins-jtghe5d7qp3qk245pxfvez73hi.us-east-1.es.amazonaws.com',
	log: 'info'
});
// docker run -d -p 9200:9200 -p 9300:9300 -v ~/esdata:/usr/share/elasticsearch/data --name elasticsearch elasticsearch
// docker run -d --link elasticsearch:elasticsearch -p 5601:5601 --name kibana kibana

var allCoins = require('./lib/all-coins.json');
// var allCoins = require('./lib/my_coins.json');
var allCoinsData = [];
allCoins.forEach(function(info) {
	allCoinsData.push(function(callback) {
		getCoinPrices(info.coin, info.currency, callback);
	});
});
async.series(allCoinsData, function(err) {
	if (err) {
		console.log(err);
	} else {
		console.log('DONE');
	}
});


function getCoinPrices(coinName, currency, callback) {
	console.log(coinName + '/' + currency);
	cc.histoMinute(coinName, currency, {limit: 1440})
		// cc.histoDay(coinName, currency, {limit: 'none'})
		.then(function(data) {
			console.log(data.length);
			processData(coinName, currency, data, callback);
		})
		.catch((error) => {
			console.error(error);
			callback(error);
		});
}

function processData(coinName, currency, hits, callback) {
	var elasticSearchBody = [];
	hits.forEach(function(hit) {
		hit.time = hit.time * 1000;
		hit.coinName = coinName;
		hit.currency = currency;
		elasticSearchBody.push({
			index: {
				_id: coinName + '-' + currency + '-' + hit.time,
				_index: 'coins',
				_type: 'price'
			}
		});
		elasticSearchBody.push(hit);
	});

	client.bulk({
			body: elasticSearchBody
		})
		.then(function() {
			callback();
		})
		.catch(function(err) {
			callback(err);
		});
}


// PUT _template/coins
// {
//   "template": "coins",
//   "settings": {
//     "index.number_of_shards": 1,
//     "index.number_of_replicas": 1
//   },
//   "mappings": {
//     "fluentd": {
//       "_source": {
//         "enabled": true
//       },
//       "properties": {
//         "close": {
//           "type": "double"
//         },
//         "time": {
//           "type": "date"
//         },
//         "coinName": {
//           "type": "keyword"
//         },
//         "currency": {
//           "type": "keyword"
//         }
//       }
//     }
//   }
// }
