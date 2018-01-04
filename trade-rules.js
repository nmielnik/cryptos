module.exports = {
	totalInvestmentSize: 0.1, // Total amount in BTC to diversify
	maxCoins: 12, // maximum number of coins to hodl at any given moment
	targetGrowth: 5, // target growth in % to trigger a sell for a given coin
	thresholdPct: 10, // growth threshold in % required to trigger a buy for a given coin
	minThresholdMins: 1, // min growth period in minutes require to trigger a buy for a given coin
	maxThresholdMins: 20, // max growth period in minutes require to trigger a buy for a given coin
	cooldown: 720, // 12hr; measured in number of periods
	period: 60, // length of a trading period in seconds
};
