const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));

const bittrex = require('./exchanges/bittrex');

const MAX_CACHED_TRADE_AGE_MINUTES = 120;
const CACHE_BETWEEN_TRADE_MINUTES = 2;
const NEW_COINS_PER_RUN = 40;
const MAX_TRADE_HISTORY_PER_REQUEST = 200;

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
					for (let i = 0; i < NEW_COINS_PER_RUN && i < (toAdd.length - 1); i++) {
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
					return Promise.all(promises)
						.then(queries => {
							queries.forEach(tradeInfo => {
								const trades = bittrexCache.convertRawTradeData(tradeInfo.trades);
								cache[tradeInfo.coin] = {
									coin: tradeInfo.coin,
									trades: trades
								};
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
		console.log(`${next.change}% in ${next.minutes} mins (${next.coin})`);
	});

	process.exit();
})
.catch(err => {
	console.error(err);
	process.exit();
});