// load dot env
import { ethers, providers } from 'ethers';

import { getChainRpcUrl } from './chains/metadata';

const providerCache = {};

// This uses public RPC URLs from the chain configs in the SDK and/or custom settings
// Can be freely changed to use other providers/urls as needed
export function getProvider(chainId: number) {
  if (providerCache[chainId]) return providerCache[chainId];
  const rpcUrl = getChainRpcUrl(chainId);
  console.log('getProvider', rpcUrl);
  const provider = new providers.JsonRpcProvider(rpcUrl, chainId);
  providerCache[chainId] = provider;
  return provider;
}

export function getRelayerWallet(chainId: number) {
  const provider = getProvider(chainId);
  console.log('getRelayerWallet', process.env.NEXT_PUBLIC_VERSION);
  return new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY || '', provider);
}
