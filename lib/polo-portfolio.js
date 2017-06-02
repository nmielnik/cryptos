const Promise = require('bluebird');
const moment = require('moment');
const parseNum = require('parse-decimal-number');
const Poloniex = require('poloniex.js');
const keys = require('../api-key');

Promise.promisifyAll(Poloniex.prototype, {
	filter: (name, func, target, passesDefaultFilter) => {
		return passesDefaultFilter || name == '_private';
	}
});

const dateLimit = new Date(2017,3,1,0,0,0,0);
const coins = {};

const poloniex = new Poloniex(keys.api_key, keys.api_secret);

const parameters = {
	currencyPair: 'all',
	start: Math.floor(dateLimit.getTime() / 1000),
	end: Math.floor(new Date().getTime() / 1000)
};

return Promise.all([
		poloniex._privateAsync('returnDepositsWithdrawals', parameters),
		poloniex._privateAsync('returnTradeHistory', parameters),
		poloniex.returnTickerAsync()
	])
	.then((results) => {
		const widthdrawls = results[0].withdrawals;
		const deposits = results[0].deposits;
		const trades = results[1];
		const tickers = results[2];

		/* Widthdrawls
		{ withdrawalNumber: 4297927,
	       currency: 'BTC',
	       address: '1HQuKJDgcR9B6Nd6LWj9ASGyfey3PMpnUZ',
	       amount: '0.12263813',
	       fee: '0.00010000',
	       timestamp: 1496112390,
	       status: 'COMPLETE: 558f2b697869e2402eb5e8ecfc13d3a650ceda1226455f86d728422d3ac6f92b',
	       ipAddress: '108.48.90.118'
	    }
		*/

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

		Object.keys(trades).forEach((mkt) => {
			const coin = mkt.split('_')[1];
			coins[coin] = {
				coin: coin,
				trans: []
			};
			trades[mkt].forEach((data) => {
				const tran = {
					coin: coin,
					date: moment(data['date']).toDate(),
					buy: data['type'] === 'buy',
					price: parseNum(data['rate']),
					amount: parseNum(data['amount']),
					netAmount: parseNum(data['amount']),
					total: parseNum(data['total']),
					netTotal: parseNum(data['total'])
				};
				if (tran.buy) {
					tran.netAmount = tran.amount * (1 - parseNum(data['fee']));
				} else {
					tran.total = tran.netTotal / (1 - parseNum(data['fee']));
				}
				coins[coin].trans.push(tran);
			});
		});

		const coinHistory = [];
		const portfolio = [];

		Object.keys(coins).forEach((coin, idx) => {
			if (['XRP', 'DASH', 'LTC', 'ZEC', 'ETH', 'ETC', 'BTC', 'XMR'].indexOf(coin) !== -1) {
				return;
			}
			const trans = coins[coin].trans;
			trans.sort((x, y) => {
				return x.date.getTime() - y.date.getTime();
			});
			let coinHeld = 0;
			let netCost = 0;
			let coinSold = 0;
			let netRev = 0;
			let allProfit = 0;
			let allCost = 0;
			let allCoins = 0;
			trans.forEach((next) => {
				if (next.buy) {
					coinHeld += next.netAmount;
					netCost += next.netTotal;
				} else {
					coinSold += next.netAmount;
					netRev += next.netTotal;
				}
				let diff = coinHeld - coinSold;
				if (diff <= 0.001 || ((coin === 'VIA' || coin === 'FLO') && diff < 0.21)) {
					const profit = netRev - netCost;
					allProfit += profit;
					allCost += netCost;
					allCoins += coinHeld;
					coinHeld = netCost = coinSold = netRev = 0;
				}
			})
			const profitPct = (allProfit / allCost) * 100;
			coins[coin].profit = allProfit;
			coins[coin].profitPct = profitPct;
			coins[coin].invested = allCost;
			coinHistory.push({
				coin: coin,
				profit: allProfit,
				profitPct: profitPct,
				cost: allCost
			});
			if (coinHeld !== 0) {
				const holding = coinHeld - coinSold;
				const spent = netCost - netRev;
				const basisRate = spent / holding;
				const mktRate = parseNum(tickers[`BTC_${coin}`].last);
				const currVal = mktRate * holding;
				const profit = currVal - spent;
				const profitPct = ((mktRate - basisRate) / basisRate) * 100;
				portfolio.push({
					coin: coin,
					amount: holding,
					basisRate: basisRate,
					mktRate: mktRate,
					cost: spent,
					value: currVal,
					profit: profit,
					profitPct: profitPct
				});
			}
		});
		portfolio.sort((x, y) => {
			return y.profitPct - x.profitPct;
		});
		console.log('Coin,ProfitPct,Profit,Value,Basis,Rate,BasisRate');
		portfolio.forEach((summary) => {
			console.log(`${summary.coin},${summary.profitPct},${summary.profit},${summary.value},${summary.cost},${summary.mktRate},${summary.basisRate}`);
		});

		return {};
	});

// Support for doing a similar analysis via the poloniex csv file
/*
const fs = require('fs');
const csv = require('csv-parser');
fs.createReadStream('./local/tradeHistory.csv')
	.pipe(csv())
	.on('data', (data) => {
		const coin = data['Market'].split('/')[0];
		const tran = {
			coin: coin,
			date: moment(data['Date']).toDate(),
			buy: data['Type'] !== 'Sell',
			price: Math.abs(parseNum(data['Price'])),
			amount: Math.abs(parseNum(data['Amount'])),
			total: Math.abs(parseNum(data['Total'])),
			netTotal: Math.abs(parseNum(data['Base Total Less Fee'])),
			netAmount: Math.abs(parseNum(data['Quote Total Less Fee']))
		};
		if (tran.date.getTime() > dateLimit) {
			if (!coins[coin]) {
				coins[coin] = {
					coin: coin,
					trans: []
				};
			}
			coins[coin].trans.push(tran);
		}
	})
	.on('end', () => {
		console.log(`Done with ${Object.keys(coins).length} coins`);
		const coinHistory = [];
		const portfolio = [];

		Object.keys(coins).forEach((coin, idx) => {
			if (['XRP', 'LTC', 'ZEC', 'ETH', 'ETC', 'BTC', 'XMR'].indexOf(coin) !== -1) {
				return;
			}
			const trans = coins[coin].trans;
			trans.reverse();
			let coinHeld = 0;
			let netCost = 0;
			let coinSold = 0;
			let netRev = 0;
			let allProfit = 0;
			let allCost = 0;
			let allCoins = 0;
			trans.forEach((next) => {
				if (next.buy) {
					coinHeld += next.netAmount;
					netCost += next.netTotal;
				} else {
					coinSold += next.netAmount;
					netRev += next.netTotal;
				}
				let diff = coinHeld - coinSold;
				if (coinHeld > 0 && diff <= 0.000001) {
					const profit = netRev - netCost;
					allProfit += profit;
					allCost += netCost;
					allCoins += coinHeld;
					coinHeld = netCost = coinSold = netRev = 0;
				}
			})
			const profitPct = (allProfit / allCost) * 100;
			coins[coin].profit = allProfit;
			coins[coin].profitPct = profitPct;
			coins[coin].invested = allCost;
			coinHistory.push({
				coin: coin,
				profit: allProfit,
				profitPct: profitPct,
				cost: allCost
			});
			if (coinHeld !== 0) {
				const rate = netCost / coinHeld;
				portfolio.push({
					coin: coin,
					amount: coinHeld,
					basis: rate,
					total: netCost
				});
			}
		});
		portfolio.sort((x, y) => {
			return y.total - x.total;
		});
		console.log(portfolio);
	})
*/
