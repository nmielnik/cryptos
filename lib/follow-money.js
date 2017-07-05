const Promise = require('bluebird');
const _ = require('lodash');
const moment = require('moment');
const cryptodb = require('./mongo-db');

const wallets = require('./wallets');

const exceptions = {
	currency: {
		'SEC': 'SAFEX',
		'SAFEX': 'SEC',
		'DASH': 'DSH',
		'DSH': 'DASH'
	},
	time: {
		'BTC': {
			maxHours: 4
		},
		'XMR': {
			maxHours: 6
		}
	},
	diff: {
		'XRP': 0.31,
		'ETH': 0.003,
		'ETC': 0.02,
		'BTC': 0.02,
		'XVG': 2,
		'NXT': 1,
		'SAFEX': 2,
		'SEC': 2,
		'DOGE': 6,
		'LSK': 0.1,
		'XMR': 0.03,
		'DASH': 0.01,
		'DSH': 0.01,
		'LTC': 0.002
	}
};

const SPECIAL_IDS = [];
//const SPECIAL_IDS = ['5957422fbf8aac8937a37c4c', '5956a83abceb505c710fe60f'];

const findPair = (trx, list) => {
	if (!list.length) {
		return -1;
	}
	const dt = moment(trx.date);
	return list.findIndex(next => {
		// Must be same currency
		if (next.currency !== trx.currency && (!exceptions.currency[next.currency] || exceptions.currency[next.currency] !== trx.currency)) {
			return false;
		}
		// Can't be on the same exchange
		if (next.exchange === trx.exchange) {
			return false;
		}
		// If they're more than 4 hours apart they're not a pair
		const hourDiff = Math.abs(dt.diff(next.date, 'hours'));
		if (SPECIAL_IDS.indexOf('' + trx._id) !== -1 && SPECIAL_IDS.indexOf('' + next._id) !== -1) {
			console.log(`^^^^^^ hourDiff: ${hourDiff}`);
		}
		if (hourDiff > 1 && (!exceptions.time[next.currency] || hourDiff > exceptions.time[next.currency].maxHours)) {
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
		if (SPECIAL_IDS.indexOf('' + trx._id) !== -1 && SPECIAL_IDS.indexOf('' + next._id) !== -1) {
			console.log(`^^^^^^ amountDiff: ${diff}`);
		}
		if (diff === 0 || diff < 0.001 || (exceptions.diff[next.currency] && diff <= exceptions.diff[next.currency])) {
			/*if (diff !== 0 && diff > 0.0000001) {
				console.log(`Ignoring difference of ${diff} with time diff of ${Math.abs(dt.diff(next.date, 'seconds'))}`);
			}*/
			return true;
		}
		return false;
	});
};

const findWallet = (trx) => {
	let addr = _.get(trx, 'fill.address') || _.get(trx, 'move.address') || _.get(trx, 'fill.Address') || _.get(trx, 'withdrawal_target.address');
	if (!addr) {
		return false;
	}
	if (trx.exchange === 'bittrex' && addr.indexOf(':') !== -1) {
		addr = addr.split(':')[0];
	}

	if (wallets[addr]) {
		let wallet = wallets[addr];
		if (wallet.subId) {
			wallet = wallet[wallet.defaultId];
		}
		return wallet;
	}
	return false;
};

const getWithdrawalCategory = (trx) => {
	const wdTarget = _.get(trx, 'withdrawal_target.name');
	if (wdTarget && wdTarget.indexOf('Bank') === 0) {
		return 'bank';
	}
	const targetId = _.get(trx, 'withdrawal_target.id');
	// Steve & Ayo
	if (targetId && (targetId === '07c7aa7d-552b-5ac7-83ae-57892f36eabb' || targetId === 'fe6b4482-13f5-531f-bcb9-f549154c7adf')) {
		return 'known';
	}
	return 'other';
};

const getDepositCategory = (trx) => {
	const depSrc = _.get(trx, 'deposit_source.name');
	if (depSrc) {
		if (depSrc.indexOf('Bank') === 0) {
			return 'bank'
		}
		if (depSrc === 'gdax') {
			return 'gdaxIssues';
		}
	}
	const targetId = _.get(trx, 'deposit_source.id');
	// Idris
	if (targetId && targetId === 'afbcb8ce-930c-57bc-b3e9-3c2d8ad6d3a5') {
		return 'known';
	}
	return 'other';
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
	const wds = { other: [], known: [], bank: [] },
		dps = { other: [], known: [], bank: [] },
		pairs = [],
		otherTrans = [],
		externalTrans = [],
		canceled = [],
		usdDepositPairs = [];
	transfers.forEach(trx => {
		if (_.get(trx, 'move.description') && _.get(trx, 'move.description').indexOf('canceled by User') !== -1) {
			canceled.push(trx);
			return;
		}
		if (_.get(trx, 'fill.Canceled')) {
			canceled.push(trx);
			return;
		}
		if (trx.type === 'withdrawal') {
			const idx = findPair(trx, dps['other']);
			if (idx === -1) {
				let wall = findWallet(trx);
				if (wall) {
					if (wall.owner === 'Anon') {
						otherTrans.push(trx);
					} else if (wall.owner === 'Nate') {
						externalTrans.push(trx);
					} else {
						wds['known'].push(trx);
					}
				} else {
					const cat = getWithdrawalCategory(trx);
					if (!wds[cat]) {
						wds[cat] = [];
					}
					wds[cat].push(trx);
				}
			} else {
				const matchDep = dps['other'].splice(idx, 1)[0];
				pairs.push([trx, matchDep]);
				if (matchDep.currency === 'USD') {
					usdDepositPairs.push([trx, matchDep]);
				}
			}
		} else {
			const idx = findPair(trx, wds['other']);
			if (idx === -1) {
				let wall = findWallet(trx);
				if (wall) {
					if (wall.owner === 'Anon') {
						otherTrans.push(trx);
					} else if (wall.owner === 'Nate') {
						externalTrans.push(trx);
					} else {
						dps['known'].push(trx);
					}
				} else {
					const cat = getDepositCategory(trx);
					if (!dps[cat]) {
						dps[cat] = [];
					}
					dps[cat].push(trx);
				}
			} else {
				const matchWd = wds['other'].splice(idx, 1)[0];
				pairs.push([trx, matchWd]);
				if (trx.currency === 'USD') {
					usdDepositPairs.push([trx, matchWd]);
				}
			}
		}
	});
	const fullList = [].concat(dps['other']).concat(wds['other']);
	fullList.sort((x, y) => {
		return (+x.date) - (+y.date);
	});
	const bankList = [].concat(dps['bank']).concat(wds['bank']);
	bankList.sort((x, y) => {
		return (+x.date) - (+y.date);
	});
	const summary = {
		pairCount: pairs.length,
		otherCount: otherTrans.length,
		canceled: canceled.length
	};
	Object.keys(dps).forEach(dpName => {
		summary[`dps.${dpName}`] = dps[dpName].length;
	});
	Object.keys(wds).forEach(wdName => {
		summary[`wds.${wdName}`] = wds[wdName].length;
	});
	summary['list'] = fullList;
	/*summary['list'] = fullList.map(next => {
		return _.pick(next, ['exchange', 'type', 'currency', 'amount', 'change', 'date', 'fill']);
	});*/
	//console.log(JSON.stringify(bankList));
	//console.log(JSON.stringify(pairs));
	console.log(JSON.stringify(summary));
	//console.log(JSON.stringify(usdDepositPairs));
})
.then(() => {
	process.exit();
})
.catch(err => {
	console.error(err);
	process.exit();
});
