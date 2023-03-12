import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { utils } from '@hyperlane-xyz/utils';

import { isValidAddress, normalizeAddress } from '../../utils/addresses';
import { logger } from '../../utils/logger';
import { getHypErc20Contract, getHypNativeContract } from '../contracts/hypErc20';
import { getProvider } from '../providers';

import { getAllTokens } from './metadata';
import { ListedTokenWithHypTokens } from './types';

export enum RouteType {
  NativeToRemote = 'nativeToRemote',
  RemoteToNative = 'remoteToNative',
}

export interface Route {
  type: RouteType;
  nativeChainId: number;
  sourceTokenAddress?: Address;
  destTokenAddress?: Address;
}

// Source chain to destination chain to Route
export type RoutesMap = Record<number, Record<number, Route[]>>;

export function isNative(chainId: string, tokenRoutes: RoutesMap | null) {
  console.log('isNative: ', tokenRoutes);
  if (tokenRoutes == null) return false;
  for (const src of Object.keys(tokenRoutes)) {
    if (src === chainId) {
      for (const dest of Object.values(tokenRoutes[src])) {
        for (const route of dest) {
          if ((route as Route).type == RouteType.NativeToRemote) return true;
        }
      }
    } else return false;
  }
}

// Process token list to populates routesCache with all possible token routes (e.g. router pairs)
function computeTokenRoutes(tokens: ListedTokenWithHypTokens[]) {
  const tokenRoutes: RoutesMap = {};

  // Instantiate map structure
  const allChainIds = getChainsFromTokens(tokens);
  for (const source of allChainIds) {
    tokenRoutes[source] = {};
    for (const dest of allChainIds) {
      if (source === dest) continue;
      tokenRoutes[source][dest] = [];
    }
  }

  // Compute all possible routes, in both directions
  for (const token of tokens) {
    console.log('useTokenRoutes computeRoutes', token);

    if (token.type === 'native') {
      for (const hypToken of token.hypTokens) {
        const { chainId: nativeChainId } = token;
        const { chainId: remoteChainId, address: hypTokenAddress } = hypToken;

        const commonRouteProps = {
          nativeChainId,
        };
        tokenRoutes[nativeChainId][remoteChainId].push({
          type: RouteType.NativeToRemote,
          ...commonRouteProps,
          destTokenAddress: hypTokenAddress,
        });

        tokenRoutes[remoteChainId][nativeChainId].push({
          type: RouteType.RemoteToNative,
          ...commonRouteProps,
          sourceTokenAddress: hypTokenAddress,
        });
      }
    } else if (token.type === 'sythetic') {
      console.log('useTokenRoutes allgood');
      for (const hypToken of token.hypTokens) {
        const { chainId: nativeChainId } = token;
        const { chainId: remoteChainId, address: hypTokenAddress } = hypToken;

        const commonRouteProps = {
          nativeChainId,
        };

        tokenRoutes[nativeChainId][remoteChainId].push({
          type: RouteType.RemoteToNative,
          ...commonRouteProps,
          sourceTokenAddress: hypTokenAddress,
        });
        tokenRoutes[remoteChainId][nativeChainId].push({
          type: RouteType.NativeToRemote,
          ...commonRouteProps,
          destTokenAddress: hypTokenAddress,
        });
      }
    }
  }
  return tokenRoutes;
}

function getChainsFromTokens(tokens: ListedTokenWithHypTokens[]) {
  const chains = new Set<number>();
  for (const token of tokens) {
    chains.add(token.chainId);
    for (const remoteToken of token.hypTokens) {
      chains.add(remoteToken.chainId);
    }
  }
  return Array.from(chains);
}

export function getTokenRoutes(
  sourceChainId: number,
  destinationChainId: number,
  tokenRoutes: RoutesMap,
): Route[] {
  return tokenRoutes[sourceChainId]?.[destinationChainId] || [];
}

export function getTokenRoute(
  sourceChainId: number,
  destinationChainId: number,
  nativeTokenAddress: Address,
  tokenRoutes: RoutesMap,
): Route | null {
  if (!isValidAddress(nativeTokenAddress)) return null;
  return null;
  // return (
  //   getTokenRoutes(sourceChainId, destinationChainId, tokenRoutes).find((r) =>
  //     areAddressesEqual(nativeTokenAddress, r.nativeTokenAddress),
  //   ) || null
  // );
}

export function hasTokenRoute(
  sourceChainId: number,
  destinationChainId: number,
  nativeTokenAddress: Address,
  tokenRoutes: RoutesMap,
): boolean {
  return !!getTokenRoute(sourceChainId, destinationChainId, nativeTokenAddress, tokenRoutes);
}

export function useTokenRoutes() {
  const {
    isLoading,
    isError: hasError,
    data: tokenRoutes,
  } = useQuery(
    ['token-routes'],
    async () => {
      logger.info('Searching for token routes');
      const tokens: ListedTokenWithHypTokens[] = [];
      for (const token of getAllTokens()) {
        logger.info('Inspecting token:', token.symbol);
        const provider = getProvider(token.chainId);

        if (token.type === 'native') {
          const routerContract = getHypNativeContract(token.address, provider);
          logger.info('Fetching connected domains for native side...');
          const domains = await routerContract.domains();

          logger.info(`Found ${domains.length} connected domains:`, domains);

          logger.info('Getting domain router address');
          const hypTokenByteAddressesP = domains.map((d) => routerContract.routers(d));
          const hypTokenByteAddresses = await Promise.all(hypTokenByteAddressesP);
          const hypTokenAddresses = hypTokenByteAddresses.map((b) => utils.bytes32ToAddress(b));
          logger.info(`Addresses found:`, hypTokenAddresses);

          const hypTokens = hypTokenAddresses.map((addr, i) => ({
            chainId: domains[i],
            address: normalizeAddress(addr),
          }));

          tokens.push({ ...token, hypTokens });
        } else {
          const routerContract = getHypErc20Contract(token.address, provider);

          logger.info('Fetching connected domains for the synthetic side...');
          const domains = await routerContract.domains();

          logger.info(`Found ${domains.length} connected domains:`, domains);

          logger.info('Getting domain router address');
          const hypTokenByteAddressesP = domains.map((d) => routerContract.routers(d));
          const hypTokenByteAddresses = await Promise.all(hypTokenByteAddressesP);
          const hypTokenAddresses = hypTokenByteAddresses.map((b) => utils.bytes32ToAddress(b));
          logger.info(`Addresses found:`, hypTokenAddresses);

          const hypTokens = hypTokenAddresses.map((addr, i) => ({
            chainId: domains[i],
            address: normalizeAddress(addr),
          }));

          tokens.push({ ...token, hypTokens });
        }
      }
      return computeTokenRoutes(tokens);
    },
    { retry: false },
  );

  return { isLoading, hasError, tokenRoutes };
}

export function useRouteChains(tokenRoutes: RoutesMap): number[] {
  return useMemo(() => Object.keys(tokenRoutes).map((chainId) => parseInt(chainId)), [tokenRoutes]);
}
