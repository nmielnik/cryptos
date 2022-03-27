const Promise = require('bluebird');
const csv = require('csv-parser');
const fs = require('fs');

module.exports = {
	convertCSV: (fileName, converter, processor) => {
		const results = [];
		return new Promise((resolve, reject) => {
			try {
				fs.createReadStream(fileName)
				  .pipe(csv())
				  .on('data', (data) => {
				  	const parsed = converter(data);
				  	if (parsed)
				  		results.push(parsed);
				  })
				  .on('end', () => {
				  	if (processor) {
				  		resolve(processor(results));
				  	} else {
				  		resolve(results);
				  	}
				  });
			} catch (err) {
				return reject(err);
			}
		});
	}
}
