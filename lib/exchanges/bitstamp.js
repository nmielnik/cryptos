const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const parseNum = require('parse-decimal-number');

const Bitstamp = require('bitstamp-promise');
const keys = require('../../api-key')['bitstamp'];

const bitstamp = new Bitstamp(keys.api_key, keys.api_secret, keys.client_id);

const trxCurrencyProps = ['usd', 'eur', 'btc', 'xrp', 'ltc'];
const trxPairs = [
	{ name: 'btc_usd', currency: 'btc', price_currency: 'usd' },
	{ name: 'btc_eur', currency: 'btc', price_currency: 'eur' },
	{ name: 'xrp_btc', currency: 'xrp', price_currency: 'btc' },
	{ name: 'xrp_usd', currency: 'xrp', price_currency: 'usd' },
	{ name: 'xrp_eur', currency: 'xrp', price_currency: 'eur' },
	{ name: 'ltc_btc', currency: 'ltc', price_currency: 'btc' },
	{ name: 'ltc_usd', currency: 'ltc', price_currency: 'usd' },
	{ name: 'ltc_eur', currency: 'ltc', price_currency: 'eur' }
];

const parseNumSafe = (val) => {
	if (typeof val === 'number') {
		return val;
	}
	return parseNum(val);
};

module.exports = {
	getAllTransactions: () => {
		return bitstamp.user_transactions(null, { limit: 1000 })
			.then(raw => {
				const currencies = {};
				raw.forEach(rawTrx => {
					const dt = moment.utc(rawTrx['datetime']),
						trx = {
							exchange: 'bitstamp',
							type: '',
							currency: '',
							date: dt.toDate(),
							ts: +dt,
							amount: 0,
							change: 0,
							fill: rawTrx
						};
					if (rawTrx['type'] === '0') {
						trx.type = 'deposit';
						trxCurrencyProps.some(currency => {
							if (rawTrx[currency]) {
								let amt = parseNum(rawTrx[currency]);
								if (amt > 0) {
									trx.currency = currency.toUpperCase();
									trx.amount = trx.change = amt;
									return true;
								}
							}
							return false;
						});
					} else if (rawTrx['type'] === '1') {
						trx.type = 'withdrawal';
						trxCurrencyProps.some(currency => {
							if (rawTrx[currency]) {
								let amt = parseNum(rawTrx[currency]);
								if (amt < 0) {
									trx.currency = currency.toUpperCase();
									trx.change = amt;
									trx.amount = Math.abs(amt);
									return true;
								}
							}
							return false;
						});
					} else if (rawTrx['type'] === '2') {
						let pairData = null;
						trxPairs.some(pair => {
							if (rawTrx[pair.name] && parseNumSafe(rawTrx[pair.name]) !== 0) {
								trx.currency = pair.currency.toUpperCase();
								trx.price_currency = trx.fee_currency = pair.price_currency.toUpperCase();
								trx.price = parseNumSafe(rawTrx[pair.name]);
								trx.cost = Math.abs(parseNumSafe(rawTrx[pair.price_currency]));
								trx.fee = parseNumSafe(rawTrx['fee']);

								trx.change = parseNumSafe(rawTrx[pair.currency]);
								trx.amount = Math.abs(trx.change);
								if (trx.change < 0) {
									trx.type = 'sell';
								} else {
									trx.type = 'buy';
								}
							}
						})
					}

					if (trx.currency) {
						if (!currencies[trx.currency]) {
							currencies[trx.currency] = {
								exchange: 'bitstamp',
								currency: trx.currency,
								trx: []
							};
						}
						currencies[trx.currency].trx.push(trx);
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

/*
datetime			Date and time.
id					Transaction ID.
type				Transaction type: 0 - deposit; 1 - withdrawal; 2 - market trade; 14 - sub account transfer.
usd					USD amount.
eur (v2 calls only)	EUR amount.
btc					BTC amount.
xrp (v2 calls only)	XRP amount.
btc_usd or btc_eur	Exchange rate.
fee					Transaction fee.
order_id			Executed order ID.
*/

/* Sample Transaction
{
    "usd": "4815.00",
    "btc_usd": 2140,
    "order_id": 9096764,
    "datetime": "2017-05-23 03:00:09",
    "fee": "12.04000000",
    "btc": "-2.25000000",
    "type": "2",
    "id": 15146943,
    "eur": 0
  },
  {
    "fee": "0.00000000",
    "btc_usd": "0.00",
    "datetime": "2017-05-23 02:24:52",
    "usd": 0,
    "btc": "2.25000000",
    "type": "0",
    "id": 15146448,
    "eur": 0
  },
  {
    "fee": "0.00000000",
    "btc_usd": "0.00",
    "datetime": "2017-05-23 01:00:25",
    "usd": 0,
    "btc": "-2.90126896",
    "type": "1",
    "id": 15145457,
    "eur": 0
  },
  {
    "fee": "0.00000000",
    "btc_usd": "0.00",
    "id": 15034239,
    "usd": 0,
    "btc": 0,
    "datetime": "2017-05-20 00:56:11",
    "type": "1",
    "xrp": "-10813.36871700",
    "eur": 0
  },
  {
    "fee": "0.00000000",
    "btc_usd": "0.00",
    "id": 15034227,
    "usd": 0,
    "btc": 0,
    "datetime": "2017-05-20 00:54:12",
    "type": "0",
    "xrp": "10713.36871700",
    "eur": 0
  },
  {
    "fee": "0.00029000",
    "order_id": 213399142,
    "id": 14142861,
    "usd": 0,
    "xrp_btc": 0.000029,
    "btc": "0.11793052",
    "datetime": "2017-04-10 17:20:49",
    "type": "2",
    "xrp": "-4066.56970700",
    "eur": 0
  },
*/
