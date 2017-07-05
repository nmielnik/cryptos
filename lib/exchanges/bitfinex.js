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

module.exports = {
	/* Sample output
	"LTC": {
	    "exchange": "bitfinex",
	    "currency": "LTC",
	    "trx": [
	    	{ exchange: 'bitfinex',
			  type: 'buy',
			  currency: 'LTC',
			  amount: 67,
			  change: 67,
			  price: 7.79,
			  price_currency: 'USD',
			  date: 2017-03-30T13:48:30.000Z,
			  ts: 1490881710000,
			  fee: -0.939474,
			  fee_currency: 'USD',
			  pair: 'LTC_USD',
			  tid: 28199944,
			  order_id: 2198456451
			},
	    	{ exchange: 'bitfinex',
			  type: 'withdrawal',
			  currency: 'LTC',
			  amount: 4.93478977,
			  change: -4.93478977,
			  date: 2017-06-18T15:53:26.000Z,
			  ts: 1497801206000,
			  balance: 0.001,
			  description: 'Litecoin Withdrawal #2220674 on wallet Exchange',
			  movement_id: 2220674,
			  move:
			   { type: 'withdrawal',
			     currency: 'LTC',
			     amount: 4.93478977,
			     change: -4.93478977,
			     date: 2017-06-18T16:05:19.000Z,
			     ts: 1497801919000,
			     description: 'LeH2NubB5WBKRP7Zo5hSCiHaY7m2jB7142, txid: 2ae8fac43261ce9e64e93b05593e3c6e7d49ef6e3f6a13a8b03f0cc0c2de67fc',
			     address: 'LeH2NubB5WBKRP7Zo5hSCiHaY7m2jB7142',
			     txid: '2ae8fac43261ce9e64e93b05593e3c6e7d49ef6e3f6a13a8b03f0cc0c2de67fc' }
			},
			...
	    ]
	},
	"XRP": {
		"exchange": "bitfinex",
	    "currency": "LTC",
	    "trx": [
	    	{ exchange: 'bitfinex',
			  type: 'sell',
			  currency: 'XRP',
			  amount: 455.99466052,
			  change: -455.99466052,
			  date: 2017-06-17T17:08:00.000Z,
			  ts: 1497719280000,
			  balance: 0,
			  description: 'Exchange 455.99466052 XRP for BTC @ 0.00009823 on wallet Exchange',
			  price_rnd: 0.00009823,
			  price_currency: 'BTC',
			  pair: 'XRP_BTC'
			},
			{ exchange: 'bitfinex',
			  type: 'despoit',
			  currency: 'XRP',
			  amount: 10913.368717,
			  change: 10913.368717,
			  date: 2017-05-19T23:24:51.000Z,
			  ts: 1495236291000,
			  balance: 10913.368717,
			  description: 'Deposit (RIPPLE) #2006390 on wallet Exchange',
			  movement_id: 2006390,
			  move:
			   { type: 'deposit',
			     currency: 'XRP',
			     amount: 10913.368717,
			     change: -10913.368717,
			     date: 2017-05-19T23:24:51.000Z,
			     ts: 1495236291000,
			     description: '5EBD60066092773329BD8C0071E5268D530CED20A38112F3BAB76375D0186F19',
			     address: '2686957462',
			     txid: '5EBD60066092773329BD8C0071E5268D530CED20A38112F3BAB76375D0186F19' }
			},
			...
	    ]
	}
	*/
	getAllTransactions: () => {
		const currencies = {};
		const moves = {};
		const unusedMoves = {};
		const mt = moment().subtract(5, 'months');
		const ts = mt.format('X') + '.0';

		return bitfinex.rest.get_symbolsAsync()
			.then(markets => {
				const currTrades = [];
				//return Promise.each(['ltcusd', 'ltcbtc', 'xrpusd', 'xrpbtc'], market => {
				return Promise.each(markets, market => {
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
							trx: []
						};
					}
					currData.trades.forEach(trade => {
						const dt = moment(trade.timestamp, 'X');
						const amt = parseNum(trade.amount);
						const netAmount = trade.type.toLowerCase() === 'buy' ? amt : 0 - amt;
						const trx = {
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
						currencies[currency].trx.push(trx);
					});
				});
				return Promise.each(Object.keys(currencies), currency => {
					return bitfinex.rest.movementsAsync(currency.toLowerCase(), { since: ts, limit: 2000 })
						.then(movements => {
							movements.forEach(move => {
								if (moves[move.id]) {
									console.error(`Duplicate move ${move.id}`);
									console.error(JSON.stringify(move));
								}
								moves[move.id] = move;
								unusedMoves[move.id] = true;
							});
							return bitfinex.rest.balance_historyAsync(currency.toLowerCase(), { since: ts, limit: 2000 })
						})
						.then(history => {
							if (!currencies[currency]) {
								currencies[currency] = {
									exchange: 'bitfinex',
									currency: currency,
									trx: []
								};
							}
							history.forEach(trade => {
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
								if (parts[0] === 'Deposit' || (parts[1] === 'Withdrawal' && parts[2] !== 'fee')) {
									trx.type = parts[0] === 'Deposit' ? 'deposit' : 'withdrawal';
									trx.movement_id = parseNum(parts[2].substr(1,7));
									if (!moves[trx.movement_id]) {
										console.error(`Missing move ${trx.movement_id} for trx`);
										console.error(JSON.stringify(trx, null, 2));
									}
									const theMove = moves[trx.movement_id];
									unusedMoves[trx.movement_id] = false;
									const moveDt = moment(theMove.timestamp, 'X');
									const amt = parseNum(theMove.amount);
									trx.fill = {
										type: theMove.type.toLowerCase(),
										currency: currency,
										amount: amt,
										change: trx.type === 'deposit' ? amt : (0 - amt),
										date: moveDt.toDate(),
										ts: +moveDt,
										description: theMove.description,
										address: theMove.address,
										txid: theMove.txid
									};
									//console.log(`++ deposit ${trx.movement_id} ! (${trade.description})`);
									//console.log('    ' + JSON.stringify(trx));
								} else if (parts[0] === 'Exchange') {
									trx.type = (amt > 0) ? 'buy' : 'sell';
									trx.price_rnd = parseNum(parts[6]);
									trx.price_currency = parts[4];
									trx.pair = `${currency}_${trx.price_currency}`;
									//console.log(trade.description);
									//console.log('    ' + JSON.stringify(trx));
								} else if (parts[1] === 'fees') {
									trx.type = 'fee';
									trx.pair = `${currency}_${parts[5].substr(4,3)}`;
									//console.log(trade.description);
									//console.log('    ' + JSON.stringify(trx));
								} else if (parts[0] === 'Settlement') {
									trx.type = 'settlement';
									//console.log(trade.description);
									//console.log('    ' + JSON.stringify(trx));
								} else if (parts[0] === 'Crypto' && parts[1] === 'Withdrawal') {
									trx.type = 'fee-withdrawal';
								} else {
									//console.log('@@@@@@@' + trade.description);
									//console.log('  ' + JSON.stringify(trade));
									return;
								}
								currencies[currency].trx.push(trx);
							});
							currencies[currency].trx.sort((x, y) => {
								return (+x.date) - (+y.date);
							});
							return Promise.resolve(currencies[currency]);
						});
				});
			})
			.then(() => {
				return currencies;
			});
	}
};


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
