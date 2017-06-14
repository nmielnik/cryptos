const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const parseNum = require('parse-decimal-number');

const gdax = require('gdax');
const AuthenticatedClient = gdax.AuthenticatedClient;
Promise.promisifyAll(AuthenticatedClient.prototype, { multiArgs: true });

const keys = require('../../api-key')['gdax'];

const authedClient = new AuthenticatedClient(keys.api_key, keys.api_secret, keys.pass_phrase);

const paginateLoop = (results, request, cbAfter) => {
	if (cbAfter) {
		return paginate(results, request, { after: cbAfter });
	} else {
		return paginate(results, request);
	}
};

const paginate = (results, request, query) => {
	return request(query).then(res => {
		//console.log(`${res[1].length} paginated results`);
		if (res[1] && res[1].length) {
			results = results.concat(res[1]);
		}
		if (res[0].headers && res[0].headers['cb-after']) {
			return paginateLoop(results, request, res[0].headers['cb-after'])
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
	"ETH": {
	    "exchange": "gdax",
	    "currency": "ETH",
	    "trans": [
	      {
	        "exchange": "gdax",
	        "type": "deposit",
	        "currency": "ETH",
	        "date": "2017-05-27T03:09:06.707Z",
	        "ts": 1495854546707,
	        "amount": 51.99,
	        "change": 51.99
	      },
	      {
	        "exchange": "gdax",
	        "type": "sell",
	        "currency": "ETH",
	        "date": "2017-05-27T03:32:38.588Z",
	        "ts": 1495855958588,
	        "amount": 1.561215,
	        "change": -1.561215,
	        "fill": {
	          "type": "sell",
	          "amount": 1.561215,
	          "price": 160.2,
	          "fee": 0,
	          "fee_type": "Maker",
	          "date": "2017-05-27T03:32:38.588Z",
	          "ts": 1495855958588,
	          "pair": "ETH_USD",
	          "order_id": "23be4828-e539-48cb-9a7b-64f1a2dc9dd4",
	          "trade_id": 4738917
	        }
	      },
	      ...
	},
	"LTC": { ... }
	}
	*/
	getAllTransactions: () => {
		const accounts = {};

		// Build an order collection using all fills
		const orders = {};

		return paginateLoop([], query => {
			return query ? authedClient.getFillsAsync(query) : authedClient.getFillsAsync();
		})
		.then(allFills => {
			/* Fills
			{ created_at: '2017-06-07T07:06:06.975Z',
			  trade_id: 16387982,
			  product_id: 'BTC-USD',
			  order_id: '21a6258c-6981-4e91-b2e5-6b834be8e738',
			  user_id: '516308ba325d1a0f49000005',
			  profile_id: '5dc5e714-0405-4cb8-af0d-d7310beb53ed',
			  liquidity: 'M',
			  price: '2806.00000000',
			  size: '0.71891175',
			  fee: '0.0000000000000000',
			  side: 'sell',
			  settled: true }
			*/
			const liquidities = ['M', 'T'];
			allFills.forEach(fill => {
				if (!orders[fill['order_id']]) {
					orders[fill['order_id']] = {};
				}
				if (orders[fill['order_id']][fill['trade_id']]) {
					throw new Error(`Duplicate Trades ${fill.order_id} + ${fill.trade_id}`);
				}
				if (liquidities.indexOf(fill['liquidity']) === -1) {
					throw new Error(`Invalid liquidity ${fill.liquidity}`);
				}
				const dt = moment(fill['created_at']);
				const pair = fill['product_id'].split('-');
				orders[fill['order_id']][fill['trade_id']] = {
					type: fill['side'],
					amount: parseNum(fill['size']),
					price: parseNum(fill['price']),
					fee: parseNum(fill['fee']),
					fee_type: fill['liquidity'] === 'M' ? 'Maker' : 'Taker',
					date: dt.toDate(),
					ts: +dt,
					pair: `${pair[0]}_${pair[1]}`,
					order_id: fill['order_id'],
					trade_id: fill['trade_id']
				};
			});

			// Get all accounts and the account history for each one
			return authedClient.getAccountsAsync()
				.then(res => {
					/* Accounts
					{ id: '3484e356-1502-4cc8-b22b-51692d3d16f3',
					    currency: 'USD',
					    balance: '0.0011729622075500',
					    available: '0.0011729622075500',
					    hold: '0.0000000000000000',
					    profile_id: '5dc5e714-0405-4cb8-af0d-d7310beb53ed' }
					*/
					res[1].forEach(account => {
						accounts[account.currency] = account;
					});

					const accountQueries = Object.keys(accounts).map(currency => {
						let accountInfo = accounts[currency];
						return paginateLoop([], query => {
							return query ? authedClient.getAccountHistoryAsync(accountInfo.id, query) : authedClient.getAccountHistoryAsync(accountInfo.id);
						})
						.then(accountHistory => {
							accountInfo.history = accountHistory;
							return accountInfo;
						})
					});

					return Promise.all(accountQueries);
				});
		})
		.then(accountHistories => {
			const currencies = {};
			const transferTypes = ['deposit', 'withdraw'];
			accountHistories.forEach(accountInfo => {
				const data = {
					exchange: 'gdax',
					currency: accountInfo.currency
				};
				/* Account History
				{ created_at: '2017-05-28T06:23:13.865145Z',
				    id: 160186377,
				    amount: '-9.4000000000000000',
				    balance: '0.0000000000000000',
				    type: 'transfer',
				    details:
				     { transfer_id: 'b61e513b-d004-4ebe-8f60-fed48e7cfa09',
				       transfer_type: 'withdraw' } },
				{ created_at: '2017-05-28T06:22:02.794009Z',
				    id: 160185758,
				    amount: '9.3742573900000000',
				    balance: '9.4000000000000000',
				    type: 'match',
				    details:
				     { order_id: '549bebbb-0caf-46db-a5d9-e26969784e22',
				       trade_id: '4851312',
				       product_id: 'ETH-USD' } }
				*/
				data.trans = accountInfo.history.map(action => {
					if (action.type === 'transfer') {
						const transferType = _.get(action, 'details.transfer_type');
						if (transferTypes.indexOf(transferType) === -1) {
							console.error(action);
							throw new Error('invalid "transfer"');
						}
						const dt = moment(action['created_at']);
						const netAmount = parseNum(action['amount']);
						const tran = {
							exchange: 'gdax',
							type: transferType,
							currency: accountInfo.currency,
							date: dt.toDate(),
							ts: +dt,
							amount: Math.abs(netAmount),
							change: netAmount
						};
						return tran;
					} else if (action.type === 'match' || action.type === 'fee') {
						const orderId = _.get(action, 'details.order_id');
						const tradeId = _.get(action, 'details.trade_id');
						if (!orderId || !orders[orderId] || !orders[orderId][tradeId]) {
							console.error(action);
							throw new Error('invalid "details.order_id + details.trade_id"')
						}
						const theFill = orders[orderId][tradeId];
						const netAmount = parseNum(action['amount']);
						const tran = {
							exchange: 'gdax',
							type: action.type === 'match' ? theFill['type'] : 'fee',
							currency: accountInfo.currency,
							date: theFill['date'],
							ts: theFill['ts'],
							amount: Math.abs(netAmount),
							change: netAmount,
							fill: theFill
						};
						return tran;
					} else {
						console.error(action);
						throw new Error('invalid type on action');
					}
				});
				data.trans.sort((x, y) => {
					return (+x.date) - (+y.date);
				});
				currencies[accountInfo.currency] = data;
			});

			return currencies;
		});
	}
};

/*
return authedClient.getAccountsAsync()
	.then(res => {
		console.log(res[1]);
		process.exit();
	})
*/

/*return paginateLoop([], query => {
		return query ? authedClient.getFillsAsync(query) : authedClient.getFillsAsync();
	})
	.then(allFills => {
		console.log(`${allFills.length} total fills`);
		process.exit();
	});
*/
