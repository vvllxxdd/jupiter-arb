# Arbitrage BOT using Jupiter API

This is not 100% risk-free as transactions may fail but it's a proof of concept to use Jupiter API to do arbitrage on Solana.

This code shows:

- It checks for USDC => SOL, then SOL => USDC, if the output amount in USDC is more than the input amount in USDC, then it will trade.
- It will send a minimum of 2 transactions and it may fail but it's fine since the transaction fee is cheap on Solana.

Feel free to replace Sol with other assets, it is advisable to open token accounts in advance.

It earns less than 1 cent because it uses 0.00000002 SOL but that is insignificant.

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
