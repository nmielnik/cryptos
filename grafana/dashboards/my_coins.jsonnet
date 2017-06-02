local CoinsDashboard = import './templates/coins_dashboard_template.jsonnet';
local allCoins = import './../../lib/my_coins.json';

CoinsDashboard(coins = allCoins, title = 'MY COINS')