import { ConfigurationError, SupportedNetwork } from '@hiero-ledger/hiero-cli';

export interface SaucerSwapNetworkConfig {
  routerContractId: string;
  factoryContractId: string;
  whbarTokenId: string;
  apiBaseUrl: string;
}

export const SAUCERSWAP_V1_CONFIG: Partial<
  Record<SupportedNetwork, SaucerSwapNetworkConfig>
> = {
  [SupportedNetwork.MAINNET]: {
    routerContractId: '0.0.3045981',
    factoryContractId: '0.0.1062784',
    whbarTokenId: '0.0.1456986',
    apiBaseUrl: 'https://api.saucerswap.finance',
  },
  [SupportedNetwork.TESTNET]: {
    routerContractId: '0.0.19264',
    factoryContractId: '0.0.9959',
    whbarTokenId: '0.0.15058',
    apiBaseUrl: 'https://test-api.saucerswap.finance',
  },
};

export function getSaucerSwapV1Config(
  network: SupportedNetwork,
): SaucerSwapNetworkConfig {
  const config = SAUCERSWAP_V1_CONFIG[network];
  if (!config) {
    throw new ConfigurationError(
      `SaucerSwap V1 is not configured for network "${network}"`,
      { context: { network } },
    );
  }
  return config;
}
