const Promise = require('bluebird');
const csv = require('csv-parser');
const fs = require('fs');

module.exports = {
	convertCSV: (fileName, converter, processor) => {
		const results = [];
		const stats = {
			file: fileName,
			totalRows: 0,
			skipped: 0,
			parsed: 0
		};
		return new Promise((resolve, reject) => {
			try {
				fs.createReadStream(fileName)
				  .pipe(csv())
				  .on('data', (data) => {
				  	stats.totalRows++;
				  	const parsed = converter(data);
				  	if (parsed) {
				  		results.push(parsed);
				  		stats.parsed++;
				  	} else {
				  		stats.skipped++;
				  	}
				  })
				  .on('end', () => {
				  	const toRet = { results, stats };
				  	if (processor) {
				  		toRet.results = processor(toRet.results);
				  	}
				  	resolve(toRet);
				  });
			} catch (err) {
				return reject(err);
			}
		});
	}
}
