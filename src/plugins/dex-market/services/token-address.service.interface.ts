export interface ResolvedTokenAddress {
  tokenId: string;
  evmAddress: string;
}

export interface TokenAddressService {
  resolveTokenAddress(
    input: string,
    network: string,
  ): Promise<ResolvedTokenAddress>;
}
