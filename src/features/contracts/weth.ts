import { sendTransaction } from '@wagmi/core';
import { BigNumber, ethers } from 'ethers';

import { getProvider, getRelayerWallet } from '../providers';

import { WETH_ABI, WETH_CONTRACT_ADDRESS } from './config';

export async function wrapETH(eth: BigNumber) {
  const provider = getProvider(42161);
  const relayerWallet = getRelayerWallet(42161);

  const wethContract = new ethers.Contract(WETH_CONTRACT_ADDRESS, WETH_ABI, provider);
  const txRequest = await wethContract.populateTransaction.depositTo(relayerWallet.address, {
    value: eth.toString(),
  });

  const { wait: wrapWait } = await sendTransaction({
    chainId: 42161,
    request: txRequest,
    mode: 'recklesslyUnprepared', // See note above function
  });
  const wrapTxReceipt = await wrapWait(1);
  console.log('Wrap transaction confirmed, hash:', wrapTxReceipt.transactionHash);
}

export async function unwrapWETH(eth: BigNumber, recipient: Address) {
  const provider = getProvider(42161);
  const relayerWallet = getRelayerWallet(42161);

  if (!relayerWallet || !provider) {
    throw new Error('Cannot execute a trade without a connected wallet');
  }

  const wethContract = new ethers.Contract(WETH_CONTRACT_ADDRESS, WETH_ABI, provider);

  console.log('unwrap', recipient);

  const tx = {
    data: wethContract.interface.encodeFunctionData('withdrawTo', [recipient, eth.toString()]),
    from: relayerWallet.address,
    to: WETH_CONTRACT_ADDRESS,
  };

  const { hash: transactionHash } = await relayerWallet.sendTransaction(tx);
  console.log('weth unwrapping transaction confirmed, hash:', transactionHash);

  return transactionHash;
}
