module.exports = {
	simpleBasisTrx:
[
  /* Buy 1 BTC */
  {
    "date": new Date("2021-01-29T16:04:26.976Z"),
    "exchange": "gemini",
    "type": "trade",
    "trade-type": "buy",
    "currency": "BTC",
    "net-amount": 100000000,
    "amount": 100000000,
    "cost-currency": "USD",
    "fee-currency": "USD",
    "fee": 25.00,
    "cost": 9975.00,
    "net-cost": 10000.00
  },
  /* Buy 1 BTC */
  {
    "date": new Date("2021-03-29T16:04:26.976Z"),
    "exchange": "gemini",
    "type": "trade",
    "trade-type": "buy",
    "currency": "BTC",
    "net-amount": 100000000,
    "amount": 100000000,
    "cost-currency": "USD",
    "fee-currency": "USD",
    "fee": 125.00,
    "cost": 39875.00,
    "net-cost": 40000.00
  },
  /* Sell 0.25 BTC */
  {
    "date": new Date("2021-02-29T16:04:26.976Z"),
    "exchange": "gemini",
    "type": "trade",
    "trade-type": "sell",
    "currency": "USD",
    "net-amount": 4975,
    "amount": 5000,
    "cost-currency": "BTC",
    "fee-currency": "USD",
    "fee": 25.00,
    "cost": 25000000,
    "net-cost": 25000000
  },
  /* Sell 0.75 BTC */
  {
    "date": new Date("2021-04-01T16:04:26.976Z"),
    "exchange": "gemini",
    "type": "trade",
    "trade-type": "sell",
    "currency": "USD",
    "net-amount": 44800,
    "amount": 45000,
    "cost-currency": "BTC",
    "fee-currency": "USD",
    "fee": 200.00,
    "cost": 75000000,
    "net-cost": 75000000
  },
  /* Sell 0.5 BTC */
  {
    "date": new Date("2021-04-17T16:04:26.976Z"),
    "exchange": "gemini",
    "type": "trade",
    "trade-type": "sell",
    "currency": "USD",
    "net-amount": 14925,
    "amount": 15000,
    "cost-currency": "BTC",
    "fee-currency": "USD",
    "fee": 75.00,
    "cost": 50000000,
    "net-cost": 50000000
  }
],
	overwithdrawalSimple:
[
  	/* Sell 1 BTC */
  {
    "date": new Date("2021-07-17T16:04:26.976Z"),
    "exchange": "gemini",
    "type": "trade",
    "trade-type": "sell",
    "currency": "USD",
    "net-amount": 35000,
    "amount": 35150,
    "cost-currency": "BTC",
    "fee-currency": "USD",
    "fee": 150,
    "cost": 100000000,
    "net-cost": 100000000
  }
],
	trx:
[
  /* Gemini USD deposits */
  {
    "date": new Date("2021-01-01T16:01:46.990Z"),
    "exchange": "gemini",
    "type": "deposit",
    "currency": "USD",
    "net-amount": 10000,
    "amount": 10000
  },
  {
    "date": new Date("2021-06-01T16:01:46.990Z"),
    "exchange": "gemini",
    "type": "deposit",
    "currency": "USD",
    "net-amount": 5000,
    "amount": 5000
  },
  {
    "date": new Date("2021-12-31T16:01:46.990Z"),
    "exchange": "gemini",
    "type": "deposit",
    "currency": "USD",
    "net-amount": 8000,
    "amount": 8000
  },

  /* Gemini Trade */
  {
    "date": new Date("2021-01-29T16:04:26.976Z"),
    "exchange": "gemini",
    "type": "trade",
    "trade-type": "buy",
    "currency": "BTC",
    "net-amount": 10390074,
    "amount": 10390074,
    "cost-currency": "USD",
    "fee-currency": "USD",
    "fee": 12.46,
    "cost": 4982.56,
    "net-cost": 4995.02,
    "price": 47955.00012800679,
    "rate": 2085.288285539963,
    "net-rate": 2080.086566219955
  },
  {
    "date": new Date("2021-02-02T16:04:26.976Z"),
    "exchange": "gemini",
    "type": "trade",
    "trade-type": "buy",
    "currency": "ETH",
    "net-amount": 2.5,
    "amount": 2.5,
    "cost-currency": "USD",
    "fee-currency": "USD",
    "fee": 12.46,
    "cost": 5000.00,
    "net-cost": 5012.46,
    "price": 2000,
    "rate": 0.0005,
    "net-rate": 0.000498757097313
  },
  {
    "date": new Date("2021-04-04T16:04:26.976Z"),
    "exchange": "gemini",
    "type": "trade",
    "trade-type": "buy",
    "currency": "ETH",
    "net-amount": 1.9,
    "amount": 1.9,
    "cost-currency": "USD",
    "fee-currency": "USD",
    "fee": 25.00,
    "cost": 7600.00,
    "net-cost": 7625.00,
    "price": 4000,
    "rate": 0.00025,
    "net-rate": 0.000249180327869
  },

  /* Kraken Trade */
  {
    "date": new Date("2021-02-24T06:40:07.131Z"),
    "uid": "TOQ56W-XGTJT-B6AKSV",
    "orderId": "OOAHSA-BLQY5-6EXEUY",
    "exchange": "kraken",
    "type": "trade",
    "trade-type": "buy",
    "currency": "MANA",
    "net-amount": 409.7287686,
    "amount": 409.7287686,
    "fee-currency": "BTC",
    "cost-currency": "BTC",
    "fee": 1773,
    "cost": 2955783,
    "price": 0.00007214,
    "net-cost": 2957556,
    "rate": 0.000138619367,
    "net-rate": 0.000138536267
  },

  /* Bittrex Trade */
  {
    "date": new Date("2021-05-10T05:27:15.000Z"),
    "uid": "2046c78a-d509-434f-a690-7d52cf2c147c",
    "exchange": "bittrex",
    "type": "trade",
    "trade-type": "sell",
    "currency": "BTC",
    "amount": 29341464,
    "fee-currency": "BTC",
    "fee": 102695,
    "net-amount": 29238769,
    "cost-currency": "ETH",
    "cost": 4.22787717,
    "net-cost": 4.22787717,
    "price": 0.06939999,
    "rate": 6939999.158017166,
    "net-rate": 6915709.190293246
  },

  /* Cashapp buy */
  {
    "date": new Date("2021-09-13T03:09:34.000Z"),
    "exchange": "cashapp",
    "uid": "hg63tr",
    "type": "trade",
    "trade-type": "buy",
    "currency": "BTC",
    "net-amount": 304559,
    "amount": 304559,
    "cost-currency": "USD",
    "net-cost": 140,
    "cost": 137.19,
    "price": 45045.46,
    "rate": 2219.979590349151,
    "net-rate": 2175.421428571428,
    "fee": 2.81,
    "fee-currency": "USD"
  },

  /* CDC Interest */
  {
    "date": new Date("2021-01-31T01:07:32.000Z"),
    "exchange": "cryptocom",
    "description": "Crypto Earn",
    "type": "interest",
    "currency": "BTC",
    "net-amount": 627670,
    "amount": 627670,
    "amount-usd": 293.50
  },
  {
    "date": new Date("2021-03-31T01:07:32.000Z"),
    "exchange": "cryptocom",
    "description": "Crypto Earn",
    "type": "interest",
    "currency": "BTC",
    "net-amount": 62767,
    "amount": 62767,
    "amount-usd": 29.35
  },
  {
    "date": new Date("2021-05-30T01:07:32.000Z"),
    "exchange": "cryptocom",
    "description": "Crypto Earn",
    "type": "interest",
    "currency": "BTC",
    "net-amount": 627670,
    "amount": 627670,
    "amount-usd": 293.50
  },
  {
    "date": new Date("2021-07-30T01:07:32.000Z"),
    "exchange": "cryptocom",
    "description": "Crypto Earn",
    "type": "interest",
    "currency": "BTC",
    "net-amount": 125534,
    "amount": 125534,
    "amount-usd": 58.70
  },
  {
    "date": new Date("2021-09-30T01:07:32.000Z"),
    "exchange": "cryptocom",
    "description": "Crypto Earn",
    "type": "interest",
    "currency": "BTC",
    "net-amount": 62767,
    "amount": 62767,
    "amount-usd": 29.35
  },
  {
    "date": new Date("2021-11-30T01:07:32.000Z"),
    "exchange": "cryptocom",
    "description": "Crypto Earn",
    "type": "interest",
    "currency": "BTC",
    "net-amount": 62767,
    "amount": 62767,
    "amount-usd": 29.35
  },

  /* Casshback & Rewards */
  {
    "date": new Date("2021-01-29T06:31:43.000Z"),
    "exchange": "cryptocom",
    "description": "CRO Rewards",
    "type": "cashback",
    "currency": "CRO",
    "net-amount": 0.31142246,
    "amount": 0.31142246,
    "amount-usd": 0.18
  },
  {
    "date": new Date("2021-02-29T06:31:43.000Z"),
    "exchange": "cryptocom",
    "description": "CRO Rewards",
    "type": "cashback",
    "currency": "CRO",
    "net-amount": 6.2284492,
    "amount": 6.2284492,
    "amount-usd": 3.60
  },
  {
    "date": new Date("2021-03-29T06:31:43.000Z"),
    "exchange": "cryptocom",
    "description": "CRO Rewards",
    "type": "cashback",
    "currency": "CRO",
    "net-amount": 31.142246,
    "amount": 31.142246,
    "amount-usd": 18
  },

  /* Interest Fees */
  {
    "date": new Date("2021-12-28T02:02:00.000Z"),
    "uid": "b4691d85-e655-4794-9515-0735108d3670",
    "description": "Operation cost",
    "exchange": "celsius",
    "type": "fee",
    "currency": "USD",
    "cost-currency": "ETH",
    "net-amount": 480,
    "amount": 480,
    "net-cost": 0.117315,
    "cost": 0.117315,
    "cost-usd": 480,
    "amount-usd": 480
  },
  {
	"date": new Date("2021-08-11T11:01:00.000Z"),
	"uid": "d573fbed-98ad-47aa-9e76-415ba9ce8603",
	"description": "Loan Interest Payment",
	"exchange": "celsius",
	"type": "fee",
	"currency": "USD",
	"cost-currency": "BTC",
	"net-amount": 13.44,
	"amount": 13.44,
	"cost-usd": 13.44,
	"amount-usd": 13.44,
	"net-cost": 0.000291691987,
	"cost": 0.000291691987
  }
],
  interestBasis:
[
  /* CDC Interest */
  {
    "date": new Date("2021-01-01T01:07:32.000Z"),
    "exchange": "cryptocom",
    "description": "Crypto Earn",
    "type": "interest",
    "currency": "BTC",
    "net-amount": 627670,
    "amount": 627670,
    "amount-usd": 293.50
  },
  {
    "date": new Date("2021-01-08T01:07:32.000Z"),
    "exchange": "cryptocom",
    "description": "Crypto Earn",
    "type": "interest",
    "currency": "BTC",
    "net-amount": 62767,
    "amount": 62767,
    "amount-usd": 29.35
  },
  {
    "date": new Date("2021-01-15T01:07:32.000Z"),
    "exchange": "cryptocom",
    "description": "Crypto Earn",
    "type": "interest",
    "currency": "BTC",
    "net-amount": 627670,
    "amount": 627670,
    "amount-usd": 293.50
  },
  {
    "date": new Date("2021-01-22T01:07:32.000Z"),
    "exchange": "cryptocom",
    "description": "Crypto Earn",
    "type": "interest",
    "currency": "BTC",
    "net-amount": 125534,
    "amount": 125534,
    "amount-usd": 58.70
  },
  {
    "date": new Date("2021-01-25T01:07:32.000Z"),
    "exchange": "cryptocom",
    "description": "Crypto Earn",
    "type": "interest",
    "currency": "BTC",
    "net-amount": 62767,
    "amount": 62767,
    "amount-usd": 29.35
  },
  {
    "date": new Date("2021-02-02T01:07:32.000Z"),
    "exchange": "cryptocom",
    "description": "Crypto Earn",
    "type": "interest",
    "currency": "BTC",
    "net-amount": 62767,
    "amount": 62767,
    "amount-usd": 29.35
  },

  /* CDC Casshback & Rewards */
  {
    "date": new Date("2021-01-29T06:31:43.000Z"),
    "exchange": "cryptocom",
    "description": "CRO Rewards",
    "type": "cashback",
    "currency": "CRO",
    "net-amount": 0.31142246,
    "amount": 0.31142246,
    "amount-usd": 0.18
  },
  {
    "date": new Date("2021-02-02T06:31:43.000Z"),
    "exchange": "cryptocom",
    "description": "CRO Rewards",
    "type": "cashback",
    "currency": "CRO",
    "net-amount": 6.2284492,
    "amount": 6.2284492,
    "amount-usd": 3.60
  },
  {
    "date": new Date("2021-02-03T06:31:43.000Z"),
    "exchange": "cryptocom",
    "description": "CRO Rewards",
    "type": "cashback",
    "currency": "CRO",
    "net-amount": 31.142246,
    "amount": 31.142246,
    "amount-usd": 18
  },
  {
    "date": new Date("2021-02-04T06:31:43.000Z"),
    "exchange": "cryptocom",
    "description": "CRO Rewards",
    "type": "cashback",
    "currency": "CRO",
    "net-amount": 31.142246,
    "amount": 31.142246,
    "amount-usd": 18.00
  },
  {
    "date": new Date("2021-02-05T06:31:43.000Z"),
    "exchange": "cryptocom",
    "description": "CRO Rewards",
    "type": "cashback",
    "currency": "CRO",
    "net-amount": 62.284492,
    "amount": 62.284492,
    "amount-usd": 36.00
  },
  {
    "date": new Date("2021-03-06T06:31:43.000Z"),
    "exchange": "cryptocom",
    "description": "CRO Rewards",
    "type": "cashback",
    "currency": "CRO",
    "net-amount": 311.42246,
    "amount": 311.42246,
    "amount-usd": 180.00
  },

  /* Celsius Interest */
  {
    "date": new Date("2021-01-31T10:00:00.000Z"),
    "uid": "9e557a06-fb62-4425-8c31-247cee4758c3",
    "description": "Reward",
    "exchange": "celsius",
    "type": "interest",
    "currency": "ETH",
    "net-amount": 0.13738545787614043,
    "amount": 0.13738545787614043,
    "amount-usd": 516.1310620036631
  },
  {
    "date": new Date("2021-02-15T10:00:00.000Z"),
    "uid": "9e557a06-fb62-4425-8c31-247cee4758c3",
    "description": "Reward",
    "exchange": "celsius",
    "type": "interest",
    "currency": "ETH",
    "net-amount": 1.3738545787614043,
    "amount": 1.3738545787614043,
    "amount-usd": 5495.418315
  },
  {
    "date": new Date("2021-02-25T10:00:00.000Z"),
    "uid": "9e557a06-fb62-4425-8c31-247cee4758c3",
    "description": "Reward",
    "exchange": "celsius",
    "type": "interest",
    "currency": "ETH",
    "net-amount": 0.27477091575228,
    "amount": 0.27477091575228,
    "amount-usd": 1032.2621240073262
  },

  /* Nexo Interest */
  {
    "date": new Date("2021-03-01T07:00:05.000Z"),
    "uid": "NXT4JlVA7QmQU",
    "description": "BTC Interest Earned",
    "exchange": "nexo",
    "type": "interest",
    "interest-type": "Interest",
    "currency": "BTC",
    "net-amount": 55850,
    "amount": 55850,
    "amount-usd": 26.40
  },
  {
    "date": new Date("2021-03-02T07:00:05.000Z"),
    "uid": "NXT4JlVA7QmQU",
    "description": "BTC Interest Earned",
    "exchange": "nexo",
    "type": "interest",
    "interest-type": "Interest",
    "currency": "BTC",
    "net-amount": 558500,
    "amount": 558500,
    "amount-usd": 264.00
  },
  {
    "date": new Date("2021-03-03T07:00:05.000Z"),
    "uid": "NXT4JlVA7QmQU",
    "description": "BTC Interest Earned",
    "exchange": "nexo",
    "type": "interest",
    "interest-type": "Interest",
    "currency": "BTC",
    "net-amount": 5585000,
    "amount": 5585000,
    "amount-usd": 2640.00
  },
  {
    "date": new Date("2021-03-04T07:00:05.000Z"),
    "uid": "NXT4JlVA7QmQU",
    "description": "BTC Interest Earned",
    "exchange": "nexo",
    "type": "interest",
    "interest-type": "Interest",
    "currency": "BTC",
    "net-amount": 5585,
    "amount": 5585,
    "amount-usd": 2.64
  },
],
  interestTrades:
[
  /* Gemini Trade */
  {
    "date": new Date("2021-02-05T16:04:26.976Z"),
    "exchange": "gemini",
    "type": "trade",
    "trade-type": "buy",
    "currency": "BTC",
    "net-amount": 6204935,
    "amount": 6204935,
    "cost-currency": "USD",
    "fee-currency": "USD",
    "fee": 12.46,
    "cost": 3710.501,
    "net-cost": 3722.961,
    "price": 60000.00,
    "rate": 1672.2634,
    "net-rate": 1666.666667
  },
  {
    "date": new Date("2021-04-01T16:04:26.976Z"),
    "exchange": "gemini",
    "type": "trade",
    "trade-type": "buy",
    "currency": "BTC",
    "net-amount": 1569175,
    "amount": 1569175,
    "cost-currency": "USD",
    "fee-currency": "USD",
    "fee": 4.5875,
    "cost": 780,
    "net-cost": 784.5875,
    "price": 50000.00,
    "rate": 2011.76282051282,
    "net-rate": 2000
  },
  {
    "date": new Date("2021-02-23T16:04:26.976Z"),
    "exchange": "gemini",
    "type": "trade",
    "trade-type": "buy",
    "currency": "ETH",
    "net-amount": 0.068838205,
    "amount": 0.068838205,
    "cost-currency": "USD",
    "fee-currency": "USD",
    "fee": 1.9109084,
    "cost": 270,
    "net-cost": 271.9109084,
    "price": 3950.00,
    "rate": 0.000254956314815,
    "net-rate": 0.000253164558219
  },
  {
    "date": new Date("2021-04-01T16:05:26.976Z"),
    "exchange": "gemini",
    "type": "trade",
    "trade-type": "buy",
    "currency": "ETH",
    "net-amount": 1.786010952,
    "amount": 1.786010952,
    "cost-currency": "USD",
    "fee-currency": "USD",
    "fee": 21.038333,
    "cost": 6230,
    "net-cost": 6251.038333,
    "price": 3500,
    "rate": 0.000286679125522,
    "net-rate": 0.000285714285669
  },
  {
    "date": new Date("2021-06-01T16:04:26.976Z"),
    "exchange": "gemini",
    "type": "trade",
    "trade-type": "sell",
    "currency": "USD",
    "net-amount": 4470.11325,
    "amount": 4490.00,
    "cost-currency": "BTC",
    "fee-currency": "USD",
    "fee": 19.88675,
    "cost": 7774110,
    "net-cost": 7774110,
    "price": 57500.00,
    "rate": 0.000577558074172,
    "net-rate": 0.000575
  },
  {
    "date": new Date("2021-06-02T16:04:26.976Z"),
    "exchange": "gemini",
    "type": "trade",
    "trade-type": "sell",
    "currency": "USD",
    "net-amount": 265.5187894,
    "amount": 267,
    "cost-currency": "CRO",
    "fee-currency": "USD",
    "fee": 1.4812106,
    "cost": 442.5313157,
    "net-cost": 442.5313157,
    "price": 0.6,
    "rate": 0.603347131666054,
    "net-rate": 0.6
  },
  {
    "date": new Date("2021-06-03T16:04:26.976Z"),
    "exchange": "gemini",
    "type": "trade",
    "trade-type": "sell",
    "currency": "USD",
    "net-amount": 7144.04381,
    "amount": 7150,
    "cost-currency": "ETH",
    "fee-currency": "USD",
    "fee": 5.95619,
    "cost": 1.786010952,
    "net-cost": 1.786010952,
    "price": 4000.00,
    "rate": 4003.334913480418568,
    "net-rate": 4000.00
  },

  /* Kraken Trade */
  {
    "date": new Date("2021-02-20T06:40:07.131Z"),
    "uid": "TOQ56W-XGTJT-B6AKSV",
    "orderId": "OOAHSA-BLQY5-6EXEUY",
    "exchange": "kraken",
    "type": "trade",
    "trade-type": "buy",
    "currency": "CRO",
    "net-amount": 442.5313157,
    "amount": 442.5313157,
    "fee-currency": "ETH",
    "cost-currency": "ETH",
    "fee": 0.0005,
    "cost": 0.068338205,
    "net-cost": 0.068838205,
    "rate": 6475.606371282359553,
    "net-rate": 6428.571397235009251,
    "amount-usd": 309.771921,
  },
]
}
