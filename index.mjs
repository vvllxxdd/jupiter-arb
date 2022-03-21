import dotenv from "dotenv";
import bs58 from "bs58";
import {
  Connection,
  Keypair,
  Transaction,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import got from "got";
import { Wallet } from "@project-serum/anchor";
import promiseRetry from "promise-retry";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

dotenv.config();

const ASSETS = {
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  UST: "9vMJfxuKxXBoEa7rM12mYLMwTacLMLDJqHozw96WQL8i",
  WSOL: "So11111111111111111111111111111111111111112",
  ETH: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
  soETH: "2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk",
  BTC: "9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E",
};

const PROFITABILITY_THRESHOLD = 1.00166;
const DECIMAL_CUTTER = 1000000;

const ASSET_MINT = process.argv[2] || ASSETS.WSOL;
const QUOTE_MINT = process.argv[3] || ASSETS.USDC;

const connection = new Connection(
  "https://twilight-misty-snow.solana-mainnet.quiknode.pro/1080f1a8952de8e09d402f2ce877698f832faea8/"
);

const wallet = new Wallet(
  Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY || ""))
);

const quoteAddress = await Token.getAssociatedTokenAddress(
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  new PublicKey(QUOTE_MINT),
  wallet.publicKey
);

// wsol account
const createAssetAccount = async () => {
  const wsolAddress = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    new PublicKey(ASSET_MINT),
    wallet.publicKey
  );

  const assetAccount = await connection.getAccountInfo(wsolAddress);

  if (!assetAccount) {
    const transaction = new Transaction({
      feePayer: wallet.publicKey,
    });
    const instructions = [];

    instructions.push(
      await Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        new PublicKey(ASSET_MINT),
        wsolAddress,
        wallet.publicKey,
        wallet.publicKey
      )
    );

    // // fund 1 sol to the account
    // instructions.push(
    //   SystemProgram.transfer({
    //     fromPubkey: wallet.publicKey,
    //     toPubkey: wsolAddress,
    //     lamports: 1_000_000_000, // 1 sol
    //   })
    // );

    instructions.push(
      // This is not exposed by the types, but indeed it exists
      Token.createSyncNativeInstruction(TOKEN_PROGRAM_ID, wsolAddress)
    );

    transaction.add(...instructions);
    transaction.recentBlockhash = await (
      await connection.getRecentBlockhash()
    ).blockhash;
    transaction.partialSign(wallet.payer);
    const result = await connection.sendTransaction(transaction, [
      wallet.payer,
    ]);
    console.log({ result });
  }

  return assetAccount;
};

const getCoinQuote = (inputMint, outputMint, amount) =>
  got
    .get(
      `https://quote-api.jup.ag/v1/quote?outputMint=${outputMint}&inputMint=${inputMint}&amount=${amount}&slippage=0.15`
    )
    .json();

const getTransaction = (route) => {
  return got
    .post("https://quote-api.jup.ag/v1/swap", {
      json: {
        route: route,
        userPublicKey: wallet.publicKey.toString(),
        // to make sure it doesnt close the sol account
        wrapUnwrapSOL: false,
      },
    })
    .json();
};

const getConfirmTransaction = async (txid) => {
  const res = await promiseRetry(
    async (retry, attempt) => {
      let txResult = await connection.getTransaction(txid, {
        commitment: "confirmed",
      });

      if (!txResult) {
        const error = new Error("Transaction was not confirmed");
        error.txid = txid;

        retry(error);
        return;
      }
      return txResult;
    },
    {
      retries: 40,
      minTimeout: 400,
      maxTimeout: 1100,
    }
  );
  if (res.meta.err) {
    throw new Error("Transaction failed");
  }
  return txid;
};

// require wsol to start trading, this function create your wsol account and fund 1 SOL to it
await createAssetAccount();

// initial 250 USDC for quote
// const initial = 250_000_000;

// Get quote token payer account address. e.g. usdc address for payer account

while (true) {
  // Account Token Account Info
  const tokenAccountBalance = await connection.getTokenAccountBalance(
    new PublicKey(quoteAddress)
  );
  const initial = tokenAccountBalance.value.amount;

  const outRoute = await getCoinQuote(QUOTE_MINT, ASSET_MINT, initial).then(
    (res) => res.data[0]
  );

  const inRoute = await getCoinQuote(
    ASSET_MINT,
    QUOTE_MINT,
    outRoute.outAmountWithSlippage
  ).then((res) => res.data[0]);

  const isProfitable =
    inRoute.outAmountWithSlippage > outRoute.inAmount * PROFITABILITY_THRESHOLD;

  console.log(
    `
    Current price is ${outRoute.inAmount / outRoute.outAmountWithSlippage}.
    Swap rate is $${outRoute.inAmount / DECIMAL_CUTTER} for $${
      inRoute.outAmountWithSlippage / DECIMAL_CUTTER
    }.
    Min. profitable: $${
      (outRoute.inAmount / DECIMAL_CUTTER) * PROFITABILITY_THRESHOLD
    }.
    ${isProfitable ? "Profitable" : "Not profitable"}
    <--------------------------------------------------->
  `
  );

  // when outAmount more than initial
  if (isProfitable) {
    await Promise.all(
      [outRoute, inRoute].map(async (route) => {
        const { setupTransaction, swapTransaction, cleanupTransaction } =
          await getTransaction(route);

        await Promise.all(
          [setupTransaction, swapTransaction, cleanupTransaction]
            .filter(Boolean)
            .map(async (serializedTransaction) => {
              // get transaction object from serialized transaction
              const transaction = Transaction.from(
                Buffer.from(serializedTransaction, "base64")
              );
              // perform the swap
              // Transaction might failed or dropped
              const txid = await connection.sendTransaction(
                transaction,
                [wallet.payer],
                {
                  skipPreflight: true,
                  maxRetries: 5,
                }
              );
              try {
                await getConfirmTransaction(txid);
                console.log(`Success: https://solscan.io/tx/${txid}`);
              } catch (e) {
                console.log(`Failed: https://solscan.io/tx/${txid}`);
              }
            })
        );
      })
    );
  }
}
