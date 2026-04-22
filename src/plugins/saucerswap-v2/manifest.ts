import type { PluginManifest } from '@hiero-ledger/hiero-cli';

import { OptionType } from '@hiero-ledger/hiero-cli';

import {
  SAUCERSWAP_V2_BUY_TEMPLATE,
  saucerswapV2Buy,
  SaucerSwapV2BuyOutputSchema,
} from './commands/buy';
import {
  SAUCERSWAP_V2_COLLECT_FEES_TEMPLATE,
  saucerswapV2CollectFees,
  SaucerSwapV2CollectFeesOutputSchema,
} from './commands/collect-fees';
import {
  SAUCERSWAP_V2_DECREASE_LIQUIDITY_TEMPLATE,
  saucerswapV2DecreaseLiquidity,
  SaucerSwapV2DecreaseLiquidityOutputSchema,
} from './commands/decrease-liquidity';
import {
  SAUCERSWAP_V2_INCREASE_LIQUIDITY_TEMPLATE,
  saucerswapV2IncreaseLiquidity,
  SaucerSwapV2IncreaseLiquidityOutputSchema,
} from './commands/increase-liquidity';
import {
  SAUCERSWAP_V2_LIST_POOLS_TEMPLATE,
  saucerswapV2ListPools,
  SaucerSwapV2ListPoolsOutputSchema,
} from './commands/list-pools';
import {
  SAUCERSWAP_V2_LIST_POSITIONS_TEMPLATE,
  saucerswapV2ListPositions,
  SaucerSwapV2ListPositionsOutputSchema,
} from './commands/list-positions';
import {
  SAUCERSWAP_V2_MINT_POSITION_TEMPLATE,
  saucerswapV2MintPosition,
  SaucerSwapV2MintPositionOutputSchema,
} from './commands/mint-position';
import {
  SAUCERSWAP_V2_SWAP_TEMPLATE,
  saucerswapV2Swap,
  SaucerSwapV2SwapOutputSchema,
} from './commands/swap';
import {
  SAUCERSWAP_V2_VIEW_POOL_TEMPLATE,
  saucerswapV2ViewPool,
  SaucerSwapV2ViewPoolOutputSchema,
} from './commands/view-pool';

export const saucerswapV2PluginManifest: PluginManifest = {
  name: 'saucerswap-v2',
  version: '0.1.0',
  displayName: 'SaucerSwap V2 Concentrated Liquidity Plugin',
  description:
    'Interact with the SaucerSwap V2 (Uniswap V3-style concentrated liquidity) DEX on Hedera.',
  commands: [
    {
      name: 'swap',
      summary: 'Swap exact input for a minimum output (V2)',
      description:
        'V2 exactInput swap on a single pool (one fee tier). Token references use the same rules as v1: Hedera ID, alias, EVM address, or HBAR. Amounts accept display units or raw base units with a "t" suffix.',
      options: [
        {
          name: 'from',
          short: 'f',
          type: OptionType.STRING,
          required: true,
          description:
            'Input token (Hedera ID, alias, EVM address, or "HBAR" / WHBAR id)',
        },
        {
          name: 'to',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description:
            'Output token (Hedera ID, alias, EVM address, or "HBAR" / WHBAR id)',
        },
        {
          name: 'amount',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'Exact input amount (display units, or raw token units with "t" suffix)',
        },
        {
          name: 'fee-tier',
          short: 'F',
          type: OptionType.NUMBER,
          required: true,
          description: 'Pool fee tier: 500, 1500, 3000, or 10000',
        },
        {
          name: 'min-output',
          short: 'o',
          type: OptionType.STRING,
          required: false,
          description:
            'Minimum output in output-token units; if omitted, derived from --slippage and input amount (approximate)',
        },
        {
          name: 'slippage',
          short: 's',
          type: OptionType.NUMBER,
          required: false,
          default: 0.5,
          description: 'Slippage (%) when --min-output is omitted',
        },
        {
          name: 'deadline',
          short: 'd',
          type: OptionType.NUMBER,
          required: false,
          default: 180,
          description: 'Deadline in seconds from now',
        },
        {
          name: 'gas',
          short: 'g',
          type: OptionType.NUMBER,
          required: false,
          default: 300000,
          description: 'Gas limit for the contract call',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager type (defaults to config)',
        },
      ],
      handler: saucerswapV2Swap,
      output: {
        schema: SaucerSwapV2SwapOutputSchema,
        humanTemplate: SAUCERSWAP_V2_SWAP_TEMPLATE,
      },
    },
    {
      name: 'buy',
      summary: 'Swap up to a maximum input for an exact output (V2)',
      description:
        'V2 exactOutput swap (buy exact amount out, cap input at max). Token references: ID, alias, EVM, or HBAR. Amounts: display or raw "t" units.',
      options: [
        {
          name: 'from',
          short: 'f',
          type: OptionType.STRING,
          required: true,
          description:
            'Input token (Hedera ID, alias, EVM address, or "HBAR" / WHBAR id)',
        },
        {
          name: 'to',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description:
            'Output token (Hedera ID, alias, EVM address, or "HBAR" / WHBAR id)',
        },
        {
          name: 'amount',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'Exact output amount (display units, or raw with "t" in output token decimals)',
        },
        {
          name: 'max-input',
          short: 'i',
          type: OptionType.STRING,
          required: true,
          description:
            'Maximum input to spend (display or raw in input token with "t")',
        },
        {
          name: 'fee-tier',
          short: 'F',
          type: OptionType.NUMBER,
          required: true,
          description: 'Pool fee tier: 500, 1500, 3000, or 10000',
        },
        {
          name: 'deadline',
          short: 'd',
          type: OptionType.NUMBER,
          required: false,
          default: 180,
          description: 'Deadline in seconds from now',
        },
        {
          name: 'gas',
          short: 'g',
          type: OptionType.NUMBER,
          required: false,
          default: 300000,
          description: 'Gas limit for the contract call',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager type (defaults to config)',
        },
      ],
      handler: saucerswapV2Buy,
      output: {
        schema: SaucerSwapV2BuyOutputSchema,
        humanTemplate: SAUCERSWAP_V2_BUY_TEMPLATE,
      },
    },
    {
      name: 'mint-position',
      summary: 'Create a new concentrated liquidity position (NFT)',
      description:
        'Mint a new V2 concentrated liquidity position NFT in an existing pool. Token A/B are resolved like v1 (ID, alias, EVM, HBAR). Amounts: display or raw "t" per token.',
      options: [
        {
          name: 'token-a',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'First token (Hedera ID, alias, EVM address, or "HBAR" / WHBAR id)',
        },
        {
          name: 'token-b',
          short: 'b',
          type: OptionType.STRING,
          required: true,
          description:
            'Second token (Hedera ID, alias, EVM address, or "HBAR" / WHBAR id)',
        },
        {
          name: 'fee-tier',
          type: OptionType.NUMBER,
          required: true,
          description: 'Pool fee tier (500, 1500, 3000, 10000)',
        },
        {
          name: 'amount-a',
          type: OptionType.STRING,
          required: true,
          description:
            'Desired amount for token A (display or raw with "t") before token0/token1 ordering',
        },
        {
          name: 'amount-b',
          type: OptionType.STRING,
          required: true,
          description:
            'Desired amount for token B (display or raw with "t") before token0/token1 ordering',
        },
        {
          name: 'tick-lower',
          type: OptionType.NUMBER,
          required: false,
          description:
            'Lower tick (optional; auto-computed from range-percent)',
        },
        {
          name: 'tick-upper',
          type: OptionType.NUMBER,
          required: false,
          description: 'Upper tick (optional)',
        },
        {
          name: 'range-percent',
          type: OptionType.NUMBER,
          required: false,
          default: 5,
          description: 'Symmetric ±% range (when ticks omitted)',
        },
        {
          name: 'slippage',
          short: 's',
          type: OptionType.NUMBER,
          required: false,
          default: 0.5,
          description: 'Slippage (%) for minimum token amounts',
        },
        {
          name: 'deadline',
          short: 'd',
          type: OptionType.NUMBER,
          required: false,
          default: 180,
          description: 'Deadline in seconds from now',
        },
        {
          name: 'gas',
          short: 'g',
          type: OptionType.NUMBER,
          required: false,
          default: 900000,
          description: 'Gas limit for the contract call',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager type (defaults to config)',
        },
      ],
      handler: saucerswapV2MintPosition,
      output: {
        schema: SaucerSwapV2MintPositionOutputSchema,
        humanTemplate: SAUCERSWAP_V2_MINT_POSITION_TEMPLATE,
      },
    },
    {
      name: 'increase-liquidity',
      summary: 'Add liquidity to an existing V2 position',
      description:
        'Add liquidity to an existing V2 position (NFT serial). Amounts are for on-chain token0 and token1 of the pool (resolved from the position). Use display units or raw with "t".',
      options: [
        {
          name: 'position',
          short: 'p',
          type: OptionType.NUMBER,
          required: true,
          description: 'LP position NFT serial (tokenId)',
        },
        {
          name: 'amount-a',
          type: OptionType.STRING,
          required: true,
          description:
            'Amount for pool token0 (display or raw "t" in token0 decimals)',
        },
        {
          name: 'amount-b',
          type: OptionType.STRING,
          required: true,
          description:
            'Amount for pool token1 (display or raw "t" in token1 decimals)',
        },
        {
          name: 'hbar-amount',
          type: OptionType.STRING,
          required: false,
          description:
            'Optional payable HBAR in tinybars: display HBAR or raw tinybars with "t" for WHBAR/HBAR-side adds',
        },
        {
          name: 'slippage',
          short: 's',
          type: OptionType.NUMBER,
          required: false,
          default: 0.5,
          description: 'Slippage (%) for minimum token amounts',
        },
        {
          name: 'deadline',
          short: 'd',
          type: OptionType.NUMBER,
          required: false,
          default: 180,
          description: 'Deadline in seconds from now',
        },
        {
          name: 'gas',
          short: 'g',
          type: OptionType.NUMBER,
          required: false,
          default: 330000,
          description: 'Gas limit for the contract call',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager type (defaults to config)',
        },
      ],
      handler: saucerswapV2IncreaseLiquidity,
      output: {
        schema: SaucerSwapV2IncreaseLiquidityOutputSchema,
        humanTemplate: SAUCERSWAP_V2_INCREASE_LIQUIDITY_TEMPLATE,
      },
    },
    {
      name: 'decrease-liquidity',
      summary: 'Remove liquidity from a V2 position',
      description:
        'Remove liquidity from a V2 position; optionally unwrap WHBAR and burn the NFT after full exit.',
      options: [
        {
          name: 'position',
          short: 'p',
          type: OptionType.NUMBER,
          required: true,
          description: 'NFT serial number',
        },
        {
          name: 'liquidity',
          short: 'l',
          type: OptionType.STRING,
          required: true,
          description: 'Liquidity amount or "all"',
        },
        {
          name: 'unwrap-hbar',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description: 'Unwrap WHBAR to HBAR',
        },
        {
          name: 'burn',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description: 'Burn NFT after full exit',
        },
        {
          name: 'slippage',
          short: 's',
          type: OptionType.NUMBER,
          required: false,
          default: 0.5,
          description: 'Slippage (%) if applicable to min amounts',
        },
        {
          name: 'deadline',
          short: 'd',
          type: OptionType.NUMBER,
          required: false,
          default: 180,
          description: 'Deadline in seconds from now',
        },
        {
          name: 'gas',
          short: 'g',
          type: OptionType.NUMBER,
          required: false,
          default: 300000,
          description: 'Gas limit for the contract call',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager type (defaults to config)',
        },
      ],
      handler: saucerswapV2DecreaseLiquidity,
      output: {
        schema: SaucerSwapV2DecreaseLiquidityOutputSchema,
        humanTemplate: SAUCERSWAP_V2_DECREASE_LIQUIDITY_TEMPLATE,
      },
    },
    {
      name: 'collect-fees',
      summary: 'Collect accrued swap fees from a V2 position',
      description:
        'Claim earned swap fees from an existing position without removing liquidity.',
      options: [
        {
          name: 'position',
          short: 'p',
          type: OptionType.NUMBER,
          required: true,
          description: 'NFT serial number',
        },
        {
          name: 'unwrap-hbar',
          type: OptionType.BOOLEAN,
          required: false,
          default: false,
          description: 'Unwrap WHBAR to HBAR',
        },
        {
          name: 'gas',
          short: 'g',
          type: OptionType.NUMBER,
          required: false,
          default: 300000,
          description: 'Gas limit for the contract call',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager type (defaults to config)',
        },
      ],
      handler: saucerswapV2CollectFees,
      output: {
        schema: SaucerSwapV2CollectFeesOutputSchema,
        humanTemplate: SAUCERSWAP_V2_COLLECT_FEES_TEMPLATE,
      },
    },
    {
      name: 'list-pools',
      summary: 'List SaucerSwap V2 pools',
      description: 'List V2 pools from the SaucerSwap REST API.',
      options: [
        {
          name: 'api-key',
          type: OptionType.STRING,
          required: true,
          description: 'SaucerSwap API key (sent as x-api-key header)',
        },
        {
          name: 'token',
          short: 't',
          type: OptionType.STRING,
          required: false,
          description:
            'Filter pools containing this token (ID, symbol, or name substring)',
        },
        {
          name: 'fee-tier',
          type: OptionType.NUMBER,
          required: false,
          description: 'Filter by fee tier',
        },
      ],
      handler: saucerswapV2ListPools,
      output: {
        schema: SaucerSwapV2ListPoolsOutputSchema,
        humanTemplate: SAUCERSWAP_V2_LIST_POOLS_TEMPLATE,
      },
    },
    {
      name: 'view-pool',
      summary: 'View details of a specific V2 pool',
      description:
        'Resolve pool on-chain (Factory.getPool) and enrich with SaucerSwap V2 REST API. Token references: ID, alias, EVM, or HBAR.',
      options: [
        {
          name: 'api-key',
          type: OptionType.STRING,
          required: true,
          description: 'SaucerSwap API key (sent as x-api-key header)',
        },
        {
          name: 'token-a',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'First token (Hedera ID, alias, EVM address, or "HBAR" / WHBAR id)',
        },
        {
          name: 'token-b',
          short: 'b',
          type: OptionType.STRING,
          required: true,
          description:
            'Second token (Hedera ID, alias, EVM address, or "HBAR" / WHBAR id)',
        },
        {
          name: 'fee-tier',
          type: OptionType.NUMBER,
          required: true,
          description: 'Fee tier',
        },
      ],
      handler: saucerswapV2ViewPool,
      output: {
        schema: SaucerSwapV2ViewPoolOutputSchema,
        humanTemplate: SAUCERSWAP_V2_VIEW_POOL_TEMPLATE,
      },
    },
    {
      name: 'list-positions',
      summary: 'List V2 concentrated liquidity positions for an account',
      description:
        'List SaucerSwap V2 NFT positions held by an account (defaults to operator).',
      options: [
        {
          name: 'api-key',
          type: OptionType.STRING,
          required: true,
          description: 'SaucerSwap API key (sent as x-api-key header)',
        },
        {
          name: 'account',
          short: 'a',
          type: OptionType.STRING,
          required: false,
          description:
            'Account ID, EVM address, or alias (defaults to current operator)',
        },
      ],
      handler: saucerswapV2ListPositions,
      output: {
        schema: SaucerSwapV2ListPositionsOutputSchema,
        humanTemplate: SAUCERSWAP_V2_LIST_POSITIONS_TEMPLATE,
      },
    },
  ],
};

export default saucerswapV2PluginManifest;
