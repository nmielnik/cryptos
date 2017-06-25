const Promise = require('bluebird');

const gdax = require('./exchanges/gdax');
const coinbase = require('./exchanges/coinbase');
const bitfinex = require('./exchanges/bitfinex');
const bittrex = require('./exchanges/bittrex');

const cryptodb = require('./mongo-db');

const tranCounts = {};

return Promise.all([
	cryptodb.connect(),
	gdax.getAllTransactions().catch(err => {
		console.error('gdax failed');
		console.error(err);
		return {};
	}),
	coinbase.getAllTransactions().catch(err => {
		console.error('coinbase failed');
		console.error(err);
		return {};
	}),
	bitfinex.getAllTransactions().catch(err => {
		console.error('bitfinex failed');
		console.error(err);
		return {};
	}),
	bittrex.getAllTransactions().catch(err => {
		console.error('bittrex failed');
		console.error(err);
		return {};
	})
])
.then(trx => {
	const db = trx[0];
	const gdaxTrans = trx[1];
	const cbTrans = trx[2];
	const bfxTrans = trx[3];
	const bxTrans = trx[4];

	const collgdax = db.collection('gdax');
	const collcoinbase = db.collection('coinbase');
	const collbitfinex = db.collection('bitfinex');
	const collbittrex = db.collection('bittrex');

	Object.keys(gdaxTrans).forEach(currency => {
		tranCounts[currency] = {
			gdax: gdaxTrans[currency].trx.length,
			cb: cbTrans[currency].trx.length,
			bfx: 0,
			bx: 0
		};
	});
	Object.keys(bfxTrans).forEach(currency => {
		if (!tranCounts[currency]) {
			tranCounts[currency] = {
				gdax: 0,
				cb: 0,
				bx: 0
			};
		}
		tranCounts[currency].bfx = bfxTrans[currency].trx.length;
	});
	Object.keys(bxTrans).forEach(currency => {
		if (!tranCounts[currency]) {
			tranCounts[currency] = {
				gdax: 0,
				cb: 0,
				bfx: 0
			};
		}
		tranCounts[currency].bx = bxTrans[currency].trx.length;
	});

	return Promise.each(Object.keys(tranCounts), currency => {
		const toResolve = [];
		if (gdaxTrans[currency] && gdaxTrans[currency].trx.length) {
			toResolve.push(collgdax.insertAsync(gdaxTrans[currency].trx)
				.then(res => {
					return res.result;
				}));
		}
		if (cbTrans[currency] && cbTrans[currency].trx.length) {
			toResolve.push(collcoinbase.insertAsync(cbTrans[currency].trx)
				.then(res => {
					return res.result;
				}));
		}
		if (bfxTrans[currency] && bfxTrans[currency].trx.length) {
			toResolve.push(collbitfinex.insertAsync(bfxTrans[currency].trx)
				.then(res => {
					return res.result;
				}));
		}
		if (bxTrans[currency] && bxTrans[currency].trx.length) {
			toResolve.push(collbittrex.insertAsync(bxTrans[currency].trx)
				.then(res => {
					return res.result;
				}));
		}
		return Promise.all(toResolve)
			.then(res => {
				console.log(`Results for ${currency}:`);
				console.log(res);
			});
	})
	.then(() => {
		return tranCounts;
	});

	//return tranCounts;
})
.then(counts => {
	console.log(counts);
	process.exit();
})
.catch(err => {
	console.error(err);
	process.exit();
});
