const Promise = require('bluebird');

const gdax = require('./exchanges/gdax');
const coinbase = require('./exchanges/coinbase');

const tranCounts = {};

return Promise.all([
	gdax.getAllTransactions(),
	coinbase.getAllTransactions()
])
.then(trans => {
	const gdaxTrans = trans[0];
	const cbTrans = trans[1];
	Object.keys(gdaxTrans).forEach(currency => {
		tranCounts[currency] = {
			gdax: gdaxTrans[currency].trans.length,
			cb: cbTrans[currency].trans.length
		};
	});
	console.log(tranCounts);
	process.exit();
});
