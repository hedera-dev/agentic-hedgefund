import { ConfigurationError, SupportedNetwork } from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

export interface SaucerSwapV2NetworkConfig {
  swapRouterContractId: string;
  nftManagerContractId: string;
  factoryContractId: string;
  quoterContractId: string;
  lpNftTokenId: string;
  whbarTokenId: string;
  apiBaseUrl: string;
}

export const SAUCERSWAP_V2_CONFIG: Partial<
  Record<SupportedNetwork, SaucerSwapV2NetworkConfig>
> = {
  [SupportedNetwork.MAINNET]: {
    swapRouterContractId: '0.0.3949434',
    nftManagerContractId: '0.0.4053945',
    factoryContractId: '0.0.3946833',
    quoterContractId: '0.0.3949424',
    lpNftTokenId: '0.0.4054027',
    whbarTokenId: '0.0.1456986',
    apiBaseUrl: 'https://api.saucerswap.finance',
  },
  [SupportedNetwork.TESTNET]: {
    swapRouterContractId: '0.0.1414040',
    nftManagerContractId: '0.0.1308184',
    factoryContractId: '0.0.1197038',
    quoterContractId: '0.0.1390002',
    lpNftTokenId: '0.0.1310436',
    whbarTokenId: '0.0.15058',
    apiBaseUrl: 'https://test-api.saucerswap.finance',
  },
};

export function getSaucerSwapV2Config(
  network: SupportedNetwork,
): SaucerSwapV2NetworkConfig {
  const config = SAUCERSWAP_V2_CONFIG[network];
  if (!config) {
    throw new ConfigurationError(
      `SaucerSwap V2 is not configured for network "${network}"`,
      { context: { network } },
    );
  }
  return config;
}

export enum FeeTier {
  VERY_STABLE = 500,
  STABLE = 1500,
  STANDARD = 3000,
  VOLATILE = 10000,
}

export const FEE_TIER_TO_TICK_SPACING: Record<number, number> = {
  [FeeTier.VERY_STABLE]: 10,
  [FeeTier.STABLE]: 30,
  [FeeTier.STANDARD]: 60,
  [FeeTier.VOLATILE]: 200,
};

export const SUPPORTED_FEE_TIERS: number[] = [
  FeeTier.VERY_STABLE,
  FeeTier.STABLE,
  FeeTier.STANDARD,
  FeeTier.VOLATILE,
];

/** Zod schema for a supported V2 pool fee tier (bps). */
export const SaucerSwapV2FeeTierSchema = z
  .number()
  .int()
  .refine((v) => SUPPORTED_FEE_TIERS.includes(v), {
    message: 'Fee tier must be one of 500, 1500, 3000, 10000',
  });

export const DEFAULT_SWAP_GAS = 300_000;
export const DEFAULT_MINT_POSITION_GAS = 900_000;
export const DEFAULT_INCREASE_LIQUIDITY_GAS = 330_000;
export const DEFAULT_DECREASE_LIQUIDITY_GAS = 300_000;
export const DEFAULT_COLLECT_FEES_GAS = 300_000;
export const DEFAULT_DEADLINE_SECONDS = 180;
export const DEFAULT_SLIPPAGE_PERCENT = 0.5;
export const MAX_UINT128 = (1n << 128n) - 1n;
