'use strict';

const Promise = require('bluebird');
const mongodb = require('mongodb');

const cryptosDbHost = process.env.CRYPTOS_DB_HOST || 'localhost';
const cryptosDbPort = process.env.CRYPTOS_DB_PORT || '27017';
const cryptosDbUrl = `${cryptosDbHost}:${cryptosDbPort}/cryptos`;

const MongoClient = Promise.promisifyAll(mongodb).MongoClient;
const Collection = mongodb.Collection;
Promise.promisifyAll(Collection.prototype);
Promise.promisifyAll(MongoClient);

module.exports = {
	connect: function () {
		return MongoClient.connectAsync(`mongodb://${cryptosDbUrl}`);
	},
	CRYPTOS_URL: cryptosDbUrl
};
