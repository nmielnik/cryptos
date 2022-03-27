const gainsCalc = require('../lib/gains-calculator');
const calculateGains = gainsCalc.calculateGains;
const sampleTrans = require('./resources/testTrans');

const assert = require('chai').assert;
const expect = require('expect.js');

describe('calculateGains', function () {
  it('should properly detect FIFO capital gains for simple BTC transactions', function () {
  	const bank = calculateGains(sampleTrans.simpleBasisTrx, 'FIFO');
  	expect(bank.gains).to.eql(34700);
  	expect(bank.closed).to.have.length(3);
  	expect(bank.currencies).to.have.key('BTC');
  	expect(bank.currencies['BTC'].basis).to.have.length(2);
  	expect(bank.currencies['BTC'].basis[0].remaining).to.eql(0);
  	expect(bank.currencies['BTC'].basis[1].remaining).to.eql(50000000);
  	expect(bank.currencies['BTC'].avgBasis).to.eql(0.0004);
  });

  it('shouild properly detect FILO capital gains for simple BTC transactions', function () {
  	const bank = calculateGains(sampleTrans.simpleBasisTrx, 'FILO');
  	expect(bank.gains).to.eql(19700);
  	expect(bank.closed).to.have.length(4);
  	expect(bank.currencies).to.have.key('BTC');
  	expect(bank.currencies['BTC'].basis).to.have.length(2);
  	expect(bank.currencies['BTC'].basis[0].remaining).to.eql(0);
  	expect(bank.currencies['BTC'].basis[1].remaining).to.eql(50000000);
  	expect(bank.currencies['BTC'].avgBasis).to.eql(0.0001);
  });

  it('shouild properly detect HIFO capital gains for simpel BTC transactions', function () {
  	const bank = calculateGains(sampleTrans.simpleBasisTrx, 'HIFO');
  	expect(bank.gains).to.eql(19700);
  	expect(bank.closed).to.have.length(4);
  	expect(bank.currencies).to.have.key('BTC');
  	expect(bank.currencies['BTC'].basis).to.have.length(2);
  	expect(bank.currencies['BTC'].basis[0].remaining).to.eql(0);
  	expect(bank.currencies['BTC'].basis[1].remaining).to.eql(50000000);
  	expect(bank.currencies['BTC'].avgBasis).to.eql(0.0001);
  });

  it('should properly deal with overwithdrawals', function () {
  	const combinedTrans = sampleTrans.simpleBasisTrx.concat(sampleTrans.overwithdrawalSimple);
  	const bankFIFO = calculateGains(combinedTrans, 'FIFO');
  	expect(bankFIFO.gains).to.eql(32200);
  	expect(bankFIFO.closed).to.have.length(4);
  	expect(bankFIFO.currencies).to.have.key('BTC');
  	expect(bankFIFO.currencies['BTC'].basis).to.have.length(2);
  	expect(bankFIFO.currencies['BTC'].basis[0].remaining).to.eql(0);
  	expect(bankFIFO.currencies['BTC'].basis[1].remaining).to.eql(0);
  	expect(bankFIFO.currencies['BTC'].avgBasis).to.eql(0);

  	expect(bankFIFO.missing).to.have.key('BTC');
  	expect(bankFIFO.missing['BTC'].total).to.eql(50000000);
  	expect(bankFIFO.missing['BTC'].sales).to.have.length(1);
  	expect(bankFIFO.missing['BTC'].avgBasis).to.eql(0.00035);

  	const bankFILO = calculateGains(combinedTrans, 'FILO');
  	expect(bankFILO.closed).to.have.length(5);
  	expect(bankFILO.missing).to.have.key('BTC');
  	expect(bankFILO.missing['BTC'].total).to.eql(50000000);
  	expect(bankFILO.missing['BTC'].sales).to.have.length(1);
  	expect(bankFILO.missing['BTC'].avgBasis).to.eql(0.00035);

  	const bankHIFO = calculateGains(combinedTrans, 'HIFO');
  	expect(bankHIFO.closed).to.have.length(5);
  	expect(bankHIFO.missing).to.have.key('BTC');
  	expect(bankHIFO.missing['BTC'].total).to.eql(50000000);
  	expect(bankHIFO.missing['BTC'].sales).to.have.length(1);
  	expect(bankHIFO.missing['BTC'].avgBasis).to.eql(0.00035);
  });

  it('should properly detect FIFO capital gains for mixed transctions', function () {
  	const bank = calculateGains(sampleTrans.trx, 'FIFO');
  	expect(bank.gains).to.eql(5480.5886700962);
  	expect(bank.missing).to.be.empty;
  	expect(bank.trx).to.have.length(17);
  	expect(bank.closed).to.have.length(5);
  });

  it('should properly detect FILO capital gains for mixed transctions', function () {
  	const bank = calculateGains(sampleTrans.trx, 'FILO');
  	expect(bank.gains).to.eql(5378.776881321529);
  	expect(bank.missing).to.be.empty;
  	expect(bank.trx).to.have.length(17);
  	expect(bank.closed).to.have.length(6);
  });

  it('should properly detect HIFO capital gains for mixed transctions', function () {
  	const bank = calculateGains(sampleTrans.trx, 'HIFO');
  	expect(bank.gains).to.eql(5370.525016630218);
  	expect(bank.missing).to.be.empty;
  	expect(bank.trx).to.have.length(17);
  	expect(bank.closed).to.have.length(5);
  });

  it('should extract interest as separate income', function () {
  	const bank = calculateGains(sampleTrans.trx, 'FIFO');
  	expect(bank.interest).to.eql(733.75);
  });

  it('should calculate interest, balance, and average basis correctly when there are many interest + cashback payments in various currencies', function () {
  	const bank = calculateGains(sampleTrans.interestBasis, 'FIFO');
  	expect(parseFloat(bank.interest.toFixed(5))).to.eql(10710.6015);
  	expect(bank.missing).to.be.empty;
  	expect(bank.currencies).to.have.key('BTC');
  	expect(bank.currencies['BTC'].balance).to.eql(7774110);
  	expect(parseFloat(bank.currencies['BTC'].avgBasis.toFixed(9))).to.eql(0.000471667);
  	expect(bank.currencies).to.have.key('ETH');
  	expect(parseFloat(bank.currencies['ETH'].balance.toFixed(5))).to.eql(1.78601);
  	expect(parseFloat(bank.currencies['ETH'].avgBasis.toFixed(6))).to.eql(3943.879231);
  	expect(bank.currencies).to.have.key('CRO');
  	expect(parseFloat(bank.currencies['CRO'].balance.toFixed(7))).to.eql(442.5313157);
  	expect(parseFloat(bank.currencies['CRO'].avgBasis.toFixed(6))).to.eql(0.577993);
  });

  it('should calculate FIFO gains and cost basis correctly when there are interest + cashback payments, and sales in various currencies', function () {
  	const combinedTrans = sampleTrans.interestBasis.concat(sampleTrans.interestTrades);
  	const bank = calculateGains(combinedTrans, 'FIFO');
  	expect(bank.missing).to.be.empty;
  	expect(parseFloat(bank.interest.toFixed(5))).to.eql(10710.6015);
  	expect(parseFloat(bank.gains.toFixed(5))).to.eql(123.23864);
  	expect(bank.closed).to.have.length(18);
  	expect(bank.currencies).to.have.key('BTC');
  	expect(bank.currencies['BTC'].balance).to.eql(7774110);
  	expect(parseFloat(bank.currencies['BTC'].avgBasis.toFixed(9))).to.eql(0.000478206);
  	expect(bank.currencies).to.have.key('ETH');
  	expect(parseFloat(bank.currencies['ETH'].balance.toFixed(5))).to.eql(1.78601);
  	expect(parseFloat(bank.currencies['ETH'].avgBasis.toFixed(1))).to.eql(3500);
  	expect(bank.currencies).to.have.key('CRO');
  	expect(parseFloat(bank.currencies['CRO'].balance.toFixed(7))).to.eql(442.5313157);
  	expect(parseFloat(bank.currencies['CRO'].avgBasis.toFixed(5))).to.eql(0.61414);
  });

  it('should calculate FILO gains and cost basis correctly when there are interest + cashback payments, and sales in various currencies', function () {
  	const combinedTrans = sampleTrans.interestBasis.concat(sampleTrans.interestTrades);
  	const bank = calculateGains(combinedTrans, 'FILO');
  	expect(bank.missing).to.be.empty;
  	expect(parseFloat(bank.interest.toFixed(5))).to.eql(10710.6015);
  	expect(parseFloat(bank.gains.toFixed(6))).to.eql(1673.652918);
  	expect(bank.closed).to.have.length(9);
  	expect(bank.currencies).to.have.key('BTC');
  	expect(bank.currencies['BTC'].balance).to.eql(7774110);
  	expect(parseFloat(bank.currencies['BTC'].avgBasis.toFixed(9))).to.eql(0.000573276);
  	expect(bank.currencies).to.have.key('ETH');
  	expect(parseFloat(bank.currencies['ETH'].balance.toFixed(5))).to.eql(1.78601);
  	expect(parseFloat(bank.currencies['ETH'].avgBasis.toFixed(6))).to.eql(3941.95208);
  	expect(bank.currencies).to.have.key('CRO');
  	expect(parseFloat(bank.currencies['CRO'].balance.toFixed(7))).to.eql(442.5313157);
  	expect(parseFloat(bank.currencies['CRO'].avgBasis.toFixed(6))).to.eql(0.663853);
  });

  it('should calculate HIFO gains and cost basis correctly when there are interest + cashback payments, and sales in various currencies', function () {
  	const combinedTrans = sampleTrans.interestBasis.concat(sampleTrans.interestTrades);
  	const bank = calculateGains(combinedTrans, 'HIFO');
  	expect(bank.missing).to.be.empty;
  	expect(parseFloat(bank.interest.toFixed(5))).to.eql(10710.6015);
  	expect(parseFloat(bank.gains.toFixed(5))).to.eql(56.40494);
  	expect(bank.closed).to.have.length(8);
  	expect(bank.currencies).to.have.key('BTC');
  	expect(bank.currencies['BTC'].balance).to.eql(7774110);
  	expect(parseFloat(bank.currencies['BTC'].avgBasis.toFixed(9))).to.eql(0.000471667);
  	expect(bank.currencies).to.have.key('ETH');
  	expect(parseFloat(bank.currencies['ETH'].balance.toFixed(5))).to.eql(1.78601);
  	expect(parseFloat(bank.currencies['ETH'].avgBasis.toFixed(1))).to.eql(3500);
  	expect(bank.currencies).to.have.key('CRO');
  	expect(parseFloat(bank.currencies['CRO'].balance.toFixed(7))).to.eql(442.5313157);
  	expect(parseFloat(bank.currencies['CRO'].avgBasis.toFixed(6))).to.eql(0.577993);
  });
});
