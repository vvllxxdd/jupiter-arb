# Arbitrage BOT using Jupiter API

This is not 100% risk free as transaction may fail but it's a proof of concept to use Jupiter API to do arbitrage on Solana.

This code shows:
- It checks for USDC => SOL, then SOL => USDC, if output amount in USDC is more than input amount in USDC, then it will trade.
- It will send a minimum 2 transactions and it may fail but it's fine since transaction fee is cheap on Solana.

Feel free to replace Sol with other assets, it is advisable to open token accounts in advance.

It earns less than 1 cent because it uses 0.00000002 SOL but that is insignificant.

## How to use?
1. Install dependencies
```sh
pnpm install
```

2.  Just create a `.env` file with your PRIVATE_KEY

3. run the file
```sh
node index.mjs
```
