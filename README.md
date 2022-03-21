# Arbitrage BOT using Jupiter API

This is not 100% risk-free as transactions may fail but it's a proof of concept to use Jupiter API to do arbitrage on Solana.

Feel free to replace SOL with other assets, it is advisable to open token accounts in advance.

Profitability can be adjusted based on a PROFITABILITY_THRESHOLD, but it's best to account for platform and lp provider fees.

## How to use?

1. Install dependencies

```sh
npm install
```

2.  Just create a `.env` file with your PRIVATE_KEY

3.  run the file

```sh
npm start
```

4. Can run it in Docker:

```sh
 docker build -t jupiter-arb .
```
