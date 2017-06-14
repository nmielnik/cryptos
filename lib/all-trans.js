const gdax = require('./exchanges/gdax');

return gdax.getAllTransactions()
	.then(gdaxTrans => {
		console.log(JSON.stringify(gdaxTrans));
		process.exit();
	})
	.catch(err => {
		console.error(err);
		process.exit();
	});
