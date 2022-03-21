# Arbitrage BOT using Jupiter API

This is not 100% risk-free as transactions may fail but it's a proof of concept to use Jupiter API to do arbitrage on Solana.

Feel free to replace SOL with other assets, it is advisable to open token accounts in advance.

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

Can run it in Docker:

```sh
 docker build -t jupiter-arb .
```
