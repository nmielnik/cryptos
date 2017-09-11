const Promise = require('bluebird');
const _ = require('lodash');
const moment = require('moment');
const cryptodb = require('./mongo-db');

const currencyNames = {
	'SAFEX': 'SEC',
	'DSH': 'DASH',
	'XMY': 'MYR'
};

const getCurrencyName = (trx) => {
	let curr = trx.currency || 'ZZZZ';
	if (currencyNames[curr]) {
		curr = currencyNames[curr];
	}
	let priceCurr = trx.price_currency || 'ZZZZ';
	if (currencyNames[priceCurr]) {
		priceCurr = currencyNames[priceCurr];
	}
	return {
		currency: curr,
		priceCurrency: priceCurr
	};
};

return cryptodb.connect()
.then(db => {
	const collgdax = db.collection('gdax');
	const collcoinbase = db.collection('coinbase');
	const collbitfinex = db.collection('bitfinex');
	const collbittrex = db.collection('bittrex');
	const collpoloniex = db.collection('poloniex');
	const collcryptopia = db.collection('cryptopia');
	const collbitstamp = db.collection('bitstamp');

	return Promise.reduce([collgdax, collcoinbase, collbitfinex, collbittrex, collpoloniex, collcryptopia, collbitstamp], (allTrx, coll) => {
		return coll.findAsync({
			type: { "$exists": true }
		})
			.then(cursor => {
				return cursor.toArrayAsync();
			})
			.then(arr => {
				return allTrx.concat(arr);
			});
	}, [])
})
.then(allTrx => {
	const { balances, spending } = allTrx.reduce((tracker, trx) => {
		const balances = tracker.balances;
		const {currency, priceCurrency } = getCurrencyName(trx);
		if (!balances[currency]) {
			balances[currency] = {
				currency: currency,
				balance: 0,
				exchanges: [],
				trx: {
					total: 0
				}
			};
		}
		balances[currency].balance += trx.change;
		if (balances[currency].exchanges.indexOf(trx.exchange) === -1) {
			balances[currency].exchanges.push(trx.exchange);
		}
		balances[currency].trx.total += 1;
		if (!balances[currency].trx[trx.type]) {
			balances[currency].trx[trx.type] = 0;
		}
		balances[currency].trx[trx.type] += 1;
		tracker.balances = balances;

		if (trx.type === 'buy' || trx.type === 'sell') {
			const spending = tracker.spending;
			if (!spending[priceCurrency]) {
				spending[priceCurrency] = {
					currency: priceCurrency,
					balance: 0,
					exchanges: [],
					trx: {
						total: 0
					}
				};
			}
			if (trx.exchange === 'cryptopia' || trx.exchange === 'poloniex' || trx.exchange === 'coinbase') {
				if (trx.type === 'buy' || trx.exchange === 'coinbase') {
					spending[priceCurrency].balance -= trx.cost;
				} else {
					spending[priceCurrency].balance += trx.cost;
				}
				if (spending[priceCurrency].exchanges.indexOf(trx.exchange) === -1) {
					spending[priceCurrency].exchanges.push(trx.exchange);
				}
				spending[priceCurrency].trx.total += 1;
				if (!spending[priceCurrency].trx[trx.type]) {
					spending[priceCurrency].trx[trx.type] = 0;
				}
				spending[priceCurrency].trx[trx.type] += 1;
			}
			tracker.spending = spending;
		}

		return tracker;
	}, {});
	const trimmed = {
		numWrong: 0,
		numValid: 0,
		numEmpty: 0,
		spending: spending,
		wrong: [],
		valid: [],
		empty: []
	};
	Object.keys(balances).forEach(currency => {
		const info = balances[currency];
		if (info.balance <= -1) {
			trimmed.wrong.push(info);
		} else if (info.balance > 0.001) {
			trimmed.valid.push(info);
		} else {
			trimmed.empty.push(currency);
		}
	});
	trimmed.numWrong = trimmed.wrong.length;
	trimmed.numValid = trimmed.valid.length;
	trimmed.numEmpty = trimmed.empty.length;
	console.log(JSON.stringify(trimmed));
	process.exit();
})
.catch(err => {
	console.error(err);
	process.exit();
});
