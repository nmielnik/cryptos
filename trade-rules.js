module.exports = {
	totalInvestmentSize: 0.02, // Total amount in BTC to diversify
	maxCoins: 10, // maximum number of coins to hodl at any given moment
	targetGrowth: 1.5, // target growth in % to trigger a sell for a given coin
	thresholdPct: 10, // growth threshold in % required to trigger a buy for a given coin
	thresholdMins: 15, // growth period in minutes require to trigger a buy for a given coin
	cooldown: 360, // 12hr; measured in number of periods
	period: 120, // length of a trading period in seconds
};
