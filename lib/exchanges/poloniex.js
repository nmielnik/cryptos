const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const parseNum = require('parse-decimal-number');

const Poloniex = require('poloniex.js');
const keys = require('../../api-key')['poloniex'];

Promise.promisifyAll(Poloniex.prototype, {
	filter: (name, func, target, passesDefaultFilter) => {
		return passesDefaultFilter || name == '_private';
	}
});

const poloniex = new Poloniex(keys.api_key, keys.api_secret);

const EARLIEST_DATE = new Date(2017,3,1,0,0,0,0);

module.exports = {
	getAllTransactions: () => {
		const parameters = {
			currencyPair: 'all',
			start: Math.floor(EARLIEST_DATE.getTime() / 1000),
			end: Math.floor(new Date().getTime() / 1000)
		};

		return Promise.all([
				poloniex._privateAsync('returnDepositsWithdrawals', parameters),
				poloniex._privateAsync('returnTradeHistory', parameters)
			])
			.then((results) => {
				const currencies = {};
				const withdrawals = results[0].withdrawals;
				const deposits = results[0].deposits;
				if (!deposits || !withdrawals) {
					console.error('Invalid response from poloniex');
					console.log(JSON.stringify(results[0]));
					throw new Error('Could not retreive withdrawals/deposits');
				}
				const trades = results[1];

				// Deposits
				deposits.forEach((data) => {
					if (data.status && data.status.indexOf('COMPLETE') === 0) {
						const currency = data.currency,
							dt = moment.unix(data['timestamp']),
							amount = parseNum(data['amount']);
						const trx = {
							exchange: 'poloniex',
							type: 'deposit',
							currency: currency,
							date: dt.toDate(),
							ts: +dt,
							amount: amount,
							change: amount,
							fill: data
						};

						if (!currencies[currency]) {
							currencies[currency] = {
								exchange: 'poloniex',
								currency: currency,
								trx: []
							};
						}
						currencies[currency].trx.push(trx);
					}
				});

				// Withdrawals
				withdrawals.forEach((data) => {
					if (data.status && data.status.indexOf('COMPLETE') === 0) {
						const currency = data.currency,
							dt = moment.unix(data['timestamp']),
							amount = parseNum(data['amount']),
							fee = parseNum(data['fee']);
						const trx = {
							exchange: 'poloniex',
							type: 'withdrawal',
							currency: currency,
							date: dt.toDate(),
							ts: +dt,
							amount: amount,
							change: 0 - amount,
							fee: fee,
							fee_currency: currency,
							real_amount: amount - fee,
							fill: data
						};

						if (!currencies[currency]) {
							currencies[currency] = {
								exchange: 'poloniex',
								currency: currency,
								trx: []
							};
						}
						currencies[currency].trx.push(trx);
					}
				});

				// Trades
				Object.keys(trades).forEach((mkt) => {
					const mktParts = mkt.split('_'),
						currency = mktParts[1],
						priceCurrency = mktParts[0];

					trades[mkt].forEach((data) => {
						const dt = moment(data['date']),
							type = data['type'],
							amount = parseNum(data['amount']),
							price = parseNum(data['rate']),
							feeRate = parseNum(data['fee']),
							total = parseNum(data['total']);
						if (type !== 'buy' && type !== 'sell') {
							console.error(`!!!!!!! UKNOWN TRADE TYPE ${type} !!!!!!!!!!!!`);
						}
						const trx = {
							exchange: 'poloniex',
							type: type,
							currency: currency,
							date: dt.toDate(),
							ts: +dt,
							amount: amount,
							change: amount,
							price: price,
							price_currency: priceCurrency,
							cost: total,
							fee: 0,
							fee_rate: feeRate,
							fee_currency: '',
							fill: data
						};
						if (trx.type === 'buy') {
							trx.fee_currency = currency;
							trx.fee = trx.fee_rate * amount;
							trx.change = amount - trx.fee;
						} else if (trx.type === 'sell') {
							trx.fee_currency = priceCurrency;
							trx.fee = trx.fee_rate * total;
							trx.change = 0 - amount;
							trx.cost = total - trx.fee;
						}

						if (!currencies[currency]) {
							currencies[currency] = {
								exchange: 'poloniex',
								currency: currency,
								trx: []
							};
						}
						currencies[currency].trx.push(trx);
					});
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

	getCoins: () => {
		return poloniex.returnTickerAsync()
			.then((data) => {
				//const quick = [Object.keys(data)[0]];
				//return Promise.each(quick, (pair) => {
				return Promise.each(Object.keys(data), (pair) => {
					if (pair.indexOf('BTC_') !== 0 || blacklist.indexOf(pair) !== -1) {
						return {};
					}

					const name = pair.split("_")[1];
					const data = {
						pair: pair,
						name: name,
						changes: []
					};
				});
			});
	}
}

/* Trades
{
  "globalTradeID": 176404792,
  "tradeID": "10359833",
  "date": "2017-06-25 06:41:34",
  "rate": "0.00010760",
  "amount": "3437.09256845",
  "total": "0.36983116",
  "fee": "0.00250000",
  "orderNumber": "60699229128",
  "type": "sell",
  "category": "exchange"
},
{
  "globalTradeID": 176375201,
  "tradeID": "10358712",
  "date": "2017-06-25 05:22:10",
  "rate": "0.00010738",
  "amount": "3445.70683553",
  "total": "0.36999999",
  "fee": "0.00250000",
  "orderNumber": "60692561802",
  "type": "buy",
  "category": "exchange"
},
*/

/* Widthdrawls
{ withdrawalNumber: 4297927,
   currency: 'BTC',
   address: '1HQuKJDgcR9B6Nd6LWj9ASGyfey3PMpnUZ',
   amount: '0.12263813',
   fee: '0.00010000',
   timestamp: 1496112390,
   status: 'COMPLETE: 558f2b697869e2402eb5e8ecfc13d3a650ceda1226455f86d728422d3ac6f92b',
   ipAddress: '108.48.90.118'
}*/

/* Deposits
{ currency: 'BTC',
   address: '1EZ5QbP4nKFDoU8jRw2rVmNW1CAy54F1ZF',
   amount: '0.12183813',
   confirmations: 1,
   txid: '1eff351ee41832d6cb84abbeb8bb30b18f383a1ba847b849f32cdd4bdc8096f9',
   timestamp: 1496042100,
   status: 'COMPLETE'
 }
 */
