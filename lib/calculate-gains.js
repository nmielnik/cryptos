const csvMerge = require('./csv-merge');
const gainsCalc = require('./gains-calculator');
const calculateGains = gainsCalc.calculateGains;

const loopThroughGainsCalculations = (allTrans) => {

	const validDates = [];
	let prevDate = new Date('2020-01-01T00:00:00.001Z');
	const endDate = new Date('2021-01-01T00:00:00.001Z');
	const oneDay = 24 * 60 * 60 * 1000;
	while (prevDate < endDate) {
		console.log(prevDate);
		const tempTrans = allTrans.filter((trx) => {
			return ((trx.exchange == 'gemini' || trx.exchange == 'binance') && trx.date >= prevDate && trx.date < endDate);
		});
		const tempBank = calculateGains(tempTrans, 'FIFO');
		if (!tempBank.missing['BTC'] && !tempBank.missing['ETH'] &&
			tempBank.currencies['BTC'] && tempBank.currencies['BTC'].balance > 0.75 &&
			tempBank.currencies['ETH'] && tempBank.currencies['ETH'].balance > 10) {
			validDates.push(new Date(prevDate.getTime()));
		}
		prevDate = new Date(prevDate.getTime() + oneDay);
	}
	console.log(`Found ${validDates.length} valid dates`);
	validDates.forEach((x) => {
		console.log(x);
	});
};

const getCostBasisBank = (previousTrans, mode) => {
	const basisBank = calculateGains(previousTrans, mode);

	//gainsCalc.printBank(basisBank);

	return resetBankGainsValues(basisBank);
};

const resetBankGainsValues = (basisBank) => {
	basisBank.gains = 0;
	basisBank.shortBasis = 0;
	basisBank.longBasis = 0;
	basisBank.longGains = 0;
	basisBank.longProceeds = 0;
	basisBank.shortProceeds = 0;
	basisBank.interest = 0;
	basisBank.interestInfo = {};
	basisBank.closed = [];

	return basisBank;
}

const do2021CapitalGainsCalculation = () => {
	csvMerge.get2021GainsTransactions()
	.then((allTrans) => {

		console.log(`Parsed ${allTrans.length} Total Transactions`);

		/*
			loopThroughGainsCalculations(allTrans);
			process.exit();
		*/

		const taxYear = 2021;
		const range = {
			start: new Date(`${taxYear}-01-01T00:00:00.001Z`),
			end: new Date(`${taxYear}-12-31T23:59:59.999Z`)
		};

		const previousRange = {
			start: new Date('2020-03-23T00:00:00.01Z'),
			end: range.start
		};
		const previousTrans = allTrans.filter((trx) => {
			// return ((trx.exchange == 'gemini' || trx.exchange == 'cryptocom') && trx.date >= previousRange.start && trx.date < previousRange.end);
			return trx.date >= previousRange.start && trx.date < previousRange.end;
		});

		console.log(`Separating ${previousTrans.length} transactions for cost basis`);
		const basisBank = getCostBasisBank(previousTrans, 'FIFO');

		const taxEvents = allTrans.filter((trx) => {
			return (trx.date >= range.start && trx.date < range.end);
		});

		console.log(`Evaluating cost basis for ${taxEvents.length} tax events in ${taxYear}`);

		const bank = calculateGains(taxEvents, 'HIFO', basisBank);
		gainsCalc.printBank(bank);
	});
};

const doCapitalGainsCalculation = (taxYear) => {

	csvMerge.getGainsTransactions(taxYear)
	.then((allTrans) => {

		console.log(`Parsed ${allTrans.length} Total Transactions`);

		const range = {
			start: new Date(`${taxYear}-01-01T00:00:00.001Z`),
			end: new Date(`${taxYear}-12-31T23:59:59.999Z`)
		};

		// Using 3/23/20 as cost basis, as that avoids all BTC + ETH cost basis issues
		const basisRange = {
			start: new Date(`2020-03-23T00:00:00.001Z`),
			end: range.start
		};

		const transBasis = allTrans.filter((trx) => {
			return trx.date >= basisRange.start && trx.date < basisRange.end;
		});

		console.log(`Separating ${transBasis.length} transactions for cost basis`);
		const basisBank = getCostBasisBank(transBasis, 'HIFO');

		const taxEvents = allTrans.filter((trx) => {
			return (trx.date >= range.start && trx.date < range.end);
		});

		console.log(`Evaluating cost basis for ${taxEvents.length} tax events in ${taxYear}`);

		calculateGains.debugMissing = true;
		const bank = calculateGains(taxEvents, 'HIFO', basisBank);
		gainsCalc.printBank(bank);
	});
}


//do2021CapitalGainsCalculation();
//doCapitalGainsCalculation(2022);
//doCapitalGainsCalculation(2023);
doCapitalGainsCalculation(2024);
