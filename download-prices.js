global.fetch = require('node-fetch');
const cc = require('cryptocompare');

const help = require('./lib/helpers');

const btcHistoryFile = './lib/prices/btcusd-history.json';
const ethHistoryFile = './lib/prices/ethusd-history.json';
const bnbHistoryFile = './lib/prices/bnbusd-history.json';

const hourLimit = 1344;

const targetHistoryFile = bnbHistoryFile;
const targetCurrency = 'BNB';

const getCoinPrices = (coinName, currency, endDate, existingData, limit, outputFile) => {
	const keys = {};
	existingData.forEach((hourData) => {
		keys[hourData.time] = 1;
	});
	cc.histoHour(coinName, currency, {limit: limit, timestamp: endDate })
		.then((data) => {
			console.log(`Adding ${data.length} new data points`);
			data.forEach((hourData) => {
				const ts = hourData.time * 1000;
				if (!keys[ts]) {
					existingData.push({
						time: ts,
						price: hourData.close
					});
				} else {
					console.log(`Ignoring overlap hour: ${ts}`);
				}
			});
			return help.saveToFile(existingData, outputFile);
			process.exit();
		})
		.then((x) => {
			console.log('File Saved!');
			process.exit();
		})
		.catch((error) => {
			console.error(error);
			process.exit();
		});
};

/* First Time File Creation */
// getCoinPrices(targetCurrency, 'USD', new Date('2020-01-13T00:00:00.000Z'), [], 336, targetHistoryFile);

const targetHistory = require(targetHistoryFile);
targetHistory.sort((a, b) => { return a.time - b.time });

const lastHour = targetHistory[targetHistory.length - 1].time;
const dtLastHour = new Date(lastHour);
const newHour = lastHour + ((hourLimit + 1) * 60 * 60 * 1000);
const dtNewHour = new Date(newHour);

console.log(`Adding history between ${dtLastHour.toUTCString()} and ${dtNewHour.toUTCString()}`);

getCoinPrices(targetCurrency, 'USD', dtNewHour, targetHistory, hourLimit, targetHistoryFile);
