import { sendTransaction, switchNetwork } from '@wagmi/core';
import { BigNumber } from 'ethers';
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { useChainId } from 'wagmi';

import { utils } from '@hyperlane-xyz/utils';

import { toastTxSuccess } from '../../components/toast/TxSuccessToast';
import { toWei } from '../../utils/amount';
import { logger } from '../../utils/logger';
import { sleep } from '../../utils/timeout';
import { getHypErc20Contract } from '../contracts/hypErc20';
import { TokenTrade, createTrade, executeTrade } from '../contracts/uniswap';
import { unwrapWETH, wrapETH } from '../contracts/weth';
import { getProvider, getRelayerWallet } from '../providers';
import { RouteType, RoutesMap, getTokenRoute } from '../tokens/routes';

import { TransferFormValues } from './types';

enum Stage {
  Prepare = 'prepare',
  Transfer = 'transfer',
  WETH = 'weth',
  Swap = 'swap',
}

// Note, this doesn't use wagmi's prepare + send pattern because we're potentially sending two transactions
// See https://github.com/wagmi-dev/wagmi/discussions/1564
export function useTokenTransfer(onStart?: () => void, onDone?: () => void) {
  const [isLoading, setIsLoading] = useState(false);
  const [trade, setTrade] = useState<TokenTrade>();

  const [originTxHash, setOriginTxHash] = useState<string | null>(null);

  const chainId = useChainId();

  // TODO implement cancel callback for when modal is closed?
  const triggerTransactions = useCallback(
    async (srcToNative: boolean, values: TransferFormValues, tokenRoutes: RoutesMap) => {
      logger.debug('Attempting approve and transfer transactions');
      setOriginTxHash(null);
      setIsLoading(true);
      if (onStart) onStart();
      let stage: Stage = Stage.Prepare;

      try {
        const { amount, sourceChainId, destinationChainId, recipientAddress } = values;

        console.log('UseTokenTransfer.tsx: values: ', values);

        console.log('UseTokenTransfer.tsx: values: ', values);
        const tokenRoute = getTokenRoute(sourceChainId, destinationChainId, tokenRoutes);
        console.log('UseTokenTransfer.tsx: tokenRoute: ', tokenRoute);
        if (!tokenRoute || !tokenRoute.sourceTokenAddress)
          throw new Error('No token route found between chains');
        const isNativeToRemote = tokenRoute.type === RouteType.NativeToRemote;

        if (sourceChainId !== chainId) {
          await switchNetwork({
            chainId: sourceChainId,
          });
          // https://github.com/wagmi-dev/wagmi/issues/1565
          await sleep(1500);
        }

        console.log('UseTokenTransfer srcToNative: ', srcToNative);

        const weiAmount = toWei(amount).toString();
        const provider = getProvider(sourceChainId);

        stage = Stage.Transfer;

        if (srcToNative) {
          const hypErc20 = getHypErc20Contract(tokenRoute.sourceTokenAddress, provider);
          const gasPayment = await hypErc20.quoteGasPayment(destinationChainId);
          console.log('UseTokenTransfer.tsx: gasPayment: ', gasPayment.toString());
          const transferTxRequest = await hypErc20.populateTransaction.transferRemote(
            destinationChainId,
            utils.addressToBytes32(recipientAddress),
            weiAmount,
            {
              value: gasPayment.add(weiAmount),
            },
          );

          const { wait: transferWait } = await sendTransaction({
            chainId: sourceChainId,
            request: transferTxRequest,
            mode: 'recklesslyUnprepared', // See note above function
          });
          const { transactionHash } = await transferWait(1);
          setOriginTxHash(transactionHash);
          logger.debug('Transfer transaction confirmed, hash:', transactionHash);
          toastTxSuccess('Remote transfer started!', transactionHash, sourceChainId);

          stage = Stage.Swap;

          const { amountOut, uncheckedTrade } = await createTrade(true, BigNumber.from(weiAmount));
          setTrade(uncheckedTrade);
          console.log('uniswap: trade amountOut', amountOut[0]);
          if (uncheckedTrade) {
            await executeTrade(uncheckedTrade);
          } else {
            throw new Error('No trade found');
          }
          toastTxSuccess('Swapped successfully from GETH to WETH', '0x23', destinationChainId);

          stage = Stage.WETH;
          if (trade && amountOut[0]) {
            await unwrapWETH(amountOut[0], recipientAddress);
          }
        } else {
          stage = Stage.WETH;

          await wrapETH(BigNumber.from(weiAmount));

          stage = Stage.Swap;

          const { amountOut, uncheckedTrade } = await createTrade(false, BigNumber.from(weiAmount));
          setTrade(uncheckedTrade);
          console.log('uniswap: amountOut', amountOut[0]);
          console.log('uniswap: trade ', uncheckedTrade);
          if (uncheckedTrade) {
            await executeTrade(uncheckedTrade);
          } else {
            throw new Error('No trade found');
          }
          toastTxSuccess('Swapped successfully from WETH to GETH', '0x56', destinationChainId);

          stage = Stage.Transfer;

          const hypErc20 = getHypErc20Contract(tokenRoute.sourceTokenAddress, provider);
          const gasPayment = await hypErc20.quoteGasPayment(destinationChainId);
          console.log('UseTokenTransfer.tsx: gasPayment: ', gasPayment);

          const relayerWallet = getRelayerWallet(sourceChainId);

          const AmountWithFees = amountOut[0].sub(gasPayment);

          if (AmountWithFees.lt(0)) {
            throw new Error('Insufficient funds to cover relayer fees');
          }

          const tx = {
            data: hypErc20.interface.encodeFunctionData('transferRemote', [
              destinationChainId,
              utils.addressToBytes32(recipientAddress),
              AmountWithFees.toString(),
            ]),
            from: relayerWallet.address,
            to: tokenRoute.sourceTokenAddress,
            value: gasPayment,
          };

          const { hash: transactionHash } = await relayerWallet.sendTransaction(tx);
          setOriginTxHash(transactionHash);
          logger.debug('Transfer transaction confirmed, hash:', transactionHash);
          toastTxSuccess('Remote transfer started!', transactionHash, sourceChainId);
        }
      } catch (error) {
        logger.error(`Error at stage ${stage} `, error);
        if (JSON.stringify(error).includes('ChainMismatchError')) {
          // Wagmi switchNetwork call helps prevent this but isn't foolproof
          toast.error('Wallet must be connected to source chain');
        } else {
          toast.error(errorMessages[stage]);
        }
      }

      setIsLoading(false);
      if (onDone) onDone();
    },
    [setIsLoading, onStart, onDone, chainId],
  );

  return {
    isLoading,
    triggerTransactions,
    originTxHash,
  };
}

const errorMessages: Record<Stage, string> = {
  [Stage.Prepare]: 'Error while preparing the transactions.',
  [Stage.WETH]: 'Error while wrapping or unwrapping ETH.',
  [Stage.Swap]: 'Error while swapping between GETH and WETH.',
  [Stage.Transfer]: 'Error while making remote transfer.',
};
