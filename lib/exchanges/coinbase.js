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

const getWithdrawalInfo = (trx) => {
	if (trx.type === 'exchange_deposit') {
		return {
			name: 'gdax'
		};
	}
	if (trx.type === 'fiat_withdrawal') {
		return {
			name: _.get(trx, 'details.payment_method_name')
		};
	}
	if (trx.type === 'send' && trx.to) {
		return trx.to;
	}
	return false;
};

const getDepositInfo = (trx) => {
	if (trx.type === 'exchange_withdrawal') {
		return {
			name: 'gdax'
		};
	}
	if (trx.type === 'fiat_deposit') {
		return {
			name: _.get(trx, 'details.payment_method_name')
		};
	}
	if (trx.type === 'send' && trx.from) {
		return trx.from;
	}
	return false;
};

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

module.exports = {
	/* Sample output
	"USD": {
	    "exchange": "coinbase",
	    "currency": "USD",
	    "trx": [
	      {
	        "exchange": "coinbase",
	        "type": "sell",
	        "currency": "USD",
	        "other_currency": "USD",
	        "date": "2017-02-27T22:29:09.000Z",
	        "ts": 1488234549000,
	        "amount": 810.21,
	        "change": 810.21,
	        "details": {
	          "id": "0a0932b1-d2b7-574c-ba0d-34b3603131c4",
	          "type": "sell",
	          "amount": {
	            "amount": "810.21",
	            "currency": "USD"
	          },
	          "native_amount": {
	            "amount": "810.21",
	            "currency": "USD"
	          },
	          "description": null,
	          "resource": "transaction",
	          "resource_path": "/v2/accounts/befbdbdd-1d43-5a6c-8241-f0c04e420680/transactions/0a0932b1-d2b7-574c-ba0d-34b3603131c4",
	          "instant_exchange": false,
	          "sell": {
	            "id": "235edf70-5af2-5b45-b536-7b433f5ae962",
	            "resource": "sell",
	            "resource_path": "/v2/accounts/00c7033e-81dd-5953-b544-dbc74d7ee1ad/sells/235edf70-5af2-5b45-b536-7b433f5ae962"
	          },
	          "details": {
	            "title": "Sold ethereum",
	            "subtitle": "using USD Wallet",
	            "payment_method_name": "USD Wallet"
	          },
	          "date": "2017-02-27T22:29:09.000Z",
	          "ts": 1488234549000,
	          "updated_date": "2017-02-27T22:29:10.000Z",
	          "updated_ts": 1488234550000,
	          "pair": "USD_USD"
	        }
	      },
	      {
	        "exchange": "coinbase",
	        "type": "buy",
	        "currency": "USD",
	        "other_currency": "USD",
	        "date": "2017-02-28T18:02:31.000Z",
	        "ts": 1488304951000,
	        "amount": 810.21,
	        "change": -810.21,
	        "details": {
	          "id": "d5155410-809d-5f65-a6d1-7deca0b8e8e9",
	          "type": "buy",
	          "amount": {
	            "amount": "-810.21",
	            "currency": "USD"
	          },
	          "native_amount": {
	            "amount": "-810.21",
	            "currency": "USD"
	          },
	          "description": null,
	          "resource": "transaction",
	          "resource_path": "/v2/accounts/befbdbdd-1d43-5a6c-8241-f0c04e420680/transactions/d5155410-809d-5f65-a6d1-7deca0b8e8e9",
	          "instant_exchange": false,
	          "buy": {
	            "id": "91a597a7-0791-5425-ae40-6611ccd570d2",
	            "resource": "buy",
	            "resource_path": "/v2/accounts/163dc9c9-8244-59d2-81c4-707723c3d63f/buys/91a597a7-0791-5425-ae40-6611ccd570d2"
	          },
	          "details": {
	            "title": "Bought bitcoin",
	            "subtitle": "using USD Wallet",
	            "payment_method_name": "USD Wallet"
	          },
	          "date": "2017-02-28T18:02:31.000Z",
	          "ts": 1488304951000,
	          "updated_date": "2017-02-28T18:02:31.000Z",
	          "updated_ts": 1488304951000,
	          "pair": "USD_USD"
	        }
	      },
	      {
	        "exchange": "coinbase",
	        "type": "fiat_withdrawal",
	        "currency": "USD",
	        "other_currency": "USD",
	        "date": "2017-05-27T20:21:55.000Z",
	        "ts": 1495916515000,
	        "amount": 2200,
	        "change": -2200,
	        "details": {
	          "id": "81cf557d-f2f1-5966-bba4-4d811012d889",
	          "type": "fiat_withdrawal",
	          "amount": {
	            "amount": "-2200.00",
	            "currency": "USD"
	          },
	          "native_amount": {
	            "amount": "-2200.00",
	            "currency": "USD"
	          },
	          "description": null,
	          "resource": "transaction",
	          "resource_path": "/v2/accounts/befbdbdd-1d43-5a6c-8241-f0c04e420680/transactions/81cf557d-f2f1-5966-bba4-4d811012d889",
	          "instant_exchange": false,
	          "fiat_withdrawal": {
	            "id": "62708c91-bfb0-58c5-b1a7-5bb86cf4a176",
	            "resource": "fiat_withdrawal",
	            "resource_path": "/v2/accounts/befbdbdd-1d43-5a6c-8241-f0c04e420680/withdrawals/62708c91-bfb0-58c5-b1a7-5bb86cf4a176"
	          },
	          "details": {
	            "title": "Withdrew funds",
	            "subtitle": "to Bank of America - Bank ********7645",
	            "payment_method_name": "Bank of America - Bank ********7645"
	          },
	          "date": "2017-05-27T20:21:55.000Z",
	          "ts": 1495916515000,
	          "updated_date": "2017-05-27T20:21:55.000Z",
	          "updated_ts": 1495916515000,
	          "pair": "USD_USD"
	        }
	      }]
	},
	"ETH": {
	    "exchange": "coinbase",
	    "currency": "ETH",
	    "trx": [
	        "exchange": "coinbase",
	        "type": "exchange_deposit",
	        "currency": "ETH",
	        "other_currency": "USD",
	        "date": "2017-05-27T03:09:06.000Z",
	        "ts": 1495854546000,
	        "amount": 51.99,
	        "change": -51.99,
	        "details": {
	          "id": "e1dab222-1850-56f1-ad08-e420fc7dfdd2",
	          "type": "exchange_deposit",
	          "amount": {
	            "amount": "-51.99000000",
	            "currency": "ETH"
	          },
	          "native_amount": {
	            "amount": "-8546.11",
	            "currency": "USD"
	          },
	          "description": null,
	          "resource": "transaction",
	          "resource_path": "/v2/accounts/00c7033e-81dd-5953-b544-dbc74d7ee1ad/transactions/e1dab222-1850-56f1-ad08-e420fc7dfdd2",
	          "instant_exchange": false,
	          "details": {
	            "title": "Transferred ethereum",
	            "subtitle": "to GDAX"
	          },
	          "date": "2017-05-27T03:09:06.000Z",
	          "ts": 1495854546000,
	          "updated_date": "2017-05-27T03:09:06.000Z",
	          "updated_ts": 1495854546000,
	          "pair": "ETH_USD"
	        }
	      },
	      {
	        "exchange": "coinbase",
	        "type": "sell",
	        "currency": "ETH",
	        "other_currency": "USD",
	        "date": "2017-05-27T09:55:56.000Z",
	        "ts": 1495878956000,
	        "amount": 2.63967238,
	        "change": -2.63967238,
	        "details": {
	          "id": "dc58fb02-9c00-51c5-bd0a-80494d0d7ee9",
	          "type": "sell",
	          "amount": {
	            "amount": "-2.63967238",
	            "currency": "ETH"
	          },
	          "native_amount": {
	            "amount": "-336.35",
	            "currency": "USD"
	          },
	          "description": null,
	          "resource": "transaction",
	          "resource_path": "/v2/accounts/00c7033e-81dd-5953-b544-dbc74d7ee1ad/transactions/dc58fb02-9c00-51c5-bd0a-80494d0d7ee9",
	          "instant_exchange": false,
	          "sell": {
	            "id": "4254e641-245f-5e3e-bd19-ed7804811325",
	            "resource": "sell",
	            "resource_path": "/v2/accounts/00c7033e-81dd-5953-b544-dbc74d7ee1ad/sells/4254e641-245f-5e3e-bd19-ed7804811325"
	          },
	          "details": {
	            "title": "Sold ethereum",
	            "subtitle": "using USD Wallet",
	            "payment_method_name": "USD Wallet"
	          },
	          "date": "2017-05-27T09:55:56.000Z",
	          "ts": 1495878956000,
	          "updated_date": "2017-05-27T09:55:56.000Z",
	          "updated_ts": 1495878956000,
	          "pair": "ETH_USD"
	        }
	      },
	      {
	        "exchange": "coinbase",
	        "type": "exchange_withdrawal",
	        "currency": "ETH",
	        "other_currency": "USD",
	        "date": "2017-05-27T17:48:58.000Z",
	        "ts": 1495907338000,
	        "amount": 61,
	        "change": 61,
	        "details": {
	          "id": "369b3732-0943-5789-a577-6ad7026c1ac7",
	          "type": "exchange_withdrawal",
	          "amount": {
	            "amount": "61.00000000",
	            "currency": "ETH"
	          },
	          "native_amount": {
	            "amount": "9871.63",
	            "currency": "USD"
	          },
	          "description": null,
	          "resource": "transaction",
	          "resource_path": "/v2/accounts/00c7033e-81dd-5953-b544-dbc74d7ee1ad/transactions/369b3732-0943-5789-a577-6ad7026c1ac7",
	          "instant_exchange": false,
	          "details": {
	            "title": "Transferred ethereum",
	            "subtitle": "from GDAX"
	          },
	          "date": "2017-05-27T17:48:58.000Z",
	          "ts": 1495907338000,
	          "updated_date": "2017-05-27T17:48:58.000Z",
	          "updated_ts": 1495907338000,
	          "pair": "ETH_USD"
	        }
	      },
	      {
	        "exchange": "coinbase",
	        "type": "send",
	        "currency": "ETH",
	        "other_currency": "USD",
	        "date": "2017-05-27T17:48:59.000Z",
	        "ts": 1495907339000,
	        "amount": 61,
	        "change": -61,
	        "details": {
	          "id": "3a54f509-cb64-5531-8ebf-b1c695ddff82",
	          "type": "send",
	          "amount": {
	            "amount": "-61.00000000",
	            "currency": "ETH"
	          },
	          "native_amount": {
	            "amount": "-9871.63",
	            "currency": "USD"
	          },
	          "description": null,
	          "resource": "transaction",
	          "resource_path": "/v2/accounts/00c7033e-81dd-5953-b544-dbc74d7ee1ad/transactions/3a54f509-cb64-5531-8ebf-b1c695ddff82",
	          "instant_exchange": false,
	          "network": {
	            "status": "confirmed",
	            "hash": "7c0a9cc9a55a8d6484a4d83623493bd3bd9fccb312f6ede759009a88fe8e37a0",
	            "transaction_fee": {
	              "amount": "0.00000000",
	              "currency": "ETH"
	            },
	            "transaction_amount": {
	              "amount": "61.00000000",
	              "currency": "ETH"
	            },
	            "confirmations": 96881
	          },
	          "to": {
	            "resource": "ethereum_address",
	            "address": "0x9d2c7d65e7dd4b8aaa1057cfe54057f453ddf43a"
	          },
	          "idem": "41d6911e-ba6e-4a44-8b9b-bdb922b90687",
	          "application": {
	            "id": "98563804-126a-5612-a8c3-80db56038519",
	            "resource": "application",
	            "resource_path": "/v2/applications/98563804-126a-5612-a8c3-80db56038519"
	          },
	          "details": {
	            "title": "Sent ethereum",
	            "subtitle": "to Ethereum address"
	          },
	          "date": "2017-05-27T17:48:59.000Z",
	          "ts": 1495907339000,
	          "updated_date": "2017-05-27T17:50:14.000Z",
	          "updated_ts": 1495907414000,
	          "pair": "ETH_USD"
	        }
	      },
	      {
	        "exchange": "coinbase",
	        "type": "buy",
	        "currency": "ETH",
	        "other_currency": "USD",
	        "date": "2017-05-27T18:03:49.000Z",
	        "ts": 1495908229000,
	        "amount": 30.51632327,
	        "change": 30.51632327,
	        "details": {
	          "id": "a51315ac-720b-5c45-9f05-c6a5e5ff96b9",
	          "type": "buy",
	          "amount": {
	            "amount": "30.51632327",
	            "currency": "ETH"
	          },
	          "native_amount": {
	            "amount": "5074.50",
	            "currency": "USD"
	          },
	          "description": null,
	          "resource": "transaction",
	          "resource_path": "/v2/accounts/00c7033e-81dd-5953-b544-dbc74d7ee1ad/transactions/a51315ac-720b-5c45-9f05-c6a5e5ff96b9",
	          "instant_exchange": false,
	          "buy": {
	            "id": "782a8f14-d121-51a5-b2e9-2aeea8365871",
	            "resource": "buy",
	            "resource_path": "/v2/accounts/00c7033e-81dd-5953-b544-dbc74d7ee1ad/buys/782a8f14-d121-51a5-b2e9-2aeea8365871"
	          },
	          "details": {
	            "title": "Bought ethereum",
	            "subtitle": "using USD Wallet",
	            "payment_method_name": "USD Wallet"
	          },
	          "date": "2017-05-27T18:03:49.000Z",
	          "ts": 1495908229000,
	          "updated_date": "2017-05-27T18:03:50.000Z",
	          "updated_ts": 1495908230000,
	          "pair": "ETH_USD"
	        }
	      }]
	}
	*/
	getAllTransactions: () => {
		return client.getAccountsAsync({})
			.then(accts => {
				return Promise.all(accts.map(acct => {
					return paginateLoop([], paginationInfo => {
						return acct.getTransactionsAsync(paginationInfo);
					})
					.then(rawData => {
						const trimmedTrx = rawData.map(trx => {
							return _.omit(trx, ['client', 'account']);
						});
						return {
							currency: acct.currency,
							name: acct.name,
							id: acct.id,
							type: acct.type,
							created_at: acct.created_at,
							updated_at: acct.updated_at,
							trx: trimmedTrx
						};
					})
				}));
			})
			.then(accounts => {
				const currencies = {};
				accounts.forEach(account => {
					const data = {
						exchange: 'coinbase',
						currency: account.currency,
						trx: []
					};
					account.trx.forEach(trx => {
						if (trx.status === 'completed') {
							const dt = moment(trx['created_at']);
							const otherCurr = _.get(trx, 'native_amount.currency');
							const updatedDt = moment(trx['updated_at']);
							const netAmount = parseNum(_.get(trx, 'amount.amount'));
							const details = _.merge({},
								_.omit(trx, ['status', 'created_at', 'updated_at']),
								{
									date: dt.toDate(),
									ts: +dt,
									updated_date: updatedDt.toDate(),
									updated_ts: +updatedDt
								});
							let newTrx = {
								exchange: 'coinbase',
								type: '',
								currency: account.currency,
								date: dt.toDate(),
								ts: +dt,
								amount: Math.abs(netAmount),
								change: netAmount,
								fill: details
							};
							let wdTgt = getWithdrawalInfo(trx);
							let dpTgt = (wdTgt) ? false : getDepositInfo(trx);
							if (wdTgt) {
								newTrx.type = 'withdrawal';
								newTrx.withdrawal_target = wdTgt;
							} else if (dpTgt) {
								newTrx.type = 'deposit';
								newTrx.deposit_source = dpTgt;
							} else if (trx.type === 'buy' || trx.type === 'sell') {
								const payName = _.get(trx, 'details.payment_method_name');
								// Buying and selling with USD Wallet creates duplicate transaction
								// in USD account history...just ignore this one
								if (newTrx.currency === 'USD' && payName === 'USD Wallet') {
									return;
								}

								newTrx.type = trx.type;
								newTrx.cost = parseNum(_.get(trx, 'native_amount.amount'));
								newTrx.price = newTrx.cost / newTrx.amount;
								newTrx.price_currency = otherCurr;

								// If buy or selling diretly from bank, add a deposit/withdrawal for consistancy
								if (payName !== 'USD Wallet') {
									if (trx.type === 'buy') {
										// For a buy, we'll add in deposit slightly before
										const fakeDt = moment((+dt) - 1);
										data.trx.push({
											pseudo: true,
											exchange: 'coinbase',
											type: 'deposit',
											currency: otherCurr,
											date: fakeDt.toDate(),
											ts: +fakeDt,
											amount: newTrx.cost,
											change: newTrx.cost,
											fill: details,
											deposit_source: {
												name: 'Bank (pseudo-deposit)'
											}
										});
									} else {
										data.trx.push(newTrx);
										// For a sell, we'll add a withdrawal slighty after
										const fakeDt = moment((+dt) + 1);
										newTrx = {
											pseudo: true,
											exchange: 'coinbase',
											type: 'withdrawal',
											currency: otherCurr,
											date: fakeDt.toDate(),
											ts: +fakeDt,
											amount: newTrx.cost,
											change: 0 - newTrx.cost,
											fill: details,
											withdrawal_target: {
												name: 'Bank (pseudo-withdrawal)'
											}
										};
									}
								}
							} else {
								console.error(`Invalid trx type ${trx.type}`);
								return;
							}

							data.trx.push(newTrx);
						}
					});
					data.trx.sort((x, y) => {
						return (+x.date) - (+y.date);
					});
					currencies[account.currency] = data;
				});
				return currencies;
			});
	}
}
