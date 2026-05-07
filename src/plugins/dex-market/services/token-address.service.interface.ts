export interface TokenAddressService {
  resolveEvmAddress(input: string, network: string): Promise<string>;
}
