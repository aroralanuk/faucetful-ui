import { Currency, CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core';
import { Pool, Route, SwapOptions, SwapQuoter, SwapRouter, Trade } from '@uniswap/v3-sdk';
import { BigNumber, ethers } from 'ethers';
import JSBI from 'jsbi';

import { getProvider, getRelayerWallet } from '../providers';

import { Config, QUOTER_CONTRACT_ADDRESS, SWAP_ROUTER_ADDRESS } from './config';
import { getPoolInfo } from './pool';

export type TokenTrade = Trade<Token, Token, TradeType>;

export async function createTrade(zeroForOne: boolean, amountIn: BigNumber) {
  const poolInfo = await getPoolInfo();

  const tokenIn: Token = zeroForOne ? Config.tokens.in : Config.tokens.out;
  const tokenOut: Token = zeroForOne ? Config.tokens.out : Config.tokens.in;

  const pool = new Pool(
    tokenIn,
    tokenOut,
    Config.tokens.poolFee,
    poolInfo.sqrtPriceX96.toString(),
    poolInfo.liquidity.toString(),
    poolInfo.tick,
  );

  const swapRoute = new Route([pool], tokenIn, tokenOut);
  const amountOut = await getOutputQuote(swapRoute, amountIn, zeroForOne);

  const uncheckedTrade = Trade.createUncheckedTrade({
    route: swapRoute,
    inputAmount: CurrencyAmount.fromRawAmount(tokenIn, amountIn.toString()),
    outputAmount: CurrencyAmount.fromRawAmount(tokenOut, JSBI.BigInt(amountOut)),
    tradeType: TradeType.EXACT_INPUT,
  });
  console.log('uniswap createTrade', uncheckedTrade);
  console.log('uniswap amoutOut', amountOut);

  return { amountOut, uncheckedTrade };
}

export async function executeTrade(trade: TokenTrade) {
  console.log('uniswap executeTrade start');
  const relayerWallet = getRelayerWallet(42161);

  console.log('uniswap executeTrade relayer', relayerWallet.address);
  const provider = getProvider(42161);

  if (!relayerWallet || !provider) {
    throw new Error('Cannot execute a trade without a connected wallet');
  }

  const options: SwapOptions = {
    slippageTolerance: new Percent(500, 10_000), // 500 bips, or 5.00%
    deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
    recipient: relayerWallet.address,
  };

  const methodParameters = SwapRouter.swapCallParameters([trade], options);
  console.log('uniswap method: ', trade);

  const tx = {
    data: methodParameters.calldata,
    to: SWAP_ROUTER_ADDRESS,
    value: 0,
    from: relayerWallet.address,
  };

  const { hash: transactionHash } = await relayerWallet.sendTransaction(tx);
  console.log('uniswap swap transaction confirmed, hash:', transactionHash);

  return transactionHash;
}

// Helper Quoting and Pool Functions

async function getOutputQuote(
  route: Route<Currency, Currency>,
  amountIn: BigNumber,
  zeroForOne: boolean,
) {
  const provider = getProvider(42161);

  if (!provider) {
    throw new Error('Provider required to get pool state');
  }
  const tokenIn: Token = zeroForOne ? Config.tokens.in : Config.tokens.out;

  const { calldata } = await SwapQuoter.quoteCallParameters(
    route,
    CurrencyAmount.fromRawAmount(tokenIn, amountIn.toString()),
    TradeType.EXACT_INPUT,
    {
      useQuoterV2: true,
    },
  );

  const quoteCallReturnData = await provider.call({
    to: QUOTER_CONTRACT_ADDRESS,
    data: calldata,
  });

  return ethers.utils.defaultAbiCoder.decode(['uint256'], quoteCallReturnData);
}
