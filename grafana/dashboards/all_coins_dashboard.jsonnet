local CoinsDashboard = import './templates/coins_dashboard_template.jsonnet';
#local allCoins = import './../../lib/all-coins.json';
local allCoins = import './../../lib/top100coins.json';
#	local allCoins = import './../../lib/top100-200coins.json';

CoinsDashboard(coins = allCoins, title = 'ALL COINS')