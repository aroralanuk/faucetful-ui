import { Token } from '@uniswap/sdk-core';
import { FeeAmount } from '@uniswap/v3-sdk';

export const UNISWAP_FACTORY = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
export const QUOTER_CONTRACT_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';
export const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
export const WETH_CONTRACT_ADDRESS = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1';

export const WETH_ABI = [
  // Wrap ETH
  'function depositTo(address) payable',

  // Unwrap ETH
  'function withdrawTo(address,uint256)',
];

export const WETH_TOKEN = new Token(42161, WETH_CONTRACT_ADDRESS, 18, 'WETH', 'Wrapped Ether');

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
    out: WETH_TOKEN,
    poolFee: FeeAmount.MEDIUM,
  },
};
