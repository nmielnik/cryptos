const Promise = require('bluebird');
const moment = require('moment');
const parseNum = require('parse-decimal-number');

const bittrexAPI = require('@you21979/bittrex.com');
const keys = require('../../api-key')['bittrex'];
const bittrex = bittrexAPI.createPrivateApi(keys.api_key, keys.api_secret, 'I am Bot');
const bittrexPub = bittrexAPI.PublicApi;

module.exports = {
	/* Sample output
	"NAV": {
	    "exchange": "bittrex",
	    "currency": "NAV",
	    "trx": [
	      {
	        "exchange": "bittrex",
	        "type": "deposit",
	        "currency": "NAV",
	        "date": "2017-06-12T09:52:17.243Z",
	        "ts": 1497261137243,
	        "amount": 499.90557172,
	        "change": 499.90557172,
	        "fill": {
	          "Id": 19851266,
	          "Amount": 499.90557172,
	          "Currency": "NAV",
	          "Confirmations": 28,
	          "LastUpdated": "2017-06-12T05:52:17.243",
	          "TxId": "2ab342ac7841cf400ca94581ba310da59161774068e658b2ea5fd9745d78bbc4",
	          "CryptoAddress": "NRLMg9HhW2uonJVWiqtYrj1FimhjYzR1Gw"
	        }
	      },
	      {
	        "exchange": "bittrex",
	        "type": "sell",
	        "currency": "NAV",
	        "date": "2017-06-12T17:28:08.620Z",
	        "ts": 1497288488620,
	        "amount": 499.90557172,
	        "change": -499.90557172,
	        "date_created": "2017-06-12T17:28:08.400Z",
	        "ts_created": 1497288488400,
	        "price": 0.00013412,
	        "price_currency": "BTC",
	        "cost": 0.06705233,
	        "fee": 0.00016762,
	        "fee_currency": "BTC",
	        "fill": {
	          "OrderUuid": "cce3a25b-bd19-4805-923c-0eb78cfdce75",
	          "Exchange": "BTC-NAV",
	          "TimeStamp": "2017-06-12T13:28:08.4",
	          "OrderType": "LIMIT_SELL",
	          "Limit": 0.00013369,
	          "Quantity": 499.90557172,
	          "QuantityRemaining": 0,
	          "Commission": 0.00016762,
	          "Price": 0.06705233,
	          "PricePerUnit": 0.00013412,
	          "IsConditional": false,
	          "Condition": "NONE",
	          "ConditionTarget": null,
	          "ImmediateOrCancel": false,
	          "Closed": "2017-06-12T13:28:08.62"
	        }
	      },
	      {
	        "exchange": "bittrex",
	        "type": "buy",
	        "currency": "NAV",
	        "date": "2017-06-20T08:19:02.727Z",
	        "ts": 1497946742727,
	        "amount": 1371.54878451,
	        "change": 1371.54878451,
	        "date_created": "2017-06-20T08:19:02.647Z",
	        "ts_created": 1497946742647,
	        "price": 0.00018181,
	        "price_currency": "BTC",
	        "cost": 0.24937499,
	        "fee": 0.00062343,
	        "fee_currency": "NAV",
	        "fill": {
	          "OrderUuid": "7bd30f22-854d-4fac-8db0-66315d8c3bfd",
	          "Exchange": "BTC-NAV",
	          "TimeStamp": "2017-06-20T04:19:02.647",
	          "OrderType": "LIMIT_BUY",
	          "Limit": 0.00018182,
	          "Quantity": 1371.54878451,
	          "QuantityRemaining": 0,
	          "Commission": 0.00062343,
	          "Price": 0.24937499,
	          "PricePerUnit": 0.00018181,
	          "IsConditional": false,
	          "Condition": "NONE",
	          "ConditionTarget": null,
	          "ImmediateOrCancel": false,
	          "Closed": "2017-06-20T04:19:02.727"
	        }
	      },
	      {
	        "exchange": "bittrex",
	        "type": "withdrawal",
	        "currency": "NAV",
	        "date": "2017-06-20T08:20:23.447Z",
	        "ts": 1497946823447,
	        "amount": 1371.34878451,
	        "change": -1371.34878451,
	        "fee": 0.2,
	        "fee_currency": "NAV",
	        "fill": {
	          "PaymentUuid": "05d163fb-702d-4b25-9f7e-cd1930fab7a6",
	          "Currency": "NAV",
	          "Amount": 1371.34878451,
	          "Address": "NQd72yZmKo7UXLqNff4PU2MEbe8EzN1eFf",
	          "Opened": "2017-06-20T04:20:23.447",
	          "Authorized": true,
	          "PendingPayment": false,
	          "TxCost": 0.2,
	          "TxId": "4411f5ad1020521b3bc35b580dbd18f3d3e306421c703af4e80cf40107b47d8a",
	          "Canceled": false,
	          "InvalidAddress": false
	        }
	      }
	    ]
	  },
	*/
	getAllTransactions: () => {
		const currencies = {};

		return Promise.all([
			module.exports.getFullOrderHistory(),
			bittrex.getWithdrawalHistory(),
			bittrex.getDepositHistory()
		])
		.then(res => {
			const orders = res[0],
				withdrawals = res[1],
				deposits = res[2];

			/* Orders */
			orders.forEach(order => {
				const pairParts = order['Exchange'].split('-'),
					currency = pairParts[1],
					priceCurrency = pairParts[0],
					typeParts = order['OrderType'].split('_'),
					type = typeParts[1] === 'SELL' ? 'sell' : 'buy',
					dt = moment.utc(order['Closed']),
					dtCreated = moment.utc(order['TimeStamp']);
				let amount = order['Quantity'];
				if (order['QuantityRemaining']) {
					amount -= order['QuantityRemaining'];
				}
				if (type === 'buy' && typeParts[1] !== 'BUY') {
					console.log(`!!!!!!!!! UNKNOWN TYPE: ${order['OrderType']} !!!!!!!!!!!!!`);
				}
				const trx = {
					exchange: 'bittrex',
					type: type,
					currency: currency,
					date: dt.toDate(),
					ts: +dt,
					amount: amount,
					change: type === 'sell' ? (0 - amount) : amount,
					date_created: dtCreated.toDate(),
					ts_created: +dtCreated,
					price: order['PricePerUnit'],
					price_currency: priceCurrency,
					cost: order['Price'],
					fee: order['Commission'],
					fee_currency: type === 'sell' ? priceCurrency : currency,
					fill: order
				};
				if (!currencies[currency]) {
					currencies[currency] = {
						exchange: 'bittrex',
						currency: currency,
						trx: []
					};
				}
				currencies[currency].trx.push(trx);
			});

			/* Withdrawals */
			withdrawals.forEach(order => {
				const currency = order['Currency'],
					amount = order['Amount'],
					dt = moment.utc(order['Opened']);
				const trx = {
					exchange: 'bittrex',
					type: 'withdrawal',
					currency: currency,
					date: dt.toDate(),
					ts: +dt,
					amount: amount,
					change: 0 - amount,
					fee: order['TxCost'],
					fee_currency: currency,
					fill: order
				};
				if (!currencies[currency]) {
					currencies[currency] = {
						exchange: 'bittrex',
						currency: currency,
						trx: []
					};
				}
				currencies[currency].trx.push(trx);
			});

			/* Deposits */
			deposits.forEach(order => {
				const currency = order['Currency'],
					amount = order['Amount'],
					dt = moment.utc(order['LastUpdated']);
				const trx = {
					exchange: 'bittrex',
					type: 'deposit',
					currency: currency,
					date: dt.toDate(),
					ts: +dt,
					amount: amount,
					change: amount,
					fill: order
				};
				if (!currencies[currency]) {
					currencies[currency] = {
						exchange: 'bittrex',
						currency: currency,
						trx: []
					};
				}
				currencies[currency].trx.push(trx);
			});

			Object.keys(currencies).forEach(currency => {
				const data = currencies[currency];
				data.trx.sort((x, y) => {
					return (+x.date) - (+y.date);
				});
			});

			return currencies;
		});
	},

	getOldOrderHistory: () => {
		/*
		const CSVReader = require('promised-csv');
		const reader = new CSVReader(true);
		let skip = true;
		return reader.read('./local/bittrex-order-history.csv', row => {
			if (skip) {
				skip = false;
				return null;
			}
			const amount = (typeof row[3] === 'string') ? parseNum(row[3]) : row[3],
				cost = (typeof row[6] === 'string') ? parseNum(row[6]) : row[6],
				price = (amount === 0) ? 0 : (cost / amount);
			return {
				OrderUuid: row[0],
				Exchange: row[1],
				TimeStamp: row[7],
				OrderType: row[2],
				Limit: row[4],
				Quantity: amount,
				Commission: row[5],
				Price: cost,
				PricePerUnit: price,
				Closed: row[8]
			};
		})
		.then(rows => {
			return rows;
		});*/
		const fs = require('fs');
		const csv = require('csv-parser');
		const trans = [];

		return new Promise((resolve, reject) => {
			fs.createReadStream('./local/bittrex-order-history.csv', "utf16le")
				.pipe(csv())
				.on('data', (data) => {
					const amount = (typeof data['Quantity'] === 'string') ? parseNum(data['Quantity']) : data['Quantity'],
						cost = (typeof data['Price'] === 'string') ? parseNum(data['Price']) : data['Price'],
						price = (amount === 0) ? 0 : (cost / amount);
					trans.push({
						OrderUuid: data['OrderUuid'],
						Exchange: data['Exchange'],
						TimeStamp: data['Opened'],
						OrderType: data['Type'],
						Limit: data['Limit'],
						Quantity: amount,
						Commission: data['CommissionPaid'],
						Price: cost,
						PricePerUnit: price,
						Closed: data['Closed']
					});
				})
				.on('end', () => {
					resolve(trans);
				})
				.on('error', () => {
					reject({});
				});
		});
	},

	getFullOrderHistory: () => {
		return Promise.all([
			module.exports.getOldOrderHistory(),
			module.exports.getMarkets()
		])
			.then(res => {
				const oldOrders = res[0];
				const data = res[1];
				const batches = [];
				let numBatches = Math.max(10, Math.ceil(data.length / 10));
				for (let i = 0; i < data.length; i += Math.ceil(data.length / numBatches)) {
					const end = i + Math.ceil(data.length / numBatches);
					batches.push(data.slice(i, Math.min(data.length, end)));
				}

				return Promise.reduce(batches, function(history, batch) {
					return Promise.all(batch.map(market => {
						return bittrex.getOrderHistory({ market: market['MarketName'] })
					}))
						.then(allRes => {
							allRes.forEach(res => {
								history = history.concat(res);
							});
							return Promise.delay(100, history);
						});
				}, [])
					.then(orders => {
						const map = {};
						orders.forEach(order => {
							map[order['OrderUuid']] = true;
						});
						oldOrders.forEach(order => {
							if(!map[order['OrderUuid']]) {
								orders.push(order);
							}
						});
						return orders;
					});
			});
	},

	getMarkets: () => {
		return bittrexPub.getMarkets();
	},

	getMarketHistory: (coin, maxCount, currency) => {
		currency = (currency || 'BTC').toUpperCase();
		let market = `${currency}-${coin.toUpperCase()}`;
		return bittrexPub.getMarketHistory(market, maxCount);
	},

	getMarketSummaries: () => {
		return bittrexPub.getMarketSummaries();
	}
};

/* Sample Orders
{
	"OrderUuid": "324dd5dd-8ae9-4461-b9d3-fcb23ce8af67",
	"Exchange": "BTC-8BIT",
	"TimeStamp": "2017-06-23T23:25:27.46",
	"OrderType": "LIMIT_SELL",
	"Limit": 0.00008133,
	"Quantity": 1520.94764605,
	"QuantityRemaining": 0,
	"Commission": 0.00031305,
	"Price": 0.12522873,
	"PricePerUnit": 0.00008233,
	"IsConditional": false,
	"Condition": "NONE",
	"ConditionTarget": null,
	"ImmediateOrCancel": false,
	"Closed": "2017-06-23T23:25:27.587"
},
{
	"OrderUuid": "a9166f3f-0284-45af-a7ae-140e7818562b",
	"Exchange": "BTC-8BIT",
	"TimeStamp": "2017-06-23T23:15:06.74",
	"OrderType": "LIMIT_BUY",
	"Limit": 0.00009141,
	"Quantity": 1520.94764605,
	"QuantityRemaining": 0,
	"Commission": 0.00034737,
	"Price": 0.13895718,
	"PricePerUnit": 0.00009136,
	"IsConditional": false,
	"Condition": "NONE",
	"ConditionTarget": null,
	"ImmediateOrCancel": false,
	"Closed": "2017-06-23T23:15:06.893"
},
*/

/* Sample Withdrawal
{
  "PaymentUuid": "c6c27f46-cea5-48e1-8af2-fcc66093a5fd",
  "Currency": "BTC",
  "Amount": 0.05306175,
  "Address": "1FBQTNKE1CSkB7TYAEiV8jRmPNmpsEuXXs",
  "Opened": "2017-06-24T00:05:58.483",
  "Authorized": true,
  "PendingPayment": false,
  "TxCost": 0.001,
  "TxId": "7c09ce2246cfba11d2ec4b57b52e7f50de5cf31d5b7962f74c803f07a9ac59c3",
  "Canceled": false,
  "InvalidAddress": false
}
*/

/* Sample Deposit
{
  "Id": 20830887,
  "Amount": 0.60538091,
  "Currency": "BTC",
  "Confirmations": 2,
  "LastUpdated": "2017-06-23T06:40:20.903",
  "TxId": "ca773612324cb98efea9ac58097cd583e1b062f82815ed3c15614f5bae892540",
  "CryptoAddress": "15eJvJn9XGJReCRoGWPJgWP45tGkDetuVz"
},
*/
