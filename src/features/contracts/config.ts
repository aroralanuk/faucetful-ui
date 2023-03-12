import { Token } from '@uniswap/sdk-core';
import { FeeAmount } from '@uniswap/v3-sdk';

const UNISWAP_FACTORY = '0x1F98431c8aD98523631AE4a59f267346ea31F984';

export const WETH_TOKEN = new Token(
  42161,
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  18,
  'WETH',
  'Wrapped Ether',
);

export const GETH_TOKEN = new Token(
  42161,
  '0x18784bc2fee75461ef8e819e608b25af9f352080',
  18,
  'GETH',
  'GoerliETH',
);

export const Config = {
  factoryAddress: UNISWAP_FACTORY,
  tokens: {
    in: GETH_TOKEN,
    amountIn: 1,
    out: WETH_TOKEN,
    poolFee: FeeAmount.MEDIUM,
  },
};
