const moment = require('moment');
const rp = require('request-promise');
const crypto = require('crypto');

class Cryptopia {
	constructor(api_key, api_secret) {
		this.api_key = api_key;
		this.api_secret = api_secret;
		this.baseUrl = 'https://www.cryptopia.co.nz/Api';
		this.nonceCache = [];

		this.request = rp.defaults({
			agent: false,
			headers: {
				"User-Agent": "Mozilla/4.0 (compatible; SIGBOT Cryptopia API)",
				"Content-Type": "application/json; charset=utf-8"
			},
			json: true
		});
	}

	getNonce() {
		let nextNonce = moment().unix();
		while (this.nonceCache.indexOf(nextNonce) !== -1) {
			nextNonce++;
		}
		this.nonceCache.push(nextNonce);
		return nextNonce;
	}

	// https://www.cryptopia.co.nz/Forum/Thread/262
	getAuthorizationHeader(params, url) {
		const paramStr = JSON.stringify(params);
		const encodedURL = encodeURIComponent(url).toLowerCase();
		const nonce = this.getNonce();

		const reqHashB64 = crypto.createHash('md5').update(paramStr).digest().toString('base64');
		const sig = `${this.api_key}POST${encodedURL}${nonce}${reqHashB64}`;
		const hmacSig = crypto.createHmac('sha256', new Buffer(this.api_secret, 'base64')).update(sig).digest().toString('base64');

		return `amx ${this.api_key}:${hmacSig}:${nonce}`;
	}

	privateRequest(path, params) {
		const url = `${this.baseUrl}/${path}`;
		params = params || {};

		return this.request({
			method: 'POST',
			url: url,
			body: params,
			json: true,
			headers: {
				'Authorization': this.getAuthorizationHeader(params, url)
			}
		})
		.then(res => {
			if (!res['Success']) {
				console.error(res);
				throw new Error(res['Error']);
			}
			return res['Data'];
		})
	}

	getMarkets() {
		return this.request(`${this.baseUrl}/GetMarkets`);
	}

	getCurrencies() {
		return this.request(`${this.baseUrl}/GetCurrencies`);
	}

	getBalance() {
		return this.privateRequest('GetBalance', {});
	}

	getTradeHistory() {
		return this.privateRequest('GetTradeHistory', {
			Count: '1000'
		});
	}

	getWithdrawals() {
		return this.privateRequest('GetTransactions', {
			Type: 'Withdraw',
			Count: '1000'
		});
	}

	getDeposits() {
		return this.privateRequest('GetTransactions', {
			Type: 'Deposit',
			Count: '1000'
		});
	}
}

module.exports = Cryptopia;
