const Promise = require('bluebird');

const gdax = require('./exchanges/gdax');
const coinbase = require('./exchanges/coinbase');
const bitfinex = require('./exchanges/bitfinex');

const cryptodb = require('./mongo-db');

const tranCounts = {};

return Promise.all([
	gdax.getAllTransactions(),
	coinbase.getAllTransactions(),
	bitfinex.getAllTransactions(),
	cryptodb.connect()
])
.then(trx => {
	const gdaxTrans = trx[0];
	const cbTrans = trx[1];
	const bfxTrans = trx[2];
	const db = trx[3];
	const collgdax = db.collection('gdax');
	const collcoinbase = db.collection('coinbase');
	const collbitfinex = db.collection('bitfinex');
	Object.keys(gdaxTrans).forEach(currency => {
		tranCounts[currency] = {
			gdax: gdaxTrans[currency].trx.length,
			cb: cbTrans[currency].trx.length,
			bfx: 0
		};
	});
	Object.keys(bfxTrans).forEach(currency => {
		if (!tranCounts[currency]) {
			tranCounts[currency] = {
				gdax: 0,
				cb: 0,
				bfx: 0
			};
		}
		tranCounts[currency].bfx = bfxTrans[currency].trx.length;
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
