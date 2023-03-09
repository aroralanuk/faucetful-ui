export interface ListedToken {
  chainId: number;
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

export interface ListedTokenWithHypTokens extends ListedToken {
  hypTokens: Array<{ chainId: number; address: Address }>;
}
