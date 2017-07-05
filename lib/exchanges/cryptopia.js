const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const parseNum = require('parse-decimal-number');

const Cryptopia = require('./cryptopia-request');
const keys = require('../../api-key')['cryptopia'];

const cryptopia = new Cryptopia(keys.api_key, keys.api_secret);

module.exports = {

	/* Sample Transactions
	"CLAM": {
		"exchange": "cryptopia",
		"currency": "CLAM",
		"trx": [
		  {
		    "exchange": "cryptopia",
		    "type": "buy",
		    "currency": "CLAM",
		    "date": "2017-04-24T07:22:32.084Z",
		    "ts": 1493018552084,
		    "amount": 2.23,
		    "change": 2.23,
		    "price": 0.00138094,
		    "price_currency": "BTC",
		    "fee": 0.00000616,
		    "fee_currency": "BTC",
		    "cost": 0.00308566,
		    "fill": {
		      "TradeId": 6856314,
		      "TradePairId": 2529,
		      "Market": "CLAM/BTC",
		      "Type": "Buy",
		      "Rate": 0.00138094,
		      "Amount": 2.23,
		      "Total": 0.0030795,
		      "Fee": 0.00000616,
		      "TimeStamp": "2017-04-24T03:22:32.0840592"
		    }
		  },
		  {
		    "exchange": "cryptopia",
		    "type": "deposit",
		    "currency": "CLAM",
		    "date": "2017-06-17T23:03:39.000Z",
		    "ts": 1497740619000,
		    "amount": 14.74078133,
		    "change": 14.74078133,
		    "fill": {
		      "Id": 6215042,
		      "Currency": "CLAM",
		      "TxId": "96b95bef1d951c517cc744f02a38ab8894fffff81bf4cf67474d40ba9b9953bc",
		      "Type": "Deposit",
		      "Amount": 14.74078133,
		      "Fee": 0,
		      "Status": "Confirmed",
		      "Confirmations": 27,
		      "Timestamp": "2017-06-17T19:03:39",
		      "Address": null
		    }
		  },
		  {
		    "exchange": "cryptopia",
		    "type": "withdrawal",
		    "currency": "CLAM",
		    "date": "2017-06-18T19:58:55.438Z",
		    "ts": 1497815935438,
		    "amount": 16.97078133,
		    "change": -16.97078133,
		    "fee": 0,
		    "real_amount": 16.97078133,
		    "fill": {
		      "Id": 418489,
		      "Currency": "CLAM",
		      "TxId": "fdae06302c7839915929ae482f812ac669dbb10613029d706aac7d4dcec922fd",
		      "Type": "Withdraw",
		      "Amount": 16.97078133,
		      "Fee": 0,
		      "Status": "Complete",
		      "Confirmations": 69,
		      "Timestamp": "2017-06-18T15:58:55.4389796",
		      "Address": "x8VpqDgQJWxGY1sYYNNb7cYi7of2vrxoSS"
		    }
		  }
		]
	},
	"LTC": {
		"exchange": "cryptopia",
		"currency": "LTC",
		"trx": [
		  {
		    "exchange": "cryptopia",
		    "type": "sell",
		    "currency": "LTC",
		    "date": "2017-06-17T11:09:33.037Z",
		    "ts": 1497697773037,
		    "amount": 1.76291723,
		    "change": -1.76291723,
		    "price": 0.01553,
		    "price_currency": "BTC",
		    "fee": 0.00005476,
		    "fee_currency": "BTC",
		    "cost": 0.027323339999999998,
		    "fill": {
		      "TradeId": 10927932,
		      "TradePairId": 101,
		      "Market": "LTC/BTC",
		      "Type": "Sell",
		      "Rate": 0.01553,
		      "Amount": 1.76291723,
		      "Total": 0.0273781,
		      "Fee": 0.00005476,
		      "TimeStamp": "2017-06-17T07:09:33.0372594"
		    }
		  }
		]
	},
	*/
	getAllTransactions: () => {
		const currencies = {};

		return Promise.all([
			cryptopia.getTradeHistory(),
			cryptopia.getWithdrawals(),
			cryptopia.getDeposits()
		])
		.then(res => {
			const trades = res[0],
				withdrawals = res[1],
				deposits = res[2];

			trades.forEach(trade => {
				const pair = trade['Market'].split('/'),
					currency = pair[0],
					priceCurrency = pair[1],
					dt = moment.utc(trade['TimeStamp']),
					type = trade['Type'] === 'Sell' ? 'sell' : 'buy',
					amount = trade['Amount'];
				if (type === 'buy' && trade['Type'] !== 'Buy') {
					console.error(`Invalid Trade Type ${trade['Type']}`);
					console.error(trade);
					return;
				}
				const cost = (type === 'sell') ? trade['Total'] - trade['Fee'] : trade['Total'] + trade['Fee'];
				const trx = {
					exchange: 'cryptopia',
					type: type,
					currency: currency,
					date: dt.toDate(),
					ts: +dt,
					amount: amount,
					change: type === 'sell' ? (0 - amount) : amount,
					price: trade['Rate'],
					price_currency: priceCurrency,
					fee: trade['Fee'],
					fee_currency: priceCurrency,
					cost: cost,
					fill: trade
				}
				if (!currencies[currency]) {
					currencies[currency] = {
						exchange: 'cryptopia',
						currency: currency,
						trx: []
					};
				}
				currencies[currency].trx.push(trx);
			});

			withdrawals.forEach(trade => {
				if (trade['Status'] === 'Complete') {
					const dt = moment.utc(trade['Timestamp']),
						currency = trade['Currency'];
					const trx = {
						exchange: 'cryptopia',
						type: 'withdrawal',
						currency: currency,
						date: dt.toDate(),
						ts: +dt,
						amount: trade['Amount'],
						change: 0 - trade['Amount'],
						fee: trade['Fee'],
						real_amount: trade['Amount'] - trade['Fee'],
						fill: trade
					};
					if (!currencies[currency]) {
						currencies[currency] = {
							exchange: 'cryptopia',
							currency: currency,
							trx: []
						};
					}
					currencies[currency].trx.push(trx);
				}
			});

			deposits.forEach(trade => {
				if (trade['Status'] === 'Confirmed') {
					const dt = moment.utc(trade['Timestamp']),
						currency = trade['Currency'];
					const trx = {
						exchange: 'cryptopia',
						type: 'deposit',
						currency: currency,
						date: dt.toDate(),
						ts: +dt,
						amount: trade['Amount'],
						change: trade['Amount'],
						fill: trade
					};
					if (!currencies[currency]) {
						currencies[currency] = {
							exchange: 'cryptopia',
							currency: currency,
							trx: []
						};
					}
					currencies[currency].trx.push(trx);
				}
			});

			Object.keys(currencies).forEach(currency => {
				const data = currencies[currency];
				data.trx.sort((x, y) => {
					return (+x.date) - (+y.date);
				});
			});

			return currencies;
		});
	}
};

/* Sample Deposit
{
  "Id": 6215042,
  "Currency": "CLAM",
  "TxId": "96b95bef1d951c517cc744f02a38ab8894fffff81bf4cf67474d40ba9b9953bc",
  "Type": "Deposit",
  "Amount": 14.74078133,
  "Fee": 0,
  "Status": "Confirmed",
  "Confirmations": 27,
  "Timestamp": "2017-06-17T19:03:39",
  "Address": null
}
*/

/* Sample Withdrawal
{
  "Id": 435365,
  "Currency": "BTC",
  "TxId": "3e89179b2a07d27b058a635da77dd76f2356df535d03583b64efc296af056b5d",
  "Type": "Withdraw",
  "Amount": 0.09522137,
  "Fee": 0,
  "Status": "Complete",
  "Confirmations": 25,
  "Timestamp": "2017-06-24T05:03:20.0944498",
  "Address": "15eJvJn9XGJReCRoGWPJgWP45tGkDetuVz"
},
*/

/* Sample Trades
{
  "TradeId": 11231652,
  "TradePairId": 5121,
  "Market": "XBY/BTC",
  "Type": "Sell",
  "Rate": 0.00000801,
  "Amount": 4955.15065304,
  "Total": 0.03969076,
  "Fee": 0.00007938,
  "TimeStamp": "2017-06-22T07:06:57.5868269"
},
{
  "TradeId": 10928122,
  "TradePairId": 5121,
  "Market": "XBY/BTC",
  "Type": "Buy",
  "Rate": 0.00001194,
  "Amount": 8.37520938,
  "Total": 0.0001,
  "Fee": 2E-7,
  "TimeStamp": "2017-06-17T07:13:47.009774"
},
*/
