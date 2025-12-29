const help = require('./helpers');
const moment = require('moment');
const parseNum = require('parse-decimal-number');
const priceHistory = require('./price-history');


const sorters = {
	'FIFO': (a, b) => { return a['buy-date'] - b['buy-date'] },
	'FILO': (a, b) => { return b['buy-date'] - a['buy-date'] },
	'HIFO': (a, b) => { return (b['buy-usd'] / b['amount']) - (a['buy-usd'] / a['amount']) }
};

const printBank = (bank) => {
	console.log('Currencies:');
	Object.keys(bank.currencies).forEach((curr) => {
		if (bank.currencies[curr].basis.length) {
			if (bank.currencies[curr].balance > 0.1) {
				const bal = (curr == 'BTC') ? help.satsToBTC(bank.currencies[curr].balance) : bank.currencies[curr].balance;
				const avgBas = (curr == 'BTC') ? help.fixDecimal(bank.currencies[curr].avgBasis * help.SATS_PER_BTC) : bank.currencies[curr].avgBasis;
				const remainingTrans = bank.currencies[curr].basis.reduce((sum, next) => {
					if (next['remaining'] > 0)
						return sum + 1;
					return sum;
				}, 0);
				console.log(`+++++++ ${curr} ++++++ balance: ${bal} | avgBasis: $${avgBas} | ${remainingTrans} cost basis transactions left (out of ${bank.currencies[curr].basis.length} total)`);
			}
		}
	});
	const missingCurrs = Object.keys(bank.missing);
	if (missingCurrs.length) {
		console.log(`!!!!! UNACCOUNTED COST BASIS !!!!!!`);
		missingCurrs.forEach((curr) => {
			if (bank.missing[curr].total > 0.1) {
				const bal = (curr == 'BTC') ? help.satsToBTC(bank.missing[curr].total) : bank.missing[curr].total;
				const avgBas = (curr == 'BTC') ? help.fixDecimal(bank.missing[curr].avgBasis * help.SATS_PER_BTC) : bank.missing[curr].avgBasis;
				console.log(`!!!!! ${curr} !!!!! ${bal} Total Missing | avgBasis: $${avgBas} | sales count: ${bank.missing[curr].sales.length}`);
			}
		});
	}
	console.log(`---- ${bank.closed.length} CLOSED TRANSACTIONS ----`);
	console.log(`Total Interest: $${bank.interest}`);
	console.log(`Interest Info: `);
	console.log(bank.interestInfo);
	console.log('Fee info: ');
	console.log(bank.fees);
	console.log(`Short Gains: $${bank.gains} | Proceeds: ($${bank.shortProceeds}) - Cost Basis: ($${bank.shortBasis})`);
	console.log(`Long Gains: $${bank.longGains} | Proceeds: ($${bank.longProceeds}) - Cost Basis: ($${bank.longBasis})`);
};

const calcBalance = (arrBasis, isSell) => {
	const totals = arrBasis.reduce((sum, basis) => {
		if (basis['remaining']) {
			sum.balance = help.fixDecimal(sum.balance + basis['remaining']);
			sum.usdCost = help.fixDecimal(sum.usdCost + (!isSell ? basis['buy-usd-remaining'] : basis['sell-usd-remaining']));
		}
		return sum;
	},
	{
		balance: 0,
		usdCost: 0,
		avgBasis: 0
	});
	if (!totals.balance || !totals.usdCost)
		totals.avgBasis = 0;
	else
		totals.avgBasis = help.fixDecimal(totals.usdCost / totals.balance);
	return totals;
};

const addBasis = (bank, toAdd, sorter) => {
	const curr = toAdd['currency'];
	bank.currencies[curr].basis.push(toAdd);
	bank.currencies[curr].basis.sort(sorter);
	const updated = calcBalance(bank.currencies[curr].basis);
	bank.currencies[curr].balance = updated.balance;
	bank.currencies[curr].avgBasis = updated.avgBasis;
	if (bank.currencies[curr].minBalance > bank.currencies[curr].balance)
		bank.currencies[curr].minBalance = bank.currencies[curr].balance;
	return bank;
};

const removeBasis = (bank, toRemove) => {
	const curr = toRemove['currency'];
	bank.currencies[curr].basis.every((basisTrx) => {
		if (basisTrx['remaining'] > 0) {
			const closedTrx = {
				'currency': toRemove['currency'],
				'buy-date': basisTrx['buy-date'],
				'sell-date': toRemove['sell-date'],
				'buy-currency': basisTrx['buy-currency'],
				'sell-currency': toRemove['sell-currency'],
				'buy-trx': basisTrx['buy-trx'],
				'sell-trx': toRemove['sell-trx']
			};
			// If toRmove is larger than cost basis
			// remove entire basis, and store in closed
			if (toRemove['remaining'] >= basisTrx['remaining']) {
				const soldAmount = basisTrx['remaining'];
				const sellUsd = help.fixDecimal(toRemove['sell-usd-remaining'] * (soldAmount / toRemove['remaining']));

				closedTrx['amount'] = soldAmount;
				closedTrx['buy-usd'] = basisTrx['buy-usd-remaining'];
				closedTrx['sell-usd'] = sellUsd;

				toRemove['remaining'] = help.fixDecimal(toRemove['remaining'] - soldAmount);
				toRemove['sell-usd-remaining'] = help.fixDecimal(toRemove['sell-usd-remaining'] - sellUsd);
				basisTrx['remaining'] = basisTrx['buy-usd-remaining'] = 0;
			} else {
				const soldAmount = toRemove['remaining'];
				const buyUsd = help.fixDecimal(basisTrx['buy-usd-remaining'] * (soldAmount / basisTrx['remaining']));

				closedTrx['amount'] = soldAmount;
				closedTrx['buy-usd'] = buyUsd;
				closedTrx['sell-usd'] = toRemove['sell-usd-remaining'];

				basisTrx['remaining'] = help.fixDecimal(basisTrx['remaining'] - soldAmount);
				basisTrx['buy-usd-remaining'] = help.fixDecimal(basisTrx['buy-usd-remaining'] - buyUsd);
				toRemove['remaining'] = toRemove['sell-usd-remaining'] = 0;
			}

			const updated = calcBalance(bank.currencies[curr].basis);
			bank.currencies[curr].balance = updated.balance;
			bank.currencies[curr].avgBasis = updated.avgBasis;
			if (bank.currencies[curr].minBalance > bank.currencies[curr].balance) {
				bank.currencies[curr].minBalance = bank.currencies[curr].balance;
			}

			bank.closed.push(closedTrx);
			const newGains = help.fixDecimal(closedTrx['sell-usd'] - closedTrx['buy-usd']);
			const tsYear = 365 * 24 * 60 * 60 * 1000;
			if ((closedTrx['sell-date'] - closedTrx['buy-date']) > tsYear) {
				/*console.log("%%%%%%%%%%%%% LONG TERM GAIN!! %%%%%%%%%%%%%%%%");
				console.log(`Bought: ${closedTrx['buy-date']} | Sold: ${closedTrx['sell-date']}`);
				console.log(`Capital Gains of $${newGains} ($${closedTrx['sell-usd']} - $${closedTrx['buy-usd']}}`);*/
				bank.longGains = help.fixDecimal(bank.longGains + newGains);
				bank.longBasis = help.fixDecimal(bank.longBasis + closedTrx['buy-usd']);
				bank.longProceeds = help.fixDecimal(bank.longProceeds + closedTrx['sell-usd']);
			} else {
				bank.gains = help.fixDecimal(bank.gains + newGains);
				bank.shortBasis = help.fixDecimal(bank.shortBasis + closedTrx['buy-usd']);
				bank.shortProceeds = help.fixDecimal(bank.shortProceeds + closedTrx['sell-usd']);
			}
			if (calculateGains.debug)
				console.log(`Capital Gains of $${newGains} ($${closedTrx['sell-usd']} - $${closedTrx['buy-usd']}}`);
		}

		return toRemove['remaining'] > 0;
	});

	if (toRemove['remaining'] > 0) {
		if (calculateGains.debugMissing)
			console.error(`Unacccounted cost basis: ${toRemove['remaining']} ${curr} sold on ${toRemove['sell-date']}`);
		if (!curr) {
			console.error(`missing currency undefined for transaction:`);
			console.log(toRemove);
		}
		if (!bank.missing[curr]) {
			bank.missing[curr] = {
				total: 0,
				sales: []
			};
		}
		bank.missing[curr].sales.push(toRemove);

		const updated = calcBalance(bank.missing[curr].sales, true);
		bank.missing[curr].total = updated.balance;
		bank.missing[curr].avgBasis = updated.avgBasis;
	}

	return bank;
};

const getUSDValue = (currTrx) => {
	const currency = currTrx['currency'];
	const costCurrency = currTrx['cost-currency'];
	let targetCurr = null;
	let targetAmount = null;
	let usdTotal = 0;

	if (priceHistory.usdHistoryCurrencies[currency]) {
		targetCurr = currency;
		targetAmount = currTrx['amount'];
	} else if (priceHistory.usdHistoryCurrencies[costCurrency]) {
		targetCurr = costCurrency;
		targetAmount = currTrx['net-cost'];
	}
	if (targetCurr) {
		const usdPrice = priceHistory.getUSDPrice(targetCurr, currTrx['date']);
		if (targetCurr === 'BTC') {
			targetAmount = help.satsToBTC(targetAmount);
		}
		usdTotal = help.fixDecimal(usdPrice * targetAmount);
	} else {
		console.error(`Unable to lookup USD price for ${costCurrency} -> ${currency} transaction \n ${currTrx}`);
	}
	return usdTotal;
};

const calculateGains = (allTrans, mode, previous) => {
	const sorter = sorters[mode] || sorters['FIFO'];
	allTrans.sort((a, b) => { return a.date - b.date });

	const startingBank = previous || {
		interest: 0,
		interestInfo: {},
		cashback: 0,
		currencies: {},
		trx: [],
		closed: [],
		missing: {},
		gains: 0,
		longGains: 0,
		longBasis: 0,
		longProceeds: 0,
		shortBasis: 0,
		shortProceeds: 0,
		fees: {}
	};

	const finalBank = allTrans.reduce((bank, currTrx) => {
		const currency = currTrx['currency'];
		if (!bank.currencies[currency] && currency != 'USD') {
			bank.currencies[currency] = {
				balance: 0,
				minBalance: 0,
				basis: []
			};
		}

		/* Interest + cashback */
		if (currTrx['type'] == 'interest' || currTrx['type'] == 'cashback') {
			if (!currTrx['amount-usd']) {
				// Binance Interest that I lost when the closed my acccount
				if (currency == 'BUSD') {
					return bank;
				}
				console.error(`${currTrx['type']} Transaction Missing 'amount-usd'`);
				console.error(currTrx);
				return bank;
			}
			const trxId = bank.trx.length;
			bank.trx.push(currTrx);

			if (currTrx['type'] == 'interest') {
				bank.interest = help.fixDecimal(bank.interest + currTrx['amount-usd']);
				const exchange = currTrx['exchange'];
				if (!bank.interestInfo[exchange]) {
					bank.interestInfo[exchange] = 0;
				}
				bank.interestInfo[exchange] = help.fixDecimal(bank.interestInfo[exchange] + currTrx['amount-usd']);
			}

			const toAdd = {
				'currency': currency,
				'amount': currTrx['amount'],
				'remaining': currTrx['amount'],
				'buy-date': currTrx['date'],
				'buy-currency': 'USD',
				'buy-cost': currTrx['amount-usd'],
				'buy-trx': trxId,
				'buy-usd': currTrx['amount-usd'],
				'buy-usd-remaining': currTrx['amount-usd']
			};
			bank = addBasis(bank, toAdd, sorter);
		}
		else if (currTrx['type'] == 'deposit' || currTrx['type'] == 'withdrawal') {
			if (currTrx['fee']) {
				const feeCurr = currTrx['fee-currency'];
				if (!bank.fees[feeCurr]) {
					bank.fees[feeCurr] = 0;
				}
				bank.fees[feeCurr] = help.fixDecimal(bank.fees[feeCurr] + currTrx['fee']);
			}
		}
		/* Trades */
		else if (currTrx['type'] == 'trade' || currTrx['type'] == 'fee') {
			const trxId = bank.trx.length;
			bank.trx.push(currTrx);
			const costCurrency = currTrx['cost-currency'];

			const feeCurr = currTrx['fee-currency'];
			if (currTrx['type'] == 'trade' && feeCurr != currency && feeCurr != costCurrency) {
				if (!bank.fees[feeCurr]) {
					bank.fees[feeCurr] = 0;
				}
				bank.fees[feeCurr] = help.fixDecimal(bank.fees[feeCurr] + currTrx['fee']);
			}

			let usdValue = 0;
			if (currency == 'USD') {
				usdValue = currTrx['net-amount']
			} else if (costCurrency == 'USD') {
				usdValue = currTrx['net-cost'];
			} else if (currTrx[['amount-usd']]) {
				usdValue = currTrx['amount-usd'];
			} else {
				usdValue = getUSDValue(currTrx);
			}

			// Don't track cost basis for US
			if (costCurrency != 'USD') {
				if (!bank.currencies[costCurrency]) {
					bank.currencies[costCurrency] = {
						balance: 0,
						minBalance: 0,
						basis: []
					}
				}

				const toRemove = {
					'currency': costCurrency,
					'amount': currTrx['net-cost'],
					'remaining': currTrx['net-cost'],
					'sell-date': currTrx['date'],
					'sell-currency': currency,
					'sell-amount': currTrx['net-amount'],
					'sell-trx': trxId,
					'sell-usd': usdValue,
					'sell-usd-remaining': usdValue
				};
				bank = removeBasis(bank, toRemove);
			}

			if (currency != 'USD' && currTrx['type'] != 'fee') {
				// Add new currency to basis
				const toAdd = {
					'currency': currency,
					'amount': currTrx['net-amount'],
					'remaining': currTrx['net-amount'],
					'buy-date': currTrx['date'],
					'buy-currency': costCurrency,
					'buy-cost': currTrx['net-cost'],
					'buy-trx': trxId,
					'buy-usd': usdValue,
					'buy-usd-remaining': usdValue
				};
				bank = addBasis(bank, toAdd, sorter);
			}
		}

		return bank;
	}, startingBank);

	return finalBank;
};

module.exports = {
	calculateGains: calculateGains,
	printBank: printBank
};
