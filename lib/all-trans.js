const Promise = require('bluebird');

const gdax = require('./exchanges/gdax');
const coinbase = require('./exchanges/coinbase');

const tranCounts = {};

return Promise.all([
	gdax.getAllTransactions(),
	coinbase.getAllTransactions()
])
.then(trx => {
	const gdaxTrans = trx[0];
	const cbTrans = trx[1];
	Object.keys(gdaxTrans).forEach(currency => {
		tranCounts[currency] = {
			gdax: gdaxTrans[currency].trx.length,
			cb: cbTrans[currency].trx.length
		};
	});
	console.log(tranCounts);
	process.exit();
});
