local CoinsDashboard = import './templates/coins_dashboard_template.jsonnet';
local allCoins = import './../../lib/all-coins.json';

CoinsDashboard(coins = allCoins, title = 'ALL COINS')