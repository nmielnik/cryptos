# cryptos
Assorted scripts and helpers for researching/analyzing crypto currencies

## Getting started with crypto scripts

### 1) Pull Down The Repo
```bash
git clone git@github.com:nmielnik/cryptos.git
```

### 2) Install Dependencies
```bash
npm install
```

### 3) Get api key and secrets for Poloniex or other exchanges you want to access via this script
You need to get your api-key & api-secret from poloniex:

1. Retrieve or generate your [poloniex api keys](https://poloniex.com/apiKeys) or keys from other exchanges.
2. Make sure your current IP is in the list of allowed IPs (Poloniex and other exchanges enforce this IP whitelisting)

### 4) Create api-key.js
In your root directory, create a file called `api-key.js`.

Put this as the contents of the file:
```js
module.exports = {
	'poloniex': {
		api_key: "<Paste your API Key Here>",
		api_secret: "<Paste your API Secret Here>"
	},

	'cryptopia': {
		api_key: "<Paste your API Key Here>",
		api_secret: "<Paste your API Secret Here>"
	},

	'bitfinex': {
		api_key: "<Paste your API Key Here>",
		api_secret: "<Paste your API Secret Here>"
	},

	'coinbase': {
		api_key: "<Paste your API Key Here>",
		api_secret: "<Paste your API Secret Here>"
	},

	'bittrex': {
		api_key: "<Paste your API Key Here>",
		api_secret: "<Paste your API Secret Here>"
	},

	'bitstamp': {
		client_id: "<Paste your Client ID Here>",
		api_key: "<Paste your API Key Here>",
		api_secret: "<Paste your API Secret Here>"
	},

	'gdax': {
		api_key: "<Paste your API Key Here>",
		api_secret: "<Paste your API Secret Here>",
		pass_phrase: "<Paste your Pass Phrase Here>"
	}
};
```

Save the file. (It's in the .gitignore, so you shouldn't accidently check it in).

### 5) Run the query script to make sure everything works

```bash
node query.js
```

It should dump out something assuming you got everything configured right
