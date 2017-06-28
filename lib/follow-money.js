const Promise = require('bluebird');
const _ = require('lodash');
const moment = require('moment');
const cryptodb = require('./mongo-db');

const findPair = (trx, list) => {
	if (!list.length) {
		return -1;
	}
	const dt = moment(trx.date);
	return list.findIndex(next => {
		// Must be same currency
		if (next.currency !== trx.currency) {
			return false;
		}
		// Can't be on the same exchange
		if (next.exchange === trx.exchange) {
			return false;
		}
		// If they're more than an hour apart they're not a pair
		if (Math.abs(dt.diff(next.date, 'hours')) > 1) {
			return false;
		}
		// If the amounts are identical, we're good
		if (next.amount === trx.amount) {
			return true;
		}
		const dep = trx.type === 'deposit' ? trx : next;
		const wd = trx.type === 'withdrawal' ? trx : next;
		let realAmount = wd.real_amount ? wd.real_amount : wd.amount;
		const diff = Math.abs(dep.amount - realAmount);
		if (diff === 0 || diff < 0.001) {
			if (diff !== 0 && diff > 0.0000001) {
				console.log(`Ignoring difference of ${diff} with time diff of ${Math.abs(dt.diff(next.date, 'seconds'))}`);
			}
			return true;
		}
		return false;
	});
}

return cryptodb.connect()
.then(db => {
	const collgdax = db.collection('gdax');
	const collcoinbase = db.collection('coinbase');
	const collbitfinex = db.collection('bitfinex');
	const collbittrex = db.collection('bittrex');
	const collpoloniex = db.collection('poloniex');
	const collcryptopia = db.collection('cryptopia');

	return Promise.reduce([collgdax, collcoinbase, collbitfinex, collbittrex, collpoloniex, collcryptopia], (allTrx, coll) => {
		return coll.findAsync({
			type: { "$in": ['deposit', 'withdrawal'] }
		})
			.then(cursor => {
				return cursor.toArrayAsync();
			})
			.then(arr => {
				return allTrx.concat(arr);
			});
	}, [])
})
.then(transfers => {
	//console.log(`${transfers.length} transfers found`);
	transfers.sort((x, y) => {
		return (+x.date) - (+y.date);
	});
	const wds = [],
		dps = [],
		pairs = [];
	transfers.forEach(trx => {
		if (trx.type === 'withdrawal') {
			const idx = findPair(trx, dps);
			if (idx === -1) {
				wds.push(trx);
			} else {
				pairs.push([trx, dps.splice(idx, 1)[0]]);
			}
		} else {
			const idx = findPair(trx, wds);
			if (idx === -1) {
				dps.push(trx);
			} else {
				pairs.push([trx, wds.splice(idx, 1)[0]]);
			}
		}
	});
	console.log(JSON.stringify({
		deposits: dps,
		withdrawals: wds,
		pairCount: pairs.length,
		dpCount: dps.length,
		wdCount: wds.length
	}));
})
.then(() => {
	process.exit();
})
.catch(err => {
	console.error(err);
	process.exit();
});
