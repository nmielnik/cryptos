const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const parseNum = require('parse-decimal-number');

const Bitfinex = require('bitfinex-api-node');
//const restAPI = bitfinex.APIRest;
//Promise.promisifyAll(restAPI.prototype);

const keys = require('../../api-key')['bitfinex'];

const bitfinex = new Bitfinex(keys.api_key, keys.api_secret);
Promise.promisifyAll(bitfinex.rest);

const currencies = {};
const mt = moment().subtract(5, 'months');
const ts = mt.format('X') + '.0';

//return bitfinex.rest.past_tradesAsync('btcusd')
//return bitfinex.rest.balance_historyAsync('btc')
//return bitfinex.rest.movementsAsync('btc')
return bitfinex.rest.get_symbolsAsync()
	.then(markets => {
		const currTrades = [];
		//return Promise.each(markets, market => {
		return Promise.each(['ltcusd', 'ltcbtc', 'xrpusd', 'xrpbtc'], market => {
			const targetCurr = market.substr(0, 3).toUpperCase();
			const sourceCurr = market.substr(3, 3).toUpperCase();
			return bitfinex.rest.past_tradesAsync(market, { timestamp: ts, limit_trades: 1000 })
				.then(trades => {
					currTrades.push({
						targetCurr: targetCurr,
						sourceCurr: sourceCurr,
						trades: trades
					});
				});
		})
		.then(() => {
			return currTrades;
		});
	})
	.then(currencyTrades => {
		currencyTrades.forEach(currData => {
			const currency = currData.targetCurr;
			const sourceCurr = currData.sourceCurr;
			if (!currencies[currency]) {
				currencies[currency] = {
					exchange: 'bitfinex',
					currency: currency,
					trades: {}
				};
			}
			currencies[currency].trades[sourceCurr] = currData.trades.map(trade => {
				const dt = moment(trade.timestamp, 'X');
				const amt = parseNum(trade.amount);
				const netAmount = trade.type.toLowerCase() === 'buy' ? amt : 0 - amt;
				return {
					exchange: 'bitfinex',
					type: trade.type.toLowerCase(),
					currency: currency,
					amount: amt,
					change: netAmount,
					price: parseNum(trade.price),
					price_currency: sourceCurr,
					date: dt.toDate(),
					ts: +dt,
					fee: parseNum(trade.fee_amount),
					fee_currency: trade.fee_currency,
					pair: `${currency.toUpperCase()}_${sourceCurr.toUpperCase()}`,
					tid: trade.tid,
					order_id: trade.order_id
				};
			});
		});
		return Promise.each(Object.keys(currencies), currency => {
			return bitfinex.rest.balance_historyAsync(currency.toLowerCase(), { since: ts, limit: 2000 })
				.then(history => {
					currencies[currency].history = history.map(trade => {
						const dt = moment(trade.timestamp, 'X');
						const amt = parseNum(trade.amount);
						const parts = trade.description.split(' ');
						const trx = {
							exchange: 'bitfinex',
							type: '?',
							currency: trade.currency,
							amount: Math.abs(amt),
							change: amt,
							date: dt.toDate(),
							ts: +dt,
							balance: parseNum(trade.balance),
							description: trade.description
						};
						if (parts[0] === 'Deposit') {
							trx.type = 'despoit';
							trx.movement_id = parseNum(parts[2].substr(1,7));
							console.log(`++ deposit ${trx.movement_id} ! (${trade.description})`);
							console.log('    ' + JSON.stringify(trx));
						} else if (parts[1] === 'Withdrawal' && parts[2] !== 'fee') {
							trx.type = 'withdrawal';
							trx.movement_id = parseNum(parts[2].substr(1,7));
							console.log(`++ withdrawal ${trx.movement_id} ! (${trade.description})`);
							console.log('    ' + JSON.stringify(trx));
						} else if (parts[0] === 'Exchange') {
							trx.type = (amt > 0) ? 'buy' : 'sell';
							trx.price_rnd = parseNum(parts[6]);
							trx.price_currency = parts[4];
							trx.pair = `${currency}_${trx.price_currency}`;
							console.log(trade.description);
							console.log('    ' + JSON.stringify(trx));
						} else {
							console.log(trade.description);
						}
					});
					return bitfinex.rest.movementsAsync(currency.toLowerCase(), { since: ts, limit: 2000 });
				})
				.then(movements => {
					currencies[currency].movements = movements;
					return Promise.resolve(currencies[currency]);
				});
		});
	})
	.then(() => {
		const summary = {};
		Object.keys(currencies).forEach(currency => {
			const currInfo = currencies[currency];
			summary[currency] = {
				trades: [],
				history: currInfo.history.length,
				movements: currInfo.movements.length
			};
			Object.keys(currInfo.trades).forEach(otherCurr => {
				summary[currency].trades.push({
					pair: `${currency}_${otherCurr}`,
					trades: currInfo.trades[otherCurr].length
				});
			});
		});
		console.log(JSON.stringify(summary, null, 2));
		process.exit();
	})
	.catch(err => {
		console.error(err);
		process.exit();
	});



/* past_trades
[  { price: '1252.0',
		amount: '0.45607028',
		timestamp: '1492489581.0',
		type: 'Buy',
		fee_currency: 'BTC',
		fee_amount: '-0.00082093',
		tid: 29405445,
		order_id: 2334258873 },
	{ price: '1207.5',
		amount: '0.060532',
		timestamp: '1492407232.0',
		type: 'Sell',
		fee_currency: 'USD',
		fee_amount: '-0.06578315',
		tid: 29344790,
		order_id: 2328246265 }
]
*/

/* balance_history
[
{ currency: 'BTC',
		amount: '0.13074219',
		balance: '0.23645412',
		description: 'Deposit (BITCOIN) #2168494 on wallet Exchange',
		timestamp: '1497404114.0' },
{ currency: 'BTC',
		amount: '-0.0001',
		balance: '0.35064598',
		description: 'Crypto Withdrawal fee on wallet Exchange',
		timestamp: '1496812280.0' },
	{ currency: 'BTC',
		amount: '-0.11413851',
		balance: '0.23650747',
		description: 'Bitcoin Withdrawal #2111748 on wallet Exchange',
		timestamp: '1496812280.0' },
	{ currency: 'BTC',
		amount: '-0.00002044',
		balance: '0.34052538',
		description: 'Trading fees for 0.956 LTC (LTCBTC) @ 0.0107 on BFX (0.2%) on wallet Exchange',
		timestamp: '1496812036.0' },
	{ currency: 'BTC',
		amount: '0.0102206',
		balance: '0.35074598',
		description: 'Exchange 0.956 LTC for BTC @ 0.010691 on wallet Exchange',
		timestamp: '1496812036.0' }
]
*/

/* movements
{ id: 2168494,
		currency: 'BTC',
		method: 'BITCOIN',
		type: 'DEPOSIT',
		amount: '0.13074219',
		description: '6c2303a443e1e795afd66a8dc9659636ff6a1a398ed99fd89e45b15f75421fc3',
		address: '1HQuKJDgcR9B6Nd6LWj9ASGyfey3PMpnUZ',
		status: 'COMPLETED',
		timestamp: '1497404114.0',
		txid: '6c2303a443e1e795afd66a8dc9659636ff6a1a398ed99fd89e45b15f75421fc3' },
	{ id: 2111748,
		currency: 'BTC',
		method: 'BITCOIN',
		type: 'WITHDRAWAL',
		amount: '0.11413851',
		description: '1CsiZp9xvPJmTPfCUnrvAMby1vdPKMPLP8, txid: f011b549c6231e72c0b369e5659288f642576e18548375f4588e342be34df8ce',
		address: '1CsiZp9xvPJmTPfCUnrvAMby1vdPKMPLP8',
		status: 'COMPLETED',
		timestamp: '1496814182.0',
		txid: 'f011b549c6231e72c0b369e5659288f642576e18548375f4588e342be34df8ce' }
*/

/* get_symbols
[ 'btcusd',
	'ltcusd',
	'ltcbtc',
	'ethusd',
	'ethbtc',
	'etcbtc',
	'etcusd',
	'rrtusd',
	'rrtbtc',
	'zecusd',
	'zecbtc',
	'xmrusd',
	'xmrbtc',
	'dshusd',
	'dshbtc',
	'bccbtc',
	'bcubtc',
	'bccusd',
	'bcuusd',
	'xrpusd',
	'xrpbtc',
	'iotusd',
	'iotbtc' ]

*/
