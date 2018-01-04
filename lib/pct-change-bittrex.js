const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));
const winston = require('winston');

const bittrex = require('./exchanges/bittrex');

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {showLevel: false, colorize: true});

//const mode = 'swings';
const mode = 'series';

const MAX_CACHED_TRADE_AGE_MINUTES = 180;
const CACHE_BETWEEN_TRADE_MINUTES = 1;
const NEW_COINS_PER_RUN = 20;
const MAX_TRADE_HISTORY_PER_REQUEST = 200;
const NUM_SERIES_ITERATIONS = 30;
const DELAY_SECONDS_PER_ITERATION = 60;

const MINUTE_COLUMNS = [5, 10, 15, 20, 30, 45, 60, 75, 90, 105, 120];

let coinsToInit = 0;

const bittrexCache = {

	readFromFile: () => {
		return require('../local/bittrex-history');
	},

	saveToFile: (cache) => {
		const toSave = bittrexCache.cleanupOldData(cache);
		const fileStr = `module.exports = ${JSON.stringify(toSave, null, 2)};`;
		return fs.writeFileAsync('./local/bittrex-history.js', fileStr, 'utf8');
	},

	populateCache: (cache) => {
		return bittrex.getMarkets()
			.then((markets) => {
				const toAdd = [];
				markets.forEach(mkt => {
					if (mkt['BaseCurrency'] === 'BTC' && !cache[mkt['MarketCurrency']]) {
						toAdd.push(mkt['MarketCurrency']);
					}
				});
				if (toAdd.length) {
					const promises = [];
					for (let i = 0; i < NEW_COINS_PER_RUN && i < (toAdd.length); i++) {
						const currCoin = toAdd[i];
						winston.log('info', `Fetching history for ${currCoin}`);
						//promises.push(bittrex.getMarketHistory(currCoin, MAX_TRADE_HISTORY_PER_REQUEST)
						promises.push(bittrex.getMarketCandles(currCoin)
							.then(trades => {
								return {
									coin: currCoin,
									trades: trades
								};
							}));
					}
					coinsToInit = toAdd.length - promises.length;
					return Promise.all(promises)
						.then(queries => {
							queries.forEach(tradeInfo => {
								if (tradeInfo.trades) {
									const trades = bittrexCache.convertRawTradeData(tradeInfo.trades);
									cache[tradeInfo.coin] = {
										coin: tradeInfo.coin,
										trades: trades
									};
								} else {
									winston.log('info', `Invalid trade data for ${tradeInfo.coin}`);
									winston.log('info', tradeInfo);
								}
							});
							return cache;
						});
				}
				return cache;
			});
	},

	cleanupOldData: (cache) => {
		const clean = {};
		Object.keys(cache).forEach(key => {
			const data = cache[key];
			if (data.trades.length) {
				const dtLast = moment(data.trades[0].ts);
				const newTrades = data.trades.filter(trade => {
					return dtLast.diff(moment(trade.ts), 'minutes') <= MAX_CACHED_TRADE_AGE_MINUTES;
				});
				clean[key] = {
					coin: data.coin,
					trades: newTrades
				};
			}
		});
		return clean;
	},

	convertRawTradeData: (rawTradeData) => {
		if (!rawTradeData || !rawTradeData.length) {
			console.error('No trades to process...');
			return [];
		}
		const trades = rawTradeData.map(data => {
			const dt = moment(data.TimeStamp + 'Z');
			return {
				ts: +dt,
				p: data.Price
			};
		});
		trades.sort((a, b) => {
			return b.ts - a.ts;
		});

		const origCount = trades.length;
		let lastTrade = trades[0];
		let dtLast = moment(lastTrade.ts);
		const reduced = [lastTrade];

		trades.forEach(trade => {
			let dt = moment(trade.ts);
			if (dtLast.diff(dt, 'minutes') >= CACHE_BETWEEN_TRADE_MINUTES) {
				lastTrade = trade;
				dtLast = dt;
				reduced.push(lastTrade);
			}
		});

		return reduced;
	}
};

const findBigSwings = (cached) => {
	const swings = [];
	Object.keys(cached).forEach(coin => {
		let trades = cached[coin].trades;
		if (trades.length) {
			let lastPrice = trades[0].p;
			let dtLast = moment(trades[0].ts);
			trades.some(trade => {
				let dtTrade = moment(trade.ts);
				let mins = dtLast.diff(dtTrade, 'minutes');
				if (mins > 0 && mins < 120) {
					let chg = lastPrice - trade.p;
					let pctChg = _.floor(((chg / trade.p) * 100), 2);
					let absChg = Math.abs(pctChg);
					if (absChg >= 5 || (absChg >= 2 && mins <= 5)) {
						swings.push({
							coin: coin,
							change: pctChg,
							minutes: mins
						});
						return true;
					}
				}
				return false;
			});
		}
	});

	swings.sort((a,b) => {
		return b.change - a.change;
	});
	swings.forEach(next => {
		winston.log('info', `${next.change}% in ${next.minutes} mins (${next.coin})`);
	});
};

const findSeriesData = (cached) => {
	const coins = [];
	Object.keys(cached).forEach(coin => {
		const vals = [];
		const trades = cached[coin].trades;
		if (trades.length) {
			const lastPrice = trades[0].p;
			const dtLast = moment(trades[0].ts);
			trades.some(trade => {
				if (vals.length >= MINUTE_COLUMNS.length) {
					return true;
				}
				const targetMins = MINUTE_COLUMNS[vals.length];
				const dtTrade = moment(trade.ts);
				const mins = dtLast.diff(dtTrade, 'minutes');
				if (mins >= targetMins) {
					const chg = lastPrice - trade.p;
					vals.push(_.floor(((chg / trade.p) * 100), 2));
				}
			});
			coins.push({
				coin: coin,
				cols: vals
			});
		}
	});
	const output = [];
	output.push(`coin,${MINUTE_COLUMNS.join(',')}`);
	coins.forEach(data => {
		output.push(`${data.coin},${data.cols.join(',')}`);
	});

	return output;
};

const doTheStuff = () => {
	const fileCache = bittrexCache.readFromFile();

	return Promise.all([
		bittrex.getMarketSummaries(),
		bittrexCache.populateCache(fileCache)
	])
	.then(res => {
		const tickers = res[0];
		const cached = res[1];
		let numUpdates = 0;
		tickers.forEach(ticker => {
			if (ticker["MarketName"].indexOf('BTC') === 0) {
				const coin = ticker["MarketName"].split('-')[1];
				if (cached[coin] && cached[coin].trades.length) {
					const lastTrade = cached[coin].trades[0];
					const dtTicker = moment(ticker["TimeStamp"] + 'Z');
					const dtLast = moment(lastTrade.ts);
					const diff = dtTicker.diff(moment(lastTrade.ts), 'minutes');
					if (diff >= CACHE_BETWEEN_TRADE_MINUTES) {
						//winston.log('info', `${diff} minutes since last trade for ${coin}, adding to history`);
						cached[coin].trades.unshift({
							ts: +dtTicker,
							p: ticker["Last"]
						});
						numUpdates++;
					}
				}
			}
		});
		winston.log('info', `New trades found for ${numUpdates} coins`);

		// Save before passing along
		return bittrexCache.saveToFile(cached)
			.then(() => {
				return cached;
			});
	})
	.then(cached => {
		if (mode === 'swings') {
			findBigSwings();
		} else if (mode === 'series') {
			const output = findSeriesData(cached);
			//winston.log('info', output.join('\n'));
			const filePath = `./local/bittrex-series-${moment().format('YYYY-MM-DD-hh-mm-ss')}.csv`;
			return fs.writeFileAsync(filePath, output.join('\n'), 'utf8');
		}
	})
};

const iterations = [];
for (let i = 0; i < NUM_SERIES_ITERATIONS; i++) {
	iterations.push(i);
}

return Promise.each(iterations, (iter) => {
	return doTheStuff()
		.then(() => {
			if (coinsToInit) {
				winston.log('info', `${coinsToInit} coins left to init, sleeping for 5 seconds`);
				return Promise.delay(5000);
			} else {
				winston.log('info', `iteration ${iter} complete, sleeping ${DELAY_SECONDS_PER_ITERATION} seconds`);
				return Promise.delay(DELAY_SECONDS_PER_ITERATION * 1000);
			}
		})
		.then(() => {
			return {};
		});
})
.then(() => {
	process.exit();
})
.catch(err => {
	console.error(err);
	process.exit();
});
