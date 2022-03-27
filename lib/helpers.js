const parseNum = require('parse-decimal-number');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));

const SATS_PER_BTC = 100000000;

const fixDecimal = (num) => {
	return parseFloat(num.toFixed(12));
};

const btcToSats = (num) => {
	return Math.round(num * SATS_PER_BTC);
};

const satsToBTC = (num) => {
	return fixDecimal(num / SATS_PER_BTC);
};

const currStrToNum = (str) => {
	return parseNum(str.replace('$', ''));
};

const strToSatsNum = (str) => {
	return btcToSats(parseNum(str));
};

const parseAmount = (amount, currency) => {
	if (currency == 'USD') {
		return currStrToNum(amount);
	} else if (currency == 'BTC') {
		return strToSatsNum(amount);
	}
	return parseNum(amount);
};

const saveToFile = (history, fileName) => {
	const fileStr = JSON.stringify(history, null, 2);
	return fs.writeFileAsync(fileName, fileStr, 'utf8');
};

module.exports = {
	SATS_PER_BTC: SATS_PER_BTC,
	fixDecimal: fixDecimal,
	btcToSats: btcToSats,
	satsToBTC: satsToBTC,
	currStrToNum: currStrToNum,
	strToSatsNum: strToSatsNum,
	parseAmount: parseAmount,
	saveToFile: saveToFile
};
