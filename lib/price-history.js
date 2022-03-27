const usdCurrencies = ['BTC', 'ETH', 'BNB'];
const usdCurrencyMap = {};

const priceHistory = {};

usdCurrencies.forEach((curr) => {
	usdCurrencyMap[curr] = true;
	const key = `${curr}-USD`;
	priceHistory[key] = {};

	const jsonData = require(`./prices/${curr.toLowerCase()}usd-history.json`);
	jsonData.forEach((hourData) => {
		priceHistory[key][hourData.time] = hourData.price;
	});
});

const getUSDPrice = (currency, time) => {
	const pair = `${currency}-USD`;
	if (!priceHistory[pair]) {
		throw new Error(`No Price History for ${pair}`);
	}
	const dtLookup = new Date(+time);
	dtLookup.setMilliseconds(0);
	dtLookup.setSeconds(0);
	dtLookup.setMinutes(0);
	const tsLookup = +dtLookup;
	if (!priceHistory[pair][tsLookup]) {
		throw new Error(`No Price History on ${dtLookup} for ${pair}`);
	}
	return priceHistory[pair][tsLookup];
};

module.exports = {
	getUSDPrice: getUSDPrice,
	usdHistoryCurrencies: usdCurrencyMap
};
