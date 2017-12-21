const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));

const bittrex = require('./exchanges/bittrex');
const tradeRules = require('../trade-rules');
const bittrexApi = require('node-bittrex-api');
bittrexApi.options({
  'apikey' : require('../api-key').bittrex.api_key,
  'apisecret' : require('../api-key').bittrex.api_secret,
});

const mode = 'swings';
// const mode = 'series';

const MAX_CACHED_TRADE_AGE_MINUTES = 180;
const CACHE_BETWEEN_TRADE_MINUTES = 2;
const NEW_COINS_PER_RUN = 40;
const MAX_TRADE_HISTORY_PER_REQUEST = 200;
const NUM_SERIES_ITERATIONS = 30;
const DELAY_SECONDS_PER_ITERATION = 120;
const BITTREX_FEE = 0.0025;

const MINUTE_COLUMNS = [5, 10, 15, 20, 30, 45, 60, 75, 90, 105, 120];

let coinsToInit = 0;
let iter = 0;

let holdings = require('../local/bittrex-holdings');

const bittrexCache = {

	readFromFile: () => {
		return require('../local/bittrex-history');
	},

	readHoldingsFromFile: () => {
		return require('../local/bittrex-holdings');
	},

	saveHoldingsToFile: (holdings) => {
		const fileStr = `module.exports = ${JSON.stringify(holdings, null, 2)};`;
		return fs.writeFileAsync('./local/bittrex-holdings.js', fileStr, 'utf8');
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
						console.log(`Fetching history for ${currCoin}`);
						promises.push(bittrex.getMarketHistory(currCoin, MAX_TRADE_HISTORY_PER_REQUEST)
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
								if (tradeInfo.trades && tradeInfo.trades.length > 0) {
									const trades = bittrexCache.convertRawTradeData(tradeInfo.trades);
									cache[tradeInfo.coin] = {
										coin: tradeInfo.coin,
										trades: trades
									};
								} else {
									// console.log(`Invalid trade data for ${tradeInfo.coin}`);
									// console.log(tradeInfo);
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
		const trades = rawTradeData.map(data => {
			const dt = moment(data.TimeStamp + 'Z');
			return {
				ts: +dt,
				price: data.Price
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
			let lastPrice = trades[0].price;
			let dtLast = moment(trades[0].ts);
			trades.some(trade => {
				let dtTrade = moment(trade.ts);
				let mins = dtLast.diff(dtTrade, 'minutes');
				if (mins > 0 && mins < 120) {

					let chg = lastPrice - trade.price;
					let pctChg = _.floor(((chg / trade.price) * 100), 2);
					let absChg = Math.abs(pctChg);

					let coinPctChg = _.floor((((lastPrice - _.get(holdings.heldCoins, [coin, 'buyPrice'])) / trade.price) * 100), 2);
					if (coinPctChg) {
						// console.log('coinPctChg', coin, lastPrice, coinPctChg);
					}

					if (_.size(holdings.heldCoins) < tradeRules.maxCoins &&
						pctChg >= tradeRules.thresholdPct &&
						mins >= tradeRules.thresholdMins &&
						!_.get(holdings, ['heldCoins', coin]) && // coin isn't currently held
						(!_.get(holdings.soldCoins, [coin, 'buyTime']) || (_.get(holdings.soldCoins, [coin, 'buyTime']) + tradeRules.cooldown) <= iter) // cooldown is expired
						) {
						console.log(`buying ${holdings.free / tradeRules.maxCoins} BTC of ${coin} at ${lastPrice}`);
						const purchaseAmountInBtc = holdings.free / tradeRules.maxCoins;
						const purchasedCoins = (purchaseAmountInBtc * (1 - BITTREX_FEE)) / lastPrice;

						bittrexApi.tradebuy({
						  MarketName: `BTC-${coin}`,
						  OrderType: 'LIMIT',
						  Quantity: purchasedCoins,
						  Rate: lastPrice,
						  TimeInEffect: 'GOOD_TIL_CANCELLED', // supported options are 'IMMEDIATE_OR_CANCEL', 'GOOD_TIL_CANCELLED', 'FILL_OR_KILL'
						  ConditionType: 'NONE', // supported options are 'NONE', 'GREATER_THAN', 'LESS_THAN'
						  Target: 0, // used in conjunction with ConditionType
						}, function(data, err) {
							console.log(data, err);
							if (!err) {
								holdings.heldCoins[coin] = {
									buyPrice: lastPrice,
									buyTime: iter,
									amount: purchasedCoins
								};
								holdings.free = holdings.free - purchaseAmountInBtc;
								bittrexCache.saveHoldingsToFile(holdings);
							} else {
								console.log(`Error buying ${coin}: ${err}`);
							}
						});

						return true;
					} else if (_.get(holdings, ['heldCoins', coin]) && coinPctChg > tradeRules.targetGrowth) {
						console.log(`selling ${_.get(holdings, ['heldCoins', coin, 'amount'])} ${coin} at ${lastPrice}`);
						bittrexApi.tradesell({
							MarketName: `BTC-${coin}`,
							OrderType: 'LIMIT',
							Quantity: holdings.heldCoins[coin].amount,
							Rate: lastPrice,
							TimeInEffect: 'GOOD_TIL_CANCELLED', // supported options are 'IMMEDIATE_OR_CANCEL', 'GOOD_TIL_CANCELLED', 'FILL_OR_KILL'
							ConditionType: 'NONE', // supported options are 'NONE', 'GREATER_THAN', 'LESS_THAN'
							Target: 0, // used in conjunction with ConditionType
						}, function(data, err) {
							if (!err) {
								holdings.soldCoins[coin] = holdings.heldCoins[coin];
								holdings.soldCoins[coin].sellPrice = lastPrice;
								holdings.free = holdings.free + lastPrice * holdings.soldCoins[coin].amount * (1 - BITTREX_FEE);
								delete holdings.heldCoins[coin];
								bittrexCache.saveHoldingsToFile(holdings);
							} else {
								console.log(`Error selling ${coin}: ${err}`);
							}
						});

						return true;
					}

					if (pctChg > 0 && (absChg >= tradeRules.thresholdPct && mins >= tradeRules.thresholdMins)) {
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
		// console.log(`${next.change}% in ${next.minutes} mins (${next.coin})`);
	});
};

const findSeriesData = (cached) => {
	const coins = [];
	Object.keys(cached).forEach(coin => {
		const vals = [];
		const trades = cached[coin].trades;
		if (trades.length) {
			const lastPrice = trades[0].price;
			const dtLast = moment(trades[0].ts);
			trades.some(trade => {
				if (vals.length >= MINUTE_COLUMNS.length) {
					return true;
				}
				const targetMins = MINUTE_COLUMNS[vals.length];
				const dtTrade = moment(trade.ts);
				const mins = dtLast.diff(dtTrade, 'minutes');
				if (mins >= targetMins) {
					const chg = lastPrice - trade.price;
					vals.push(_.floor(((chg / trade.price) * 100), 2));
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
	const holdings = bittrexCache.readHoldingsFromFile();

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
						//console.log(`${diff} minutes since last trade for ${coin}, adding to history`);
						cached[coin].trades.unshift({
							ts: +dtTicker,
							price: ticker["Last"]
						});
						numUpdates++;
					}
				}
			}
		});
		console.log(`New trades found for ${numUpdates} coins`);

		// Save before passing along
		return bittrexCache.saveToFile(cached)
			.then(() => {
				return cached;
			});
	})
	.then(cached => {
		if (mode === 'swings') {
			findBigSwings(cached);
		} else if (mode === 'series') {
			const output = findSeriesData(cached);
			//console.log(output.join('\n'));
			const filePath = `./local/bittrex-series-${moment().format('YYYY-MM-DD-hh-mm-ss')}.csv`;
			return fs.writeFileAsync(filePath, output.join('\n'), 'utf8');
		}
	})
};

const iterations = [];
for (let i = 0; i < NUM_SERIES_ITERATIONS; i++) {
	iterations.push(i);
}


(function loop() {
    doTheStuff()
	.then(() => {
		iter++;
		if (coinsToInit) {
			console.log(`${coinsToInit} coins left to init, sleeping for 5 seconds`);
			return Promise.delay(5000);
		} else {
			console.log(`iteration ${iter} complete, sleeping ${DELAY_SECONDS_PER_ITERATION} seconds`);
			return Promise.delay(DELAY_SECONDS_PER_ITERATION * 1000);
		}
	})
	.then(() => {
		loop();
	})
	.catch(err => {
		console.error(err);
		process.exit();
	});
})(0);
