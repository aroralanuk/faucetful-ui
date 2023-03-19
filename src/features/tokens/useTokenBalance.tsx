import { QueryClient, useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

import { logger } from '../../utils/logger';
import { getErc20Contract } from '../contracts/erc20';
import { getProvider } from '../providers';

export function getTokenBalanceKey(
  chainId: number,
  tokenAddress: Address,
  accountAddress?: Address,
) {
  return ['tokenBalance', chainId, tokenAddress, accountAddress];
}

export function getNativeBalanceKey(chainId: number, accountAddress?: Address) {
  return ['nativeBalance', chainId, accountAddress];
}

export function useAccountTokenBalance(
  chainId: number,
  tokenAddress: Address,
  givenAddress?: Address,
) {
  const { address: accountAddress } = useAccount();
  return useTokenBalance(chainId, tokenAddress, givenAddress || accountAddress);
}

export function useAccountNativeBalance(chainId: number, givenAddress?: Address) {
  const { address: accountAddress } = useAccount();
  return useNativeBalance(chainId, givenAddress || accountAddress);
}

export function useNativeBalance(chainId: number, accountAddress?: Address) {
  const {
    isLoading,
    isError: hasError,
    data: balance,
  } = useQuery(
    getNativeBalanceKey(chainId, accountAddress),
    () => {
      if (!chainId || !accountAddress) return null;
      return fetchNativeBalance(chainId, accountAddress);
    },
    { retry: false },
  );

  return { isLoading, hasError, balance };
}

export function useTokenBalance(chainId: number, tokenAddress: Address, accountAddress?: Address) {
  const {
    isLoading,
    isError: hasError,
    data: balance,
  } = useQuery(
    getTokenBalanceKey(chainId, tokenAddress, accountAddress),
    () => {
      if (!chainId || !tokenAddress || !accountAddress) return null;
      return fetchTokenBalance(chainId, tokenAddress, accountAddress);
    },
    { retry: false },
  );

  return { isLoading, hasError, balance };
}

export function getCachedTokenBalance(
  queryClient: QueryClient,
  chainId: number,
  tokenAddress: Address,
  accountAddress?: Address,
) {
  return queryClient.getQueryData(getTokenBalanceKey(chainId, tokenAddress, accountAddress)) as
    | string
    | undefined;
}

async function fetchNativeBalance(chainId: number, accountAddress: Address) {
  logger.debug(`Fetching balance for account ${accountAddress} on chain ${chainId}`);
  const provider = getProvider(chainId);
  const balance = await provider.getBalance(accountAddress);
  return balance.toString();
}

async function fetchTokenBalance(chainId: number, tokenAddress: Address, accountAddress: Address) {
  logger.debug(
    `Fetching balance for account ${accountAddress} token ${tokenAddress} on chain ${chainId}`,
  );
  const erc20 = getErc20Contract(tokenAddress, getProvider(chainId));
  const balance = await erc20.balanceOf(accountAddress);
  return balance.toString();
}
