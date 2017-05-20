const Promise = require('bluebird');
const Poloniex = require('poloniex.js');
const moment = require('moment');
const keys = require('./api-key');
Promise.promisifyAll(Poloniex.prototype, {
	filter: (name, func, target, passesDefaultFilter) => {
		return passesDefaultFilter || name == '_private';
	}
});

const HOURS_PER_PERIOD = 8;
const POP_THRESHOLDS = [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7];

//const mode = 'series';
//const mode = 'intervals';
const mode = 'picks';

const poloniex = new Poloniex(keys.api_key, keys.api_secret);
const MIN_IN_PAST = 15;
//const INCREMENTS = 300;
// 300 | 900 | 1800 | 7200 | 14400 | 86400

//const timeSeries = [360, 180, 90, 45, 20];
const timeSeries = [360, 180, 90, 45, 25, 15];

//const now = Math.floor(new Date().getTime() / 1000);
//const past = now - (60 * MIN_IN_PAST);
//console.log(`start: ${past} | end: ${now}`);

//const now = Math.floor(new Date(2017,4,6,12,0,0,0).getTime() / 1000);
//const past = now - (12 * 60 * 60);

const startDate = Math.floor(new Date(2017,4,16,12,0,0,0).getTime() / 1000);
const nowDate = Math.floor(new Date().getTime() / 1000);
const timeSpans = (HOURS_PER_PERIOD * 60 * 60);
const INCREMENTS = 14400;

const timeIntervals = [startDate];
let nextEndpoint = startDate + timeSpans;
while ((nextEndpoint + timeSpans) < nowDate) {
	timeIntervals.push(nextEndpoint);
	nextEndpoint += timeSpans;
}

const blacklist = [
	'BTC_BBR','BTC_BITS','BTC_C2','BTC_CURE','BTC_HZ','BTC_IOC','BTC_MYR','BTC_NOBL',
	'BTC_NSR','BTC_QBK','BTC_QORA','BTC_QTL','BTC_RBY','BTC_SDC','BTC_UNITY','BTC_VOX','BTC_XMG'
];

const whitelist = [
	'REP', 'FCT', 'CLAM', 'NMC','EXP','GAME','LSK','SJCX','STEEM','MAID','NAV','GNT',
	'LBC','SYS','ARDR','XEM','NXT','BTS','STR','DOGE','ETH','ETC','LTC','XMR','ZEC',
	'DASH','DCR','PPC','STRAT','XRP','POT','SC'
];

const changes = [];

const writeIntervals = (changes) => {
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
	const cols = ['Coin'];
	timeIntervals.forEach((point) => {
		cols.push(moment(point * 1000).format('M-D_H'));
	});
	console.log(cols.join(','));
	changes.forEach((next) => {
		console.log(`${next.name},${next.changes.join(",")}`);
	});
};

const writeSeries = (changes) => {
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
	const cols = ['Coin'].concat(timeSeries);
	console.log(cols.join(','));
	changes.forEach((next) => {
		console.log(`${next.name},${next.changes.join(",")}`);
	});
};

const writePicks = (changes) => {
	const sincePops = changes.map((next) => {
		const entry = {
			name: next.name,
			sincePop: []
		};
		next.changes.reverse();
		POP_THRESHOLDS.forEach((threshold) => {
			let currSincePop = 0;
			next.changes.some((val) => {
				if (val >= threshold) {
					return true;
				}
				currSincePop++;
				return false;
			});
			entry.sincePop.push(currSincePop);
		})
		return entry;
	});
	sincePops.sort((x, y) => {
		let toRet = 0;
		y.sincePop.some((yVal, idx) => {
			toRet = yVal - x.sincePop[idx];
			return toRet !== 0;
		});
		return toRet;
	});
	const cols = ['Coin'].concat(POP_THRESHOLDS);
	console.log(cols.join(','));
	sincePops.forEach((next) => {
		console.log(`${next.name},${next.sincePop.join(",")}`);
	});
};

return poloniex.returnTickerAsync()
	.then((data) => {
		//const quick = [Object.keys(data)[0], Object.keys(data)[1], Object.keys(data)[2]];
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

			const toIterate = (mode === 'series') ? timeSeries : timeIntervals;

			return Promise.each(toIterate, (next) => {
				const parameters = {
					currencyPair: pair
				};
				if (mode === 'series') {
					parameters.end = Math.floor(new Date().getTime() / 1000);
					parameters.start = parameters.end - (60 * next);
					parameters.period = (next <= 120) ? 300 : 900;
				} else {
					parameters.end = next + timeSpans;
					parameters.start = next;
					parameters.period = 14400;
				}
				return poloniex._privateAsync('returnChartData', parameters)
					.then((result) => {
						if (result && result.candleStick && result.candleStick.length > 1) {
							const volume = result.candleStick.reduce((acc, val) => {
								return acc + val.volume;
							}, 0);
							/*
							{"date":1405699200, "high":0.0045388,"low":0.00403001,"open":0.00404545,"close":0.00427592,
							"volume":44.11655644,"quoteVolume":10259.29079097,"weightedAverage":0.00430015}
							*/

							//const avgVol = volume / result.candleStick.length;
							const begin = result.candleStick[0].open;
							const end = result.candleStick[result.candleStick.length - 1].open;
							const diff = end - begin;
							const pct = (diff / begin) * 100;

							data.changes.push(pct);

							/*changes.push({
								pair: pair,
								name: name,
								changed: pct,
								vol: volume
							});*/
						} else {
							data.changes.push(0);
						}
						return Promise.delay(200);
					})
			})
			.then(() => {
				changes.push(data);
				return {};
			})
		})
		.then(() => {
			if (mode === 'series') {
				writeSeries(changes);
			} else if (mode === 'picks') {
				writePicks(changes);
			} else {
				writeIntervals(changes);
			}
			process.exit();
		})
	})
	.catch((err) => {
		console.error("ERROR!");
		console.error(err);
		process.exit();
	});
