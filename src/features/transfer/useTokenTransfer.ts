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
import { getProvider } from '../providers';
import { RoutesMap, getTokenRoute } from '../tokens/routes';

import { TransferFormValues } from './types';

enum Stage {
  Prepare = 'prepare',
  Transfer = 'transfer',
  Approve = 'approve',
}

// Note, this doesn't use wagmi's prepare + send pattern because we're potentially sending two transactions
// See https://github.com/wagmi-dev/wagmi/discussions/1564
export function useTokenTransfer(onStart?: () => void, onDone?: () => void) {
  const [isLoading, setIsLoading] = useState(false);

  const [originTxHash, setOriginTxHash] = useState<string | null>(null);

  const chainId = useChainId();

  // TODO implement cancel callback for when modal is closed?
  const triggerTransactions = useCallback(
    async (values: TransferFormValues, tokenRoutes: RoutesMap) => {
      logger.debug('Attempting approve and transfer transactions');
      setOriginTxHash(null);
      setIsLoading(true);
      if (onStart) onStart();
      let stage: Stage = Stage.Prepare;

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

        if (srcToNative) {
          stage = Stage.Transfer;

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

          stage = Stage.Approve;

          stage = Stage.Transfer;
          const hypErc20 = getHypErc20Contract(tokenRoute.sourceTokenAddress, provider);
          const gasPayment = await hypErc20.quoteGasPayment(destinationChainId);
          console.log('UseTokenTransfer.tsx: gasPayment: ', gasPayment);

          const AmountWithFees = BigNumber.from(weiAmount).sub(gasPayment);

          if (AmountWithFees.lt(0)) {
            throw new Error('Insufficient funds to cover relayer fees');
          }

          const transferTxRequest = await hypErc20.populateTransaction.transferRemote(
            destinationChainId,
            utils.addressToBytes32(recipientAddress),
            AmountWithFees.toString(),
            {
              value: gasPayment,
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
  [Stage.Approve]: 'Error while swapping between GETH and WETH.',
  [Stage.Transfer]: 'Error while making remote transfer.',
};
