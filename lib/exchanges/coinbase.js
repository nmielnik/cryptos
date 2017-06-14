const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const parseNum = require('parse-decimal-number');

const coinbase = require('coinbase');
const CoinbaseClient = coinbase.Client;
const CoinbaseAccount = coinbase.model.Account;
Promise.promisifyAll(CoinbaseClient.prototype);
Promise.promisifyAll(CoinbaseAccount.prototype, { multiArgs: true });

const keys = require('../../api-key')['coinbase'];

const client = new CoinbaseClient({ apiKey: keys.api_key, apiSecret: keys.api_secret });

const paginateLoop = (results, request, pagination) => {
	if (pagination && pagination.next_uri) {
		return paginate(results, request, pagination);
	} else {
		return paginate(results, request);
	}
};

const paginate = (results, request, pagination) => {
	return request(pagination).then(res => {
		if (res[0] && res[0].length) {
			results = results.concat(res[0]);
		}
		if (res[1] && res[1].next_uri) {
			return paginateLoop(results, request, res[1])
				.then(allResults => {
					return allResults;
				});
		} else {
			return Promise.resolve(results);
		}
	})
};

return client.getAccountsAsync({})
	.then(accts => {
		return Promise.all(accts.map(acct => {
			return paginateLoop([], paginationInfo => {
				return acct.getTransactionsAsync(paginationInfo);
			})
			.then(rawData => {
				const trimmedTrx = rawData.map(trx => {
					return _.omit(trx, ['client', 'account', ]);
				});
				return {
					currency: acct.currency,
					name: acct.name,
					id: acct.id,
					type: acct.type,
					created_at: acct.created_at,
					updated_at: acct.updated_at,
					trans: trimmedTrx
				};
			})
		}));
	})
	.then(accounts => {
		const currencies = {};
		accounts.forEach(account => {
			const data = {
				exchange: 'coinbase',
				currency: account.currency
			};
			data.trans = account.trans.map(trx => {
				// convert coinbase tran into common style of trans
				return trx;
			});
			data.trans.sort((x, y) => {
				return (+x.date) - (+y.date);
			});
			currencies[account.currency] = data;
		});
		process.exit();
	})
	.catch(err => {
		console.error(err);
		process.exit();
	});

/* Example transactions
{
    "id": "672b15d8-584c-5888-ab37-d95f412afa0c",
    "type": "buy",
    "status": "completed",
    "amount": {
      "amount": "1.00000000",
      "currency": "BTC"
    },
    "native_amount": {
      "amount": "2195.53",
      "currency": "USD"
    },
    "description": null,
    "created_at": "2017-05-27T19:27:56Z",
    "updated_at": "2017-06-05T19:28:29Z",
    "resource": "transaction",
    "resource_path": "/v2/accounts/163dc9c9-8244-59d2-81c4-707723c3d63f/transactions/672b15d8-584c-5888-ab37-d95f412afa0c",
    "instant_exchange": false,
    "buy": {
      "id": "21d6d148-d011-543d-9d2e-3fff3c554947",
      "resource": "buy",
      "resource_path": "/v2/accounts/163dc9c9-8244-59d2-81c4-707723c3d63f/buys/21d6d148-d011-543d-9d2e-3fff3c554947"
    },
    "details": {
      "title": "Bought bitcoin",
      "subtitle": "using Bank of America - Bank ********7645",
      "payment_method_name": "Bank of America - Bank ********7645"
    }
  },
  {
    "id": "ce2fccfa-bf42-51e7-a1bd-24128254a73f",
    "type": "sell",
    "status": "completed",
    "amount": {
      "amount": "-2.24671000",
      "currency": "BTC"
    },
    "native_amount": {
      "amount": "-5000.51",
      "currency": "USD"
    },
    "description": null,
    "created_at": "2017-05-23T23:21:33Z",
    "updated_at": "2017-05-23T23:21:33Z",
    "resource": "transaction",
    "resource_path": "/v2/accounts/163dc9c9-8244-59d2-81c4-707723c3d63f/transactions/ce2fccfa-bf42-51e7-a1bd-24128254a73f",
    "instant_exchange": false,
    "sell": {
      "id": "6efc0b47-627f-5b27-9bce-99e351c6170c",
      "resource": "sell",
      "resource_path": "/v2/accounts/163dc9c9-8244-59d2-81c4-707723c3d63f/sells/6efc0b47-627f-5b27-9bce-99e351c6170c"
    },
    "details": {
      "title": "Sold bitcoin",
      "subtitle": "using Bank of America - Bank ********7645",
      "payment_method_name": "Bank of America - Bank ********7645"
    }
  },
  {
    "id": "fb563682-fe3f-55d0-a511-ae19690f9dee",
    "type": "send",
    "status": "completed",
    "amount": {
      "amount": "2.24671000",
      "currency": "BTC"
    },
    "native_amount": {
      "amount": "5016.85",
      "currency": "USD"
    },
    "description": null,
    "created_at": "2017-05-23T17:09:34Z",
    "updated_at": "2017-05-23T17:14:16Z",
    "resource": "transaction",
    "resource_path": "/v2/accounts/163dc9c9-8244-59d2-81c4-707723c3d63f/transactions/fb563682-fe3f-55d0-a511-ae19690f9dee",
    "instant_exchange": false,
    "network": {
      "status": "confirmed",
      "hash": "54241450b1d1ef6c9d1b0228579dab53d129868b1dce07288d84d31a31ed306d"
    },
    "from": {
      "resource": "bitcoin_network"
    },
    "details": {
      "title": "Received bitcoin",
      "subtitle": "from Bitcoin address"
    }
  },
*/
