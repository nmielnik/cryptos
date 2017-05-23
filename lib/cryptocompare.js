global.fetch = require('node-fetch')

const cc = require('cryptocompare')

module.exports = {
	index: function(){
		return cc.histoMinute('BTC', 'USD');
	}
}
