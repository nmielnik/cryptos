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

### 3) Get your poloniex API Key and Secret
You need to get your api-key & api-secret from poloniex:

1. Retrieve or generate your [poloniex api keys](https://poloniex.com/apiKeys)
2. Make sure your current IP is in the list of allowed IPs

### 4) Create api-key.js
In your root directory, create a file called `api-key.js`.

Put this as the contents of the file:
```js
module.exports = {
    api_key: "<Paste your API Key Here>",
    api_secret: "<Paste your API Secret Here>"
};
```

Save the file. (It's in the .gitignore, so you shouldn't accidently check it in).

### 5) Run the query script to make sure everything works

```bash
node query.js
```

It should dump out something assuming you got everything configured right
