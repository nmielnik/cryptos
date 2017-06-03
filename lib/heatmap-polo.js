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

const blacklist = [
	'BTC_BBR','BTC_BITS','BTC_C2','BTC_CURE','BTC_HZ','BTC_IOC','BTC_MYR','BTC_NOBL',
	'BTC_NSR','BTC_QBK','BTC_QORA','BTC_QTL','BTC_RBY','BTC_SDC','BTC_UNITY','BTC_VOX','BTC_XMG'
];

const writeSeries = (changes, headers) => {
	// sort highest to lowest
	/*changes.sort((x, y) => {
		return y.changed - x.changed;
	});*/
	// sort alphabetically
	changes.sort((a, b) => {
		if(a.name < b.name) return -1;
		if(a.name > b.name) return 1;
		return 0;
	});
	console.log(headers.join(','));
	changes.forEach((next) => {
		console.log(`${next.name},${next.changes.join(",")}`);
	});
};

// 300 | 900 | 1800 | 7200 | 14400 | 86400

const HOURS_PER_PERIOD = 8;
const NUMBER_OF_PERIODS = 10;
const INCREMENTS = 7200;
const POP_THRESHOLDS = [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7];

const poloniex = new Poloniex(keys.api_key, keys.api_secret);

const threeDaysAgo = moment().startOf('day').subtract(3, 'days').unix();
const hours = moment().hours();
const beginDate = moment().startOf('day');
const now = moment();

let targetHours = -1;
let counter = HOURS_PER_PERIOD;
while (counter <= 24 && targetHours === -1) {
	if (hours < counter) {
		targetHours = counter - HOURS_PER_PERIOD;
	} else {
		counter += HOURS_PER_PERIOD;
	}
}

if (targetHours > 0) {
	beginDate.add(targetHours, 'hours');
}
beginDate.subtract(NUMBER_OF_PERIODS * HOURS_PER_PERIOD, 'hours');

const changes = [];
const cols = ['Coin'];
const errors = [];

let nextDate = beginDate.clone();
while (nextDate.unix() < (now.unix() - (HOURS_PER_PERIOD * 60 * 60))) {
	cols.push(nextDate.format('M-D_H'));
	nextDate.add(HOURS_PER_PERIOD, 'hours');
}

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
			const parameters = {
				currencyPair: pair,
				end: now.unix(),
				start: beginDate.unix(),
				period: INCREMENTS
			};

			return poloniex._privateAsync('returnChartData', parameters)
				.then((result) => {
					if (result && result.candleStick && result.candleStick.length > 1) {
						const candles = result.candleStick;
						let previousOpen = candles[0].open;
						let nextTarget = candles[0].date + (HOURS_PER_PERIOD * 60 * 60);

						candles.forEach((candle) => {
							if (candle.date === nextTarget) {
								/*
								{"date":1405699200, "high":0.0045388,"low":0.00403001,"open":0.00404545,"close":0.00427592,
								"volume":44.11655644,"quoteVolume":10259.29079097,"weightedAverage":0.00430015}
								*/
								const diff = candle.open - previousOpen;
								const pctChange = math.round(diff / previousOpen, 5);
								data.changes.push(pctChange);

								previousOpen = candle.open;
								nextTarget = candle.date + (HOURS_PER_PERIOD * 60 * 60);
							}
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
					console.error(err);
					data.changes.push(0);
					errors.push(JSON.stringify(parameters));
					return Promise.delay(200);
				})
		})
		.then(() => {
			writeSeries(changes, cols);
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
