import { Pool, Route } from '@uniswap/v3-sdk';

import { Config } from './config';
import { getPoolInfo } from './pool';

export async function createTrade() {
  const poolInfo = await getPoolInfo();

  const pool = new Pool(
    Config.tokens.in,
    Config.tokens.out,
    Config.tokens.poolFee,
    poolInfo.sqrtPriceX96.toString(),
    poolInfo.liquidity.toString(),
    poolInfo.tick,
  );

  const swapRoute = new Route([pool], Config.tokens.in, Config.tokens.out);
  // const amountOut = await getOutputQuote(swapRoute);
}
