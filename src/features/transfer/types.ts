export interface TransferFormValues {
  sourceChainId: number;
  destinationChainId: number;
  amount: string;
  amountOut: string;
  tokenAddress: Address;
  recipientAddress: Address;
  isSrcNative: boolean;
  messageStatus: string;
  activeRelayer: boolean;
}
