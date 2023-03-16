import { sendTransaction, switchNetwork } from '@wagmi/core';
import { BigNumber } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useChainId } from 'wagmi';

import { utils } from '@hyperlane-xyz/utils';
import { useMessageTimeline } from '@hyperlane-xyz/widgets';

import { toastTxSuccess } from '../../components/toast/TxSuccessToast';
import { toWei } from '../../utils/amount';
import { logger } from '../../utils/logger';
import { sleep } from '../../utils/timeout';
import { getHypErc20Contract } from '../contracts/hypErc20';
import { TokenTrade, createTrade, executeTrade } from '../contracts/uniswap';
import { unwrapWETH, wrapETH } from '../contracts/weth';
import { getProvider, getRelayerWallet } from '../providers';
import { RoutesMap, getTokenRoute } from '../tokens/routes';

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
  const [latestValues, setLatestValues] = useState<TransferFormValues | null>(null);
  let stage: Stage;

  const [originTxHash, setOriginTxHash] = useState<string | null>(null);
  const { message } = useMessageTimeline({
    originTxHash: originTxHash || undefined,
  });

  const chainId = useChainId();

  useEffect(() => {
    logger.debug('useEffect: Checking conditions');
    if (originTxHash && message?.status === 'delivered') {
      logger.debug('useEffect: Conditions met, executing trade');
      (async () => {
        try {
          if (latestValues?.isSrcNative) {
            stage = Stage.Swap;

            const weiAmount = toWei(latestValues.amount).toString();
            const { amountOut, uncheckedTrade } = await createTrade(
              true,
              BigNumber.from(weiAmount),
            );
            console.log('uniswap: trade amountOut', amountOut[0]);
            if (!uncheckedTrade) {
              throw new Error('No trade found');
            }
            const execHash = await executeTrade(uncheckedTrade);
            toastTxSuccess(
              'Swapped successfully from GETH to WETH',
              execHash,
              latestValues.destinationChainId,
            );

            stage = Stage.WETH;
            if (!trade || !amountOut[0]) {
              throw new Error('Unwrap failed');
            }
            const unwrapHash = await unwrapWETH(amountOut[0], latestValues.recipientAddress);
            toastTxSuccess(
              'Unwrapped successfully to ETH',
              unwrapHash,
              latestValues.destinationChainId,
            );
          }
        } catch (error) {
          logger.error(`Error at stage ${stage} `, error);
          toast.error(errorMessages[stage]);
        }

        setIsLoading(false);
        if (onDone) onDone();
      })().catch((error) => {
        // Handle the error here or log it
        logger.error('Error occurred in useEffect async function:', error);
      });
    }
  }, [message, originTxHash, latestValues]);

  // TODO implement cancel callback for when modal is closed?
  const triggerTransactions = useCallback(
    async (values: TransferFormValues, tokenRoutes: RoutesMap) => {
      logger.debug('Attempting approve and transfer transactions');
      setOriginTxHash(null);
      setIsLoading(true);
      if (onStart) onStart();
      stage = Stage.Prepare;

      try {
        const {
          amount,
          sourceChainId,
          destinationChainId,
          recipientAddress,
          isSrcNative: srcToNative,
        } = values;

        const tokenRoute = getTokenRoute(sourceChainId, destinationChainId, tokenRoutes);
        if (!tokenRoute || !tokenRoute.sourceTokenAddress)
          throw new Error('No token route found between chains');

        if (sourceChainId !== chainId) {
          await switchNetwork({
            chainId: sourceChainId,
          });
          // https://github.com/wagmi-dev/wagmi/issues/1565
          await sleep(1500);
        }

        const weiAmount = toWei(amount).toString();
        const provider = getProvider(sourceChainId);

        stage = Stage.Transfer;

        if (srcToNative) {
          const hypErc20 = getHypErc20Contract(tokenRoute.sourceTokenAddress, provider);
          const gasPayment = await hypErc20.quoteGasPayment(destinationChainId);
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
        } else {
          // arbitrum to goerli

          stage = Stage.WETH;

          const wrapHash = await wrapETH(BigNumber.from(weiAmount));
          toastTxSuccess('Unwrapped successfully to ETH', wrapHash, sourceChainId);

          stage = Stage.Swap;

          const { amountOut, uncheckedTrade } = await createTrade(false, BigNumber.from(weiAmount));
          setTrade(uncheckedTrade);
          console.log('uniswap: amountOut', amountOut[0]);
          console.log('uniswap: trade ', uncheckedTrade);
          if (!uncheckedTrade) {
            throw new Error('No trade found');
          }
          const execHash = await executeTrade(uncheckedTrade);
          toastTxSuccess('Swapped successfully from WETH to GETH', execHash, sourceChainId);

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
          toastTxSuccess('Remote transfer started!', transactionHash, destinationChainId);
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
      setLatestValues(values);
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
