const Promise = require('bluebird');
const Poloniex = require('poloniex.js');
const moment = require('moment');
const math = require('mathjs');
const keys = require('../api-key');
Promise.promisifyAll(Poloniex.prototype, {
	filter: (name, func, target, passesDefaultFilter) => {
		return passesDefaultFilter || name == '_private';
	}
});

const poloniex = new Poloniex(keys.api_key, keys.api_secret);

// 300 | 900 | 1800 | 7200 | 14400 | 86400

const timeSeries = [360, 180, 90, 45, 30, 15];
const INCREMENTS = 300;

const errors = [];

const blacklist = [
	'BTC_BBR','BTC_BITS','BTC_C2','BTC_CURE','BTC_HZ','BTC_IOC','BTC_MYR','BTC_NOBL',
	'BTC_NSR','BTC_QBK','BTC_QORA','BTC_QTL','BTC_RBY','BTC_SDC','BTC_UNITY','BTC_VOX','BTC_XMG'
];

const changes = [];

const writeSeries = (changes) => {
	changes.sort((a, b) => {
		if(a.name < b.name) return -1;
		if(a.name > b.name) return 1;
		return 0;
	});
	const cols = ['Coin'].concat(timeSeries);
	console.log(cols.join(','));
	changes.forEach((next) => {
		console.log(`${next.name},${next.changes.join(",")}`);
	});
};

return poloniex.returnTickerAsync()
	.then((data) => {
		//const quick = [Object.keys(data)[0]];
		//return Promise.each(quick, (pair) => {
		return Promise.each(Object.keys(data), (pair) => {
			if (pair.indexOf('BTC_') !== 0 || blacklist.indexOf(pair) !== -1) {
				return {};
			}

			const name = pair.split("_")[1];
			const data = {
				pair: pair,
				name: name,
				changes: []
			};
			const now = Math.floor(new Date().getTime() / 1000);
			const parameters = {
				currencyPair: pair,
				end: now,
				start: now - (60 * timeSeries[0]),
				period: INCREMENTS
			};

			return poloniex._privateAsync('returnChartData', parameters)
				.then((result) => {
					if (result && result.candleStick && result.candleStick.length > 1) {
						const candles = result.candleStick;
						const lastCandle = candles[candles.length - 1];
						const tsEnd = lastCandle.date + INCREMENTS;
						const targetDates = timeSeries.map((minInPast) => {
							return tsEnd - (minInPast * 60);
						});

						const dataPoints = candles.filter((candle, idx) => {
							return idx === 0 || targetDates.indexOf(candle.date) !== -1;
						});

						const currPrice = lastCandle.close;

						dataPoints.forEach((candle) => {
							/*
							{"date":1405699200, "high":0.0045388,"low":0.00403001,"open":0.00404545,"close":0.00427592,
							"volume":44.11655644,"quoteVolume":10259.29079097,"weightedAverage":0.00430015}
							*/
							const diff = currPrice - candle.open;
							const pctChange = math.round(diff / candle.open, 5);
							data.changes.push(pctChange);
						});
					} else {
						data.changes.push(0);
					}
					return Promise.delay(200);
				})
				.then(() => {
					changes.push(data);
					return {};
				})
				.catch((err) => {
					data.changes.push(0);
					errors.push(JSON.stringify(parameters));
					return Promise.delay(200);
				})
		})
		.then(() => {
			writeSeries(changes);
			if (errors.length) {
				console.log(errors.join(','));
			}
			process.exit();
		})
	})
	.catch((err) => {
		console.error("ERROR!");
		console.error(err);
		process.exit();
	});
