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
	return curr;
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
	const portfolio = allTrx.reduce((balances, trx) => {
		const currency = getCurrencyName(trx);
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

		return balances;
	}, {});
	const trimmed = {
		numWrong: 0,
		numValid: 0,
		numEmpty: 0,
		wrong: [],
		valid: [],
		empty: []
	};
	Object.keys(portfolio).forEach(currency => {
		const info = portfolio[currency];
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
