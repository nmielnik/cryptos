const help = require('./helpers');
const csv = require('csv-parser');
const moment = require('moment');
const parseNum = require('parse-decimal-number');
const fs = require('fs');
const convCSV = require('./csv-converter');
//const capgains = require('./capgains');
const priceHistory = require('./price-history');

const geminiGetAmount = (data, currency, isFee) => {
	let colName = `${currency} Amount ${currency}`;
	if (isFee)
		colName = `Fee (${currency}) ${currency}`;
	const amount = (data[colName]) ? data[colName].split(' ')[0].replace('(', '-').replace(')', '') : '0.0';
	return help.parseAmount(amount, currency);
};

const CASHAPP_PAYMENT_TRANID = 'jbp08f';

const krakenCostMarkets = ['USDC', 'XBT', 'ETH', 'USD'];
const krakenMarketMap = {
	'XETHX': 'ETH',
	'XETHZ': 'ETH',
	'XBT': 'BTC',
	'XXBTZ': 'BTC',
	'XXDGX': 'DOGE',
	'XDG': 'DOGE',
	'XREPX': 'REP',
	'XZECX': 'ZEC',
	'XETCX': 'ETC',
	'XETCZ': 'ETC',
	'XLTCX': 'LTC',
	'XLTCZ': 'LTC'
};
const BITTREX_FEE_RATE = 0.0035;
const CRYPTOCOM_FEE_RATE = 0.004;
const CRYPTOCOM_WITHDRAWAL_FEE_RATE = 0.013;

const converters = {
	'cashapp': (data) => {
		const trans = {
			date: moment(data['Date'], 'YYYY-MM-DD HH:mm:ss').toDate(),
			exchange: 'cashapp'
		};
		if (data['Asset Type'] !== 'BTC')
			return null;
		trans['uid'] = data['Transaction ID'];
		const transType = data['Transaction Type'];
		if (trans['uuid'] == CASHAPP_PAYMENT_TRANID) {
			trans['type'] = 'trade';
			trans['trade-type'] = 'sell';
			trans['currency'] = 'USD';
			trans['net-amount'] = trans['amount-usd'] = Math.abs(help.currStrToNum(data['Net Amount']));
			trans['amount'] = Math.abs(help.currStrToNum(data['Amount']));

			trans['cost-currency'] = 'BTC';
			trans['net-cost'] = trans['cost'] = Math.abs(help.strToSatsNum(data['Asset Amount']));
			trans['price'] = help.currStrToNum(data['Asset Price']);

			trans['rate'] = help.fixDecimal(trans['amount'] / trans['cost']);
			trans['net-rate'] = help.fixDecimal(trans['net-amount'] / trans['net-cost']);

			trans['fee-currency'] = 'USD';
			trans['fee'] = Math.abs(help.currStrToNum(data['Fee']));
		} else if (transType == 'Bitcoin Buy') {
			trans['type'] = 'trade';
			trans['trade-type'] = 'buy';
			trans['currency'] = data['Asset Type'];
			trans['amount'] = trans['net-amount'] = Math.abs(help.strToSatsNum(data['Asset Amount']));

			trans['cost-currency'] = 'USD';
			trans['net-cost'] = trans['amount-usd'] = Math.abs(help.currStrToNum(data['Net Amount']));
			trans['cost'] = Math.abs(help.currStrToNum(data['Amount']));
			trans['price'] = help.currStrToNum(data['Asset Price']);
			trans['rate'] = help.fixDecimal(trans['amount'] / trans['cost']);
			trans['net-rate'] = help.fixDecimal(trans['net-amount'] / trans['net-cost']);

			trans['fee'] = Math.abs(help.currStrToNum(data['Fee']));
			trans['fee-currency'] = 'USD';

		} else if (transType == 'Bitcoin Withdrawal') {
			trans['type'] = 'withdrawal';
			trans['currency'] = data['Asset Type'];
			trans['amount'] = help.strToSatsNum(data['Asset Amount']);

			const parts = data['Notes'].split(' ');
			const feeStr = parts[parts.length - 1];
			trans['fee'] = help.strToSatsNum(feeStr.substring(0, feeStr.length - 1));
			trans['fee-currency'] = trans['currency'];
			trans['net-cost'] = trans['amount'] + trans['fee'];

			trans['amount-usd'] = Math.abs(help.currStrToNum(data['Net Amount']));
			trans['fee-usd'] = help.currStrToNum(data['Fee']);
			trans['cost-usd'] = Math.abs(help.currStrToNum(data['Amount']));
		} else if (transType == 'Bitcoin Deposit') {
			trans['type'] = 'deposit';
			trans['currency'] = data['Asset Type'];
			trans['amount'] = trans['net-amount'] = help.strToSatsNum(data['Asset Amount']);

			trans['amount-usd'] = Math.abs(help.currStrToNum(data['Net Amount']));
		} else {
			return null;
		}
		return trans;
	},
	'strike': (data) => {
		const trans = {
			date: moment(data['Time (UTC)'], 'MMM DD YYYY HH:mm:ss').toDate(),
			exchange: 'strike'
		};
		if (data['Currency 2'] == 'BTC') {
			const transType = data['Transaction Type'];
			if (transType == 'Trade') {
				trans['type'] = 'trade';
				trans['price'] = help.currStrToNum(data['BTC Price']);
				trans['fee'] = 0;
				trans['fee-currency'] = 'USD';

				const rawAmount = help.strToSatsNum(data['Amount 2']);
				if (rawAmount > 0) {
					trans['trade-type'] = 'buy';
					trans['currency'] = 'BTC';
					trans['amount'] = trans['net-amount'] = rawAmount;

					trans['cost-currency'] = 'USD';
					trans['net-cost'] = trans['amount-usd'] = trans['cost'] = Math.abs(help.currStrToNum(data['Amount 1']));
					trans['rate'] = help.fixDecimal(trans['amount'] / trans['cost']);
					trans['net-rate'] = help.fixDecimal(trans['net-amount'] / trans['net-cost']);
				} else {
					trans['trade-type'] = 'sell';
					trans['currency'] = 'USD';
					trans['amount'] = trans['net-amount'] = trans['amount-usd'] = Math.abs(help.currStrToNum(data['Amount 1']));

					// ***
					trans['cost-currency'] = 'BTC';
					trans['net-cost'] = trans['cost'] = Math.abs(help.strToSatsNum(data['Amount 2']));
					trans['rate'] = help.fixDecimal(trans['amount'] / trans['cost']);
					trans['net-rate'] = help.fixDecimal(trans['net-amount'] / trans['net-cost']);
				}
			} else if (transType == 'Withdrawal') {
				trans['type'] = 'withdrawal';
				trans['currency'] = 'BTC';
				trans['amount'] = Math.abs(help.strToSatsNum(data['Amount 2']));

				trans['fee'] = 0;
				trans['fee-currency'] = trans['currency'];
				trans['net-cost'] = trans['amount'] + trans['fee'];

				trans['amount-usd'] = 0;
				trans['fee-usd'] = 0;
				trans['cost-usd'] = 0;
			} else {
				console.error('UNKNOWN TYPE: ' + transType);
				return null;
			}
		} else {
			return null;
		}
		return trans;
	},
	'gemini': (data) => {
		const trans = {
			date: moment.utc(data['Date'] + ' ' + data['Time (UTC)'], 'YYYY-MM-DD HH:mm:ss.SSS').toDate(),
			exchange: 'gemini'
		};
		const transType = data['Type'];
		if (transType == 'Buy') {
			const symbol = data['Symbol'];
			const endLen = (symbol.length > 6 && symbol.endsWith('GUSD')) ? 4 : 3;
			const costCurr = symbol.substring(symbol.length - endLen);
			const assetCurr = symbol.substring(0, symbol.length - costCurr.length);

			trans['type'] = 'trade';
			trans['trade-type'] = 'buy';
			trans['currency'] = assetCurr;
			trans['amount'] = trans['net-amount'] = geminiGetAmount(data, assetCurr);

			trans['cost-currency'] = costCurr;
			trans['fee-currency'] = costCurr;
			trans['fee'] = Math.abs(geminiGetAmount(data, costCurr, true));
			trans['cost'] = Math.abs(geminiGetAmount(data, costCurr));
			trans['net-cost'] = help.fixDecimal(trans['cost'] + trans['fee']);

			const numer = (costCurr == 'BTC') ? help.satsToBTC(trans['cost']) : trans['cost'];
			const denom = (assetCurr == 'BTC') ? help.satsToBTC(trans['amount']) : trans['amount'];
			trans['price'] = help.fixDecimal(numer / denom);

			trans['rate'] = help.fixDecimal(trans['amount'] / trans['cost']);
			trans['net-rate'] = help.fixDecimal(trans['net-amount'] / trans['net-cost']);

		} else if (transType == 'Sell') {
			const symbol = data['Symbol'];
			const assetCurr = symbol.substring(symbol.length - 3);
			const costCurr = symbol.substring(0, symbol.length - 3);

			trans['type'] = 'trade';
			trans['trade-type'] = 'sell';
			trans['currency'] = assetCurr;
			trans['amount'] = geminiGetAmount(data, assetCurr);
			trans['fee-currency'] = assetCurr;
			trans['fee'] = Math.abs(geminiGetAmount(data, assetCurr, true));
			trans['net-amount'] = help.fixDecimal(trans['amount'] - trans['fee']);

			trans['cost-currency'] = costCurr;
			trans['cost'] = trans['net-cost'] = Math.abs(geminiGetAmount(data, costCurr));

			const denom = (costCurr == 'BTC') ? help.satsToBTC(trans['cost']) : trans['cost'];
			const numer = (assetCurr == 'BTC') ? help.satsToBTC(trans['amount']) : trans['amount'];
			trans['price'] = help.fixDecimal(numer / denom);

			trans['rate'] = help.fixDecimal(trans['amount'] / trans['cost']);
			trans['net-rate'] = help.fixDecimal(trans['net-amount'] / trans['net-cost']);
		} else if (transType == 'Credit') {
			trans['type'] = 'deposit';
			trans['currency'] = data['Symbol'];
			trans['amount'] = trans['net-amount'] = geminiGetAmount(data, trans['currency']);
		} else if (transType == 'Debit') {
			trans['type'] = 'withdrawal';
			trans['currency'] = data['Symbol'];
			trans['amount'] = Math.abs(geminiGetAmount(data, trans['currency']));

			trans['fee'] = Math.abs(geminiGetAmount(data, trans['currency'], true));
			trans['fee-currency'] = trans['currency'];
			trans['net-cost'] = help.fixDecimal(trans['amount'] + trans['fee']);
		} else {
			console.error('UNKNOWN TYPE: ' + transType);
		}
		return trans;
	},
	'kraken': (data) => {
		const trans = {
			date: moment.utc(data['time'], 'YYYY-MM-DD HH:mm:ss.SSS').toDate(),
			uid: data['txid'],
			orderId: data['ordertxid'],
			exchange: 'kraken'
		};
		const pairStr = data['pair'];
		const pair = { left: '', right: '' };
		if (!krakenCostMarkets.some((str) => {
			if (pairStr.endsWith(str)) {
				pair.right = str;
				pair.left = pairStr.substring(0, pairStr.length - str.length);
				return true;
			}
			return false;
		})) {
			console.error(`Unable to parse ${pairStr}`);
			return null;
		}

		if (krakenMarketMap[pair.left]) {
			pair.left = krakenMarketMap[pair.left];
		}
		if (krakenMarketMap[pair.right]) {
			pair.right = krakenMarketMap[pair.right];
		}

		const transType = data['type'];
		if (transType == 'buy') {
			const costCurr = pair.right;
			const assetCurr = pair.left;

			trans['type'] = 'trade';
			trans['trade-type'] = 'buy';
			trans['currency'] = assetCurr;
			trans['amount'] = trans['net-amount'] = help.parseAmount(data['vol'], assetCurr);

			trans['fee-currency'] = costCurr;
			trans['cost-currency'] = costCurr;
			trans['fee'] = help.parseAmount(data['fee'], costCurr);
			trans['cost'] = help.parseAmount(data['cost'], costCurr);
			trans['price'] = parseNum(data['price']);
			trans['net-cost'] = help.fixDecimal(trans['cost'] + trans['fee']);

			trans['rate'] = help.fixDecimal(trans['amount'] / trans['cost']);
			trans['net-rate'] = help.fixDecimal(trans['net-amount'] / trans['net-cost']);

		} else if (transType == 'sell') {
			const costCurr = pair.left;
			const assetCurr = pair.right;

			trans['type'] = 'trade';
			trans['trade-type'] = 'sell';
			trans['currency'] = assetCurr;
			trans['amount'] = help.parseAmount(data['cost'], assetCurr);

			trans['fee-currency'] = assetCurr;
			trans['fee'] = help.parseAmount(data['fee'], assetCurr);
			trans['net-amount'] = help.fixDecimal(trans['amount'] - trans['fee']);

			trans['cost-currency'] = costCurr;
			trans['net-cost'] = trans['cost'] = help.parseAmount(data['vol'], costCurr);
			trans['price'] = parseNum(data['price']);

			trans['rate'] = help.fixDecimal(trans['amount'] / trans['cost']);
			trans['net-rate'] = help.fixDecimal(trans['net-amount'] / trans['net-cost']);

		} else {
			console.error('UNKNOWN TYPE: ' + transType);
			return null;
		}
		return trans;
	},
	'bittrex': (data) => {
		const trans = {
			date: moment.utc(data['Closed (UTC)']).toDate(),
			uid: data['Uuid'],
			exchange: 'bittrex',
			type: 'trade'
		};
		const pairStr = data['Exchange'];
		const pair = {
			left: pairStr.split('-')[0],
			right: pairStr.split('-')[1]
		};
		const transType = data['Type'];
		if (transType == 'LIMIT_BUY') {
			const costCurr = pair.left;
			const assetCurr = pair.right;

			trans['trade-type'] = 'buy';
			trans['currency'] = assetCurr;
			trans['amount'] = trans['net-amount'] = help.fixDecimal(help.parseAmount(data['Quantity'], assetCurr) - help.parseAmount(data['Remaining'], assetCurr));

			trans['fee-currency'] = costCurr;
			trans['cost-currency'] = costCurr;
			trans['cost'] = help.parseAmount(data['Price'], costCurr);
			trans['price'] = parseNum(data['Avg. Price per Share']);

			const tempRate = help.fixDecimal(1 + BITTREX_FEE_RATE);
			trans['net-cost'] = help.fixDecimal(trans['cost'] * tempRate);
			if (costCurr == 'BTC')
				trans['net-cost'] = Math.round(trans['net-cost']);
			trans['fee'] = help.fixDecimal(trans['net-cost'] - trans['cost']);

			trans['rate'] = help.fixDecimal(trans['amount'] / trans['cost']);
			trans['net-rate'] = help.fixDecimal(trans['net-amount'] / trans['net-cost']);
		} else if (transType == 'LIMIT_SELL') {
			const costCurr = pair.right;
			const assetCurr = pair.left;

			trans['trade-type'] = 'sell';
			trans['currency'] = assetCurr;
			trans['amount'] = help.parseAmount(data['Price'], assetCurr);

			trans['fee-currency'] = assetCurr;
			trans['fee'] = help.fixDecimal(trans['amount'] * BITTREX_FEE_RATE);
			if (assetCurr == 'BTC')
				trans['fee'] = Math.round(trans['fee']);
			trans['net-amount'] = help.fixDecimal(trans['amount'] - trans['fee']);

			trans['cost-currency'] = costCurr;
			trans['net-cost'] = trans['cost'] = help.fixDecimal(help.parseAmount(data['Quantity'], costCurr) - help.parseAmount(data['Remaining'], costCurr));
			trans['price'] = parseNum(data['Avg. Price per Share']);

			trans['rate'] = help.fixDecimal(trans['amount'] / trans['cost']);
			trans['net-rate'] = help.fixDecimal(trans['net-amount'] / trans['net-cost']);
		}
		else {
			console.error(`UNKNOWN TYPE: ${transType}`);
			return null;
		}
		return trans;
	},
	'bittrex-withdrawal': (data) => {
		const trans = {
			date: moment.utc(data['OpenedDate']).toDate(),
			uid: data['PaymentUuid'],
			txid: data['TxId'],
			to: data['Address'],
			exchange: 'bittrex',
			type: 'withdrawal',
			currency: data['Currency']
		};

		trans['amount'] = help.parseAmount(data['Amount'], trans['currency']);
		trans['fee-currency'] = trans['currency'];
		trans['fee'] = help.parseAmount(data['TxFee'], trans['fee-currency']);
		trans['net-cost'] = help.fixDecimal(trans['amount'] + trans['fee']);

		return trans;
	},
	'cryptocom': (data) => {
		const trans = {
			date: moment.utc(data['Timestamp (UTC)'], 'YYYY-MM-DD HH:mm:ss').toDate(),
			exchange: 'cryptocom',
			description: data['Transaction Description']
		};
		const transType = data['Transaction Kind'];

		if (transType == 'crypto_earn_interest_paid' ||
			transType == 'mco_stake_reward' ||
			transType == 'rewards_platform_deposit_credited') {
			trans['type'] = 'interest';
			trans['currency'] = data['Currency'];
			trans['amount'] = trans['net-amount'] = help.parseAmount(data['Amount'], trans['currency']);
			trans['amount-usd'] = help.parseAmount(data['Native Amount (in USD)'], 'USD');
		} else if (transType == 'referral_card_cashback' ||
				   transType == 'reimbursement' ||
				   transType == 'reimbursement_reverted' ||
				   transType == 'card_cashback_reverted') {
			trans['type'] = 'cashback';
			trans['currency'] = data['Currency'];
			trans['amount'] = trans['net-amount'] = help.parseAmount(data['Amount'], trans['currency']);
			trans['amount-usd'] = help.parseAmount(data['Native Amount (in USD)'], 'USD');
		} else if (transType == 'crypto_earn_program_created' ||
				   transType == 'crypto_earn_program_withdrawn' ||
				   transType == 'lockup_upgrade' ||
				   transType == 'lockup_swap_rebate' ||
				   transType == 'dynamic_coin_swap_credited' ||
				   transType == 'dynamic_coin_swap_debited' ||
				   transType == 'dynamic_coin_swap_bonus_earn_deposit' ||
				   transType == 'lockup_swap_credited' ||
				   transType == 'lockup_swap_debited' ||
				   transType == 'crypto_wallet_swap_credited' ||
				   transType == 'crypto_wallet_swap_debited' ||
				   transType == 'lockup_lock' ||
				   transType == 'lockup_unlock' ||
				   transType == 'trading.limit_order.crypto_wallet.fund_unlock' ||
				   transType == 'trading.limit_order.crypto_wallet.fund_lock' ||
				   transType == 'viban_deposit_precredit' ||
				   transType == 'viban_deposit_precredit_repayment') {
			return null;
		} else if (transType == 'crypto_exchange' ||
			       transType == 'viban_purchase') {
			const costCurr = data['Currency'];
			const assetCurr = data['To Currency'];

			trans['type'] = 'trade';
			trans['trade-type'] = 'buy';
			trans['currency'] = assetCurr;
			trans['amount'] = trans['net-amount'] = help.parseAmount(data['To Amount'], assetCurr);
			trans['amount-usd'] = trans['cost-usd'] = help.parseAmount(data['Native Amount (in USD)'], 'USD');

			trans['fee-currency'] = costCurr;
			trans['cost-currency'] = costCurr;
			trans['net-cost'] = Math.abs(help.parseAmount(data['Amount'], costCurr));
			trans['cost'] = help.fixDecimal(trans['net-cost'] / help.fixDecimal(1 + CRYPTOCOM_FEE_RATE));
			if (costCurr == 'BTC')
				trans['cost'] = Math.round(trans['cost']);
			trans['fee'] = help.fixDecimal(trans['net-cost'] - trans['cost']);

			const numer = (costCurr == 'BTC') ? help.satsToBTC(trans['cost']) : trans['cost'];
			const denom = (assetCurr == 'BTC') ? help.satsToBTC(trans['amount']) : trans['amount'];
			trans['price'] = help.fixDecimal(numer / denom);

			trans['rate'] = help.fixDecimal(trans['amount'] / trans['cost']);
			trans['net-rate'] = help.fixDecimal(trans['net-amount'] / trans['net-cost']);
		} else if (transType == 'card_top_up' ||
				   transType == 'crypto_viban_exchange') {
			const costCurr = data['Currency'];
			const assetCurr = 'USD';

			trans['type'] = 'trade';
			trans['trade-type'] = 'buy';
			trans['currency'] = assetCurr;
			trans['amount'] = trans['net-amount'] = Math.abs(help.parseAmount(data['Native Amount (in USD)'], 'USD'));
			trans['amount-usd'] = trans['cost-usd'] = trans['amount'];

			trans['fee-currency'] = costCurr;
			trans['cost-currency'] = costCurr;
			trans['net-cost'] = Math.abs(help.parseAmount(data['Amount'], costCurr));
			trans['cost'] = help.fixDecimal(trans['net-cost'] / help.fixDecimal(1 + CRYPTOCOM_FEE_RATE));
			if (costCurr == 'BTC')
				trans['cost'] = Math.round(trans['cost']);
			trans['fee'] = help.fixDecimal(trans['net-cost'] - trans['cost']);

			const denom = (costCurr == 'BTC') ? help.satsToBTC(trans['cost']) : trans['cost'];
			const numer = (assetCurr == 'BTC') ? help.satsToBTC(trans['amount']) : trans['amount'];
			trans['price'] = help.fixDecimal(numer / denom);

			trans['rate'] = help.fixDecimal(trans['amount'] / trans['cost']);
			trans['net-rate'] = help.fixDecimal(trans['net-amount'] / trans['net-cost']);

		} else if (transType == 'dust_conversion_credited' || transType == 'dust_conversion_debited' || transType == 'lockup_swap_rebate') {
			// Assuming this isn't worth my time for now
			return null;
		} else if (transType == 'crypto_deposit') {
			trans['type'] = 'deposit';
			trans['currency'] = data['Currency'];
			trans['amount'] = trans['net-amount'] = help.parseAmount(data['Amount'], trans['currency']);

			trans['amount-usd'] = help.parseAmount(data['Native Amount (in USD)'], 'USD');
		} else if (transType == 'crypto_withdrawal') {
			trans['type'] = 'withdrawal';
			trans['currency'] = data['Currency'];
			trans['net-cost'] = Math.abs(help.parseAmount(data['Amount'], trans['currency']));

			if (trans['currency'] == 'BTC') {
				trans['amount'] = Math.round(help.fixDecimal(trans['net-cost'] / help.fixDecimal(1 + CRYPTOCOM_WITHDRAWAL_FEE_RATE)));
			} else {
				trans['amount'] = trans['net-cost'];
			}
			trans['fee'] = help.fixDecimal(trans['net-cost'] - trans['amount']);
			trans['fee-currency'] = trans['currency'];
			trans['amount-usd'] = Math.abs(help.parseAmount(data['Native Amount (in USD)'], 'USD'));
		} else {
			console.error(`UNKNOWN TYPE: ${transType}`);
			return null;
		}
		return trans;
	},
	'celsius': (data) => {
		const trans = {
			date: moment(data[' Date and time'], 'MMMM D, YYYY h:mm A').toDate(),
			uid: data['Internal id'],
			description: data[' Transaction type'],
			exchange: 'celsius'
		};
		const transType = trans['description'];
		const assetCurr = data[' Coin type'];

		if (transType == 'Operation cost' ||
			transType == 'Loan Interest Payment') {
			trans['type'] = 'fee';
			trans['currency'] = 'USD';
			trans['cost-currency'] = assetCurr;
			trans['amount'] = trans['net-amount'] = Math.abs(help.fixDecimal(help.parseAmount(data[' USD Value'], 'USD')));

			trans['amount-usd'] = trans['cost-usd'] = trans['amount'];
			trans['cost'] = trans['net-cost'] = Math.abs(help.fixDecimal(help.parseAmount(data[' Coin amount'], trans['currency'])));
		} else if (transType == 'Loan Principal Liquidation') {
			const costCurr = 'USD';

			trans['type'] = 'trade';
			trans['trade-type'] = 'buy';
			trans['currency'] = costCurr;
			trans['amount'] = trans['net-amount'] = Math.abs(help.parseAmount(data[' USD Value'], 'USD'));
			trans['amount-usd'] = trans['amount'];

			trans['fee-currency'] = assetCurr;
			trans['fee'] = 0;
			trans['cost-currency'] = assetCurr;
			trans['cost'] = trans['net-cost'] = Math.abs(help.parseAmount(data[' Coin amount'], trans['currency']));

			const denom = (costCurr == 'BTC') ? help.satsToBTC(trans['cost']) : trans['cost'];
			const numer = (assetCurr == 'BTC') ? help.satsToBTC(trans['amount']) : trans['amount'];
			trans['price'] = help.fixDecimal(numer / denom);

			trans['rate'] = help.fixDecimal(trans['amount'] / trans['cost']);
			trans['net-rate'] = help.fixDecimal(trans['net-amount'] / trans['net-cost']);

		} else if (transType == 'Collateral' ||
				   transType == 'Ignore') {
			return null;
		} else if (transType == 'Reward' ||
				   transType == 'Referrer Award') {
			trans['type'] = 'interest';
			trans['currency'] = assetCurr;
			trans['amount'] = trans['net-amount'] = Math.abs(help.parseAmount(data[' Coin amount'], trans['currency']));
			trans['amount-usd'] = help.parseAmount(data[' USD Value'], 'USD');
		} else if (transType == 'Transfer') {
			trans['type'] = 'deposit';
			trans['currency'] = assetCurr
			trans['amount'] = trans['net-amount'] = help.parseAmount(data[' Coin amount'], trans['currency'])

			trans['amount-usd'] = help.parseAmount(data[' USD Value'], 'USD');
		} else if (transType == 'Withdrawal') {
			trans['type'] = 'withdrawal';
			trans['currency'] = assetCurr;
			trans['net-cost'] = trans['amount'] = Math.abs(help.parseAmount(data[' Coin amount'], trans['currency']));

			trans['fee'] = 0;
			trans['fee-currency'] = trans['currency'];

			trans['amount-usd'] = Math.abs(help.parseAmount(data[' USD Value'], 'USD'));
		} else {
			console.error(`UNKNOWN TYPE: ${transType}`);
			return null;
		}

		return trans;
	},
	'nexo': (data) => {
		const trans = {
			date: moment.utc(data['Date / Time'], 'YYYY-MM-DD HH:mm:ss').toDate(),
			uid: data['Transaction'],
			description: data['Details'].split(' / ')[1],
			exchange: 'nexo'
		};
		const transType = data['Type'];

		if (transType == 'Withdrawal') {
			trans['type'] = 'withdrawal';
			trans['currency'] = data['Output Currency'];
			trans['net-cost'] = trans['amount'] = Math.abs(help.parseAmount(data['Output Amount'], trans['currency']));

			trans['fee'] = 0;
			trans['fee-currency'] = trans['currency'];

			trans['amount-usd'] = help.parseAmount(data['USD Equivalent'], 'USD');
		} else if (transType == 'Deposit') {
			trans['type'] = 'deposit';
			trans['currency'] = data['Output Currency'];
			trans['amount'] = trans['net-amount'] = help.parseAmount(data['Output Amount'], trans['currency'])

			trans['amount-usd'] = help.parseAmount(data['USD Equivalent'], 'USD');
		} else if (transType == 'Interest' ||
				   transType == 'Dividend' ||
				   transType == 'ReferralBonus') {
			trans['type'] = 'interest';
			trans['interest-type'] = transType;
			trans['currency'] = data['Output Currency'];
			trans['amount'] = trans['net-amount'] = Math.abs(help.parseAmount(data['Output Amount'], trans['currency']));
			trans['amount-usd'] = help.parseAmount(data['USD Equivalent'], 'USD');
		} else {
			console.error(`UNKNOWN TYPE: ${transType}`);
			return null;
		}
		return trans;
	},
	'binance': (data) => {
		return {
			dateStr: data['UTC_Time'],
			type: data['Operation'],
			currency: data['Coin'],
			amountStr: data['Change']
		};
	},
	counter: {},
	incrementCounter: (key) => {
		if (!converters.counter[key])
			converters.counter[key] = 0;
		converters.counter[key] += 1;
	}
};

const processors = {
	'binance': (allTrans) => {
		const finalTrans = [];
		const groups = {};
		const dust = {};
		const ignoredInterest = {};
		allTrans.forEach((trx) => {
			const trans = {
				date: moment.utc(trx.dateStr).toDate(),
				exchange: 'binance',
				description: trx.type,
				currency: trx.currency
			};

			if (trx.type == 'Savings purchase' ||
				trx.type == 'POS savings purchase' ||
				trx.type == 'Savings Principal redemption') {
				return null;
			} else if (trx.type == 'Distribution' ||
				trx.type == 'Savings Interest' ||
				trx.type == 'POS savings interest') {
				trans['type'] = 'interest';
				trans['amount'] = trans['net-amount'] = help.parseAmount(trx.amountStr, trx.currency);
				if (priceHistory.usdHistoryCurrencies[trx.currency]) {
					trans['amount-usd'] = help.fixDecimal(trans['amount'] * priceHistory.getUSDPrice(trx.currency, trans.date));
					finalTrans.push(trans);
				} else {
					if (!ignoredInterest[trx.currency]) {
						ignoredInterest[trx.currency] = 0;
					}
					ignoredInterest[trx.currency] += trans['amount'];
				}
			} else if (trx.type == 'Deposit') {
				trans['type'] = 'deposit';
				trans['amount'] = trans['net-amount'] = help.parseAmount(trx.amountStr, trx.currency);
				finalTrans.push(trans);
			} else if (trx.type == 'Withdraw') {
				trans['type'] = 'withdrawal';
				trans['amount'] = trans['net-amount'] = help.parseAmount(trx.amountStr, trx.currency);
				trans['cost'] = trans['net-cost'] = trans['amount'];
				trans['fee'] = 0;
				trans['fee-currency'] = trx.currency;
				finalTrans.push(trans);
			} else if (trx.type == 'Small assets exchange BNB') {
				if (!dust[trx.dateStr]) {
					dust[trx.dateStr] = {
						date: moment.utc(trx.dateStr).toDate(),
						changes: {}
					};
				}
				if (!dust[trx.dateStr].changes[trx.currency]) {
					dust[trx.dateStr].changes[trx.currency] = 0;
				}
				dust[trx.dateStr].changes[trx.currency] = help.fixDecimal(dust[trx.dateStr].changes[trx.currency] + help.parseAmount(trx.amountStr, trx.currency));
			} else {
				if (!groups[trx.dateStr]) {
					groups[trx.dateStr] = {
						date: moment.utc(trx.dateStr).toDate()
					};
				}
				if (trx.type == 'Buy' || trx.type == 'Sell') {
					if (!groups[trx.dateStr][trx.type]) {
						groups[trx.dateStr][trx.type] = {
							currency: trx.currency,
							amounts: []
						};
					}
					groups[trx.dateStr][trx.type].amounts.push(help.parseAmount(trx.amountStr, trx.currency));
					if (groups[trx.dateStr][trx.type].currency != trx.currency) {
						console.error(`Mismatching currencies for ${trx.type} on ${trx.dateStr}`);
					}
				} else {
					if (!groups[trx.dateStr]['Fee']) {
						groups[trx.dateStr]['Fee'] = {
							currencies: [],
							amounts: {}
						};
					}
					if (!groups[trx.dateStr]['Fee'].amounts[trx.currency]) {
						groups[trx.dateStr]['Fee'].currencies.push(trx.currency);
						groups[trx.dateStr]['Fee'].amounts[trx.currency] = [];
					}
					groups[trx.dateStr]['Fee'].amounts[trx.currency].push(help.parseAmount(trx.amountStr, trx.currency));
				}
			}
		});
		Object.keys(groups).forEach((groupId) => {
			const group = groups[groupId];
			const trans = {
				date: group.date,
				exchange: 'binance',
				description: 'Spot Trade',
				type: 'trade',
				'trade-type': 'buy'
			};

			if (!group['Buy'] || !group['Sell'] || !group['Fee']) {
				console.error("Invalid group");
				console.log(group);
				return;
			}

			const currency = group['Buy'].currency;
			const costCurrency = group['Sell'].currency;

			let feeCurrency = null;
			if (group['Fee'].currencies.length == 1) {
				feeCurrency = group['Fee'].currencies[0];
			}
			if (group['Fee'].currencies.length > 1) {
				group['Fee'].currencies.forEach((feeCurr) => {
					if (feeCurr == currency) {
						group['Buy'].amounts = group['Buy'].amounts.concat(group['Fee'].amounts[feeCurr]);
					} else if (feeCurr == costCurrency) {
						group['Sell'].amounts = group['Sell'].amounts.concat(group['Fee'].amounts[feeCurr]);
					} else {
						feeCurrency = feeCurr;
					}
				});
			}
			const feeAmount = Math.abs(group['Fee'].amounts[feeCurrency].reduce((partialSum, a) => help.fixDecimal(partialSum + a), 0));

			trans['currency'] = currency;
			trans['amount'] = group['Buy'].amounts.reduce((sum, a) => help.fixDecimal(sum + a), 0);
			if (feeCurrency == currency) {
				trans['net-amount'] = help.fixDecimal(trans['amount'] - feeAmount);
			} else {
				trans['net-amount'] = trans['amount'];
			}

			trans['cost-currency'] = costCurrency;
			trans['cost'] = trans['net-cost'] = Math.abs(group['Sell'].amounts.reduce((sum, a) => help.fixDecimal(sum + a), 0));

			trans['fee-currency'] = feeCurrency;
			trans['fee'] = feeAmount;

			trans['rate'] = help.fixDecimal(trans['amount'] / trans['cost']);
			trans['net-rate'] = help.fixDecimal(trans['net-amount'] / trans['net-cost']);

			const denom = (costCurrency == 'BTC') ? help.satsToBTC(trans['cost']) : trans['cost'];
			const numer = (currency == 'BTC') ? help.satsToBTC(trans['amount']) : trans['amount'];
			trans['price'] = help.fixDecimal(numer / denom);

			finalTrans.push(trans);
		});
		let dustTrans = 0;
		let dustBNB = 0;
		let dustUSD = 0;
		Object.keys(dust).forEach((dustId) => {
			const group = dust[dustId];
			if (!group.changes['BNB'])
				console.log(group);
			dustTrans++;
			dustBNB += group.changes['BNB'];
			dustUSD += help.fixDecimal(group.changes['BNB'] * priceHistory.getUSDPrice('BNB', group['date']));
		});
		if (processors.debug) {
			console.log('Ignored Interest: ');
			console.log(ignoredInterest);
			console.log(`Ignoring ${dustTrans} Binance dust transactions worth a total of $${dustUSD} (${dustBNB} BNB)`);
		}

		return finalTrans;
	}
};

const csvs2021 = [
	{ file: 'local/2021/GeminiHistory-2018-2021.csv', conv: 'gemini'},
	{ file: 'local/2021/Kraken-Trades-2021.csv', conv: 'kraken'},
	{ file: 'local/2021/Bittrex-Orders-AllTime.csv', conv: 'bittrex'},
	{ file: 'local/2021/Bittrex-Withdrawals-AllTime.csv', conv: 'bittrex-withdrawal'},
	{ file: 'local/2021/cryptocomHistory-2020.csv', conv: 'cryptocom'},
	{ file: 'local/2021/cryptocomHistory-2021.csv', conv: 'cryptocom'},
	{ file: 'local/2021/CelsiusExport-02-2021-to-01-22-2022.csv', conv: 'celsius'},
	{ file: 'local/2021/Nexo_Transactions_2021.csv', conv: 'nexo'},
	{ file: 'local/2021/BinanceHistory2020-2021.csv', conv: 'binance', proc: 'binance'}
];

const csvs2021only = [
	{ file: 'local/2021/cash_app_report.csv', conv: 'cashapp'}
];

const get2021GainsTransactions = () => {
	return Promise.all([convCSV.convertCSV('local/2021/cash_app_report.csv', converters['cashapp']),
					convCSV.convertCSV('local/2021/GeminiHistory-2018-2021.csv', converters['gemini']),
					convCSV.convertCSV('local/2021/Kraken-Trades-2021.csv', converters['kraken']),
					convCSV.convertCSV('local/2021/Bittrex-Orders-AllTime.csv', converters['bittrex']),
					convCSV.convertCSV('local/2021/Bittrex-Withdrawals-AllTime.csv', converters['bittrex-withdrawal']),
					convCSV.convertCSV('local/2021/cryptocomHistory-2021.csv', converters['cryptocom']),
					convCSV.convertCSV('local/2021/cryptocomHistory-2020.csv', converters['cryptocom']),
					convCSV.convertCSV('local/2021/CelsiusExport-02-2021-to-01-22-2022.csv', converters['celsius']),
					convCSV.convertCSV('local/2021/Nexo_Transactions_2021.csv', converters['nexo']),
					convCSV.convertCSV('local/2021/BinanceHistory2020-2021.csv', converters['binance'], processors['binance'])
	])
	.then((parts) => {
		const allTrans = [].concat.apply([], parts).filter((tran) => {
			if (tran.type == 'trade' && !isFinite(tran['rate'])) {
				return false;
			}
			return true;
		});
		return allTrans;
	})
	.catch((err) => {
		console.error(err);
		process.exit();
	});
};

const csvs2022 = [
	{ file: 'local/2022/CelsiusExport-01-29-2022-to-03-18-2023.csv', conv: 'celsius'},
	{ file: 'local/2022/cryptocomHistory-2022.csv', conv: 'cryptocom'},
	{ file: 'local/2022/GeminiExport-2022.csv', conv: 'gemini'},
	{ file: 'local/2022/Kraken-Trades-2022.csv', conv: 'kraken'},
	{ file: 'local/2022/Nexo_Transactions_2022.csv', conv: 'nexo'},
	{ file: 'local/2022/Strike-AnnualTransactions-2022.csv', conv: 'strike'}
];

const csvs2022only = [
	{ file: 'local/2022/cash_app_btc_report.csv', conv: 'cashapp'}
];

const csvs2023 = [
	{ file: 'local/2023/cryptocomHistory-2023.csv', conv: 'cryptocom'},
	{ file: 'local/2023/GeminiHistory-2023.csv', conv: 'gemini'},
	{ file: 'local/2023/Kraken-Trades-2023.csv', conv: 'kraken'}
];

const csvs2023only = [
	{ file: 'local/2023/cash_app_btc_report-2023.csv', conv: 'cashapp' }
];

const getGainsTransactions = (year) => {
	let csvList = [];
	if (year >= 2021)
		csvList = csvList.concat(csvs2021);
	if (year === 2021)
		csvList = csvList.concat(csvs2021only);
	if (year >= 2022)
		csvList = csvList.concat(csvs2022);
	if (year === 2022)
		csvList = csvList.concat(csvs2022only);
	if (year >= 2023)
		csvList = csvList.concat(csvs2023);
	if (year === 2023)
		csvList = csvList.concat(csvs2023only);

	console.log(`Processing ${csvList.length} CSVs for ${year}`);

	return Promise.all(csvList.map((pair) => {
		if (pair.proc) {
			return convCSV.convertCSV(pair.file, converters[pair.conv], processors[pair.proc]);
		}
		return convCSV.convertCSV(pair.file, converters[pair.conv]);
	}))
	.then((parts) => {
		const allTrans = [].concat.apply([], parts).filter((tran) => {
			if (tran.type == 'trade' && !isFinite(tran['rate'])) {
				return false;
			}
			return true;
		});
		return allTrans;
	})
	.catch((err) => {
		console.error(err);
		process.exit();
	});
}

module.exports = {
	get2021GainsTransactions: get2021GainsTransactions,
	getGainsTransactions: getGainsTransactions
};
