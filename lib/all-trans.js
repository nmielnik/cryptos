const Promise = require('bluebird');

const gdax = require('./exchanges/gdax');
const coinbase = require('./exchanges/coinbase');

const cryptodb = require('./mongo-db');

const tranCounts = {};

return Promise.all([
	gdax.getAllTransactions(),
	coinbase.getAllTransactions(),
	cryptodb.connect()
])
.then(trx => {
	const gdaxTrans = trx[0];
	const cbTrans = trx[1];
	const db = trx[2];
	const collgdax = db.collection('gdax');
	const collcoinbase = db.collection('coinbase');
	Object.keys(gdaxTrans).forEach(currency => {
		tranCounts[currency] = {
			gdax: gdaxTrans[currency].trx.length,
			cb: cbTrans[currency].trx.length
		};
	});

	/*
	return Promise.each(Object.keys(gdaxTrans), currency => {
		return Promise.all([
			collgdax.insertAsync(gdaxTrans[currency].trx),
			collcoinbase.insertAsync(cbTrans[currency].trx)
		])
		.then(res => {
			console.log(`Results for ${currency}:`);
			console.log(res);
		})
		.then(() => {
			return tranCounts;
		})
	});*/
	return tranCounts;
})
.then(counts => {
	console.log(counts);
	process.exit();
})
