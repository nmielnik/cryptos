var elasticsearch = require('elasticsearch');
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
allCoins.forEach(function(info){
	getCoinPrices(info.coin);
});

function getCoinPrices(coinName) {
	console.log(coinName);
	var currency = 'USD';
	// var currency = 'BTC';
	cc.histoMinute(coinName, currency, {limit: 1440})
	// cc.histoDay(coinName, currency, {limit: 'none'})
		.then(function(data) {
			processData(coinName, currency, data);
		})
		.catch((error) => {
			console.error(error);
		});
}

function processData(coinName, currency, hits) {
	var unit = 500;
	var results = [];
	var length = Math.ceil(hits.length / unit);

	for (var i = 0; i < length; i++) {
		results.push(hits.slice(i * unit, (i + 1) * unit));
	}

	var esBulkQueries = [];
	results.forEach(function(hitsArray) {
		var elasticSearchBody = [];
		hitsArray.forEach(function(hit) {
			hit.time = hit.time * 1000;
			hit.coinName = coinName;
			hit.currency = currency;
			elasticSearchBody.push({
				index: {
					_id: coinName + '-'  + currency + '-' + hit.time,
					_index: 'coins',
					_type: 'price'
				}
			});
			elasticSearchBody.push(hit);
		});
		esBulkQueries.push({
			body: elasticSearchBody
		});
	});

	executeESBulkQueries(esBulkQueries);;
}

function executeESBulkQueries(esBulkQueries) {
	var chunkSize = parseInt(5, 10);
	var chunks = [];
	for (var i = 0, j = esBulkQueries.length; i < j; i += chunkSize) {
		chunks.push(esBulkQueries.slice(i, i + chunkSize));
	}
	var results = [];
	for (var i = 0; i < chunks.length; i++) {
		var res = Promise.all(chunks[i].map(bulkQuery => client.bulk(bulkQuery)));
		results = results.concat(res);
	}
	return results;
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
//         "currency": {
//           "type": "keyword"
//         }
//       }
//     }
//   }
// }
