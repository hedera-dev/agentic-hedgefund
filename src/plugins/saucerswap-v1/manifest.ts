import type { PluginManifest } from '@hiero-ledger/hiero-cli';

import { OptionType } from '@hiero-ledger/hiero-cli';

import {
  SAUCERSWAP_V1_BUY_TEMPLATE,
  saucerswapV1Buy,
  SaucerSwapV1BuyOutputSchema,
} from './commands/buy';
import {
  SAUCERSWAP_V1_DEPOSIT_TEMPLATE,
  saucerswapV1Deposit,
  SaucerSwapV1DepositOutputSchema,
} from './commands/deposit';
import {
  SAUCERSWAP_V1_LIST_TEMPLATE,
  saucerswapV1List,
  SaucerSwapV1ListOutputSchema,
} from './commands/list';
import {
  SAUCERSWAP_V1_SWAP_TEMPLATE,
  saucerswapV1Swap,
  SaucerSwapV1SwapOutputSchema,
} from './commands/swap';
import {
  SAUCERSWAP_V1_VIEW_TEMPLATE,
  saucerswapV1View,
  SaucerSwapV1ViewOutputSchema,
} from './commands/view';
import {
  SAUCERSWAP_V1_WITHDRAW_TEMPLATE,
  saucerswapV1Withdraw,
  SaucerSwapV1WithdrawOutputSchema,
} from './commands/withdraw';

export const saucerswapV1PluginManifest: PluginManifest = {
  name: 'saucerswap-v1',
  version: '0.1.0',
  displayName: 'SaucerSwap V1 DEX Plugin',
  description:
    'Interact with the SaucerSwap V1 (Uniswap V2-style) DEX on Hedera.',
  commands: [
    {
      name: 'deposit',
      summary: 'Add liquidity to an existing V1 pool',
      description:
        'Add liquidity to an existing SaucerSwap V1 pool. Routes HBAR/token or token/token from token references (ID, alias, EVM address, or HBAR). Amounts support display units or raw base units with a "t" suffix.',
      options: [
        {
          name: 'token-a',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description: 'First token (Hedera ID, alias, EVM address, or "HBAR")',
        },
        {
          name: 'token-b',
          short: 'b',
          type: OptionType.STRING,
          required: true,
          description:
            'Second token (Hedera ID, alias, EVM address, or "HBAR")',
        },
        {
          name: 'amount-a',
          type: OptionType.STRING,
          required: true,
          description:
            'Desired amount of token A (display units or base units with "t" suffix)',
        },
        {
          name: 'amount-b',
          type: OptionType.STRING,
          required: true,
          description:
            'Desired amount of token B (display units or base units with "t" suffix)',
        },
        {
          name: 'slippage',
          short: 's',
          type: OptionType.NUMBER,
          required: false,
          default: 0.5,
          description: 'Slippage tolerance (%)',
        },
        {
          name: 'deadline',
          short: 'd',
          type: OptionType.NUMBER,
          required: false,
          default: 180,
          description: 'Deadline in seconds from current time',
        },
        {
          name: 'gas',
          short: 'g',
          type: OptionType.NUMBER,
          required: false,
          default: 1_000_000,
          description: 'Gas limit',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager type (defaults to config setting)',
        },
      ],
      handler: saucerswapV1Deposit,
      output: {
        schema: SaucerSwapV1DepositOutputSchema,
        humanTemplate: SAUCERSWAP_V1_DEPOSIT_TEMPLATE,
      },
    },
    {
      name: 'withdraw',
      summary: 'Remove liquidity from a V1 pool',
      description:
        'Remove liquidity from an existing SaucerSwap V1 pool. Token arguments are Hedera entity references. LP amount: display units assume 8 decimals for the pair LP token unless you use a "t" suffix for raw units.',
      options: [
        {
          name: 'token-a',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description: 'First token (Hedera ID, alias, EVM address, or "HBAR")',
        },
        {
          name: 'token-b',
          short: 'b',
          type: OptionType.STRING,
          required: true,
          description:
            'Second token (Hedera ID, alias, EVM address, or "HBAR")',
        },
        {
          name: 'liquidity',
          short: 'l',
          type: OptionType.STRING,
          required: true,
          description:
            'LP amount to remove (display uses 8 decimals, or raw with "t" suffix)',
        },
        {
          name: 'min-amount-a',
          type: OptionType.STRING,
          required: false,
          description:
            'Minimum token A returned (display units or base units with "t" suffix)',
        },
        {
          name: 'min-amount-b',
          type: OptionType.STRING,
          required: false,
          description:
            'Minimum token B returned (display units or base units with "t" suffix)',
        },
        {
          name: 'deadline',
          short: 'd',
          type: OptionType.NUMBER,
          required: false,
          default: 180,
          description: 'Deadline in seconds from current time',
        },
        {
          name: 'gas',
          short: 'g',
          type: OptionType.NUMBER,
          required: false,
          default: 2_800_000,
          description: 'Gas limit',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager type (defaults to config setting)',
        },
      ],
      handler: saucerswapV1Withdraw,
      output: {
        schema: SaucerSwapV1WithdrawOutputSchema,
        humanTemplate: SAUCERSWAP_V1_WITHDRAW_TEMPLATE,
      },
    },
    {
      name: 'swap',
      summary: 'Swap exact input for at least a minimum output',
      description:
        'Swap an exact amount of one token for at least a minimum amount of another, routing HBAR via WHBAR automatically. Token arguments are resolved as Hedera entity references (ID, alias, EVM address, or HBAR).',
      options: [
        {
          name: 'from',
          short: 'f',
          type: OptionType.STRING,
          required: true,
          description: 'Input token (Hedera ID, alias, EVM address, or "HBAR")',
        },
        {
          name: 'to',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description:
            'Output token (Hedera ID, alias, EVM address, or "HBAR")',
        },
        {
          name: 'amount',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'Exact input amount (display units or base units with "t" suffix)',
        },
        {
          name: 'min-output',
          short: 'm',
          type: OptionType.STRING,
          required: false,
          description:
            'Minimum output amount (display units or base units with "t" suffix); overrides slippage when set',
        },
        {
          name: 'slippage',
          short: 's',
          type: OptionType.NUMBER,
          required: false,
          default: 0.5,
          description: 'Slippage tolerance (%)',
        },
        {
          name: 'deadline',
          short: 'd',
          type: OptionType.NUMBER,
          required: false,
          default: 180,
          description: 'Deadline in seconds from current time',
        },
        {
          name: 'gas',
          short: 'g',
          type: OptionType.NUMBER,
          required: false,
          default: 1_000_000,
          description: 'Gas limit',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager type (defaults to config setting)',
        },
      ],
      handler: saucerswapV1Swap,
      output: {
        schema: SaucerSwapV1SwapOutputSchema,
        humanTemplate: SAUCERSWAP_V1_SWAP_TEMPLATE,
      },
    },
    {
      name: 'buy',
      summary: 'Swap up to a maximum input for exact output',
      description:
        'Buy a specific amount of an output token. Optionally cap input with --max-input; if omitted, the max input is derived via getAmountsIn on the router with your slippage tolerance. Token arguments are Hedera entity references (ID, alias, EVM address, or HBAR).',
      options: [
        {
          name: 'from',
          short: 'f',
          type: OptionType.STRING,
          required: true,
          description: 'Input token (Hedera ID, alias, EVM address, or "HBAR")',
        },
        {
          name: 'to',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description:
            'Output token (Hedera ID, alias, EVM address, or "HBAR")',
        },
        {
          name: 'amount',
          short: 'a',
          type: OptionType.STRING,
          required: true,
          description:
            'Exact output amount (display units or base units with "t" suffix)',
        },
        {
          name: 'max-input',
          short: 'm',
          type: OptionType.STRING,
          required: false,
          description:
            'Maximum input willing to spend (display or base units with "t" suffix). When omitted, computed via getAmountsIn with slippage tolerance.',
        },
        {
          name: 'slippage',
          short: 's',
          type: OptionType.NUMBER,
          required: false,
          default: 0,
          description: 'Slippage tolerance (%)',
        },
        {
          name: 'deadline',
          short: 'd',
          type: OptionType.NUMBER,
          required: false,
          default: 180,
          description: 'Deadline in seconds from current time',
        },
        {
          name: 'gas',
          short: 'g',
          type: OptionType.NUMBER,
          required: false,
          default: 1_000_000,
          description: 'Gas limit',
        },
        {
          name: 'key-manager',
          short: 'k',
          type: OptionType.STRING,
          required: false,
          description: 'Key manager type (defaults to config setting)',
        },
      ],
      handler: saucerswapV1Buy,
      output: {
        schema: SaucerSwapV1BuyOutputSchema,
        humanTemplate: SAUCERSWAP_V1_BUY_TEMPLATE,
      },
    },
    {
      name: 'list',
      summary: 'List SaucerSwap V1 pools',
      description:
        'List pools from the SaucerSwap V1 REST API, optionally filtered by token ID, symbol, or name.',
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
      ],
      handler: saucerswapV1List,
      output: {
        schema: SaucerSwapV1ListOutputSchema,
        humanTemplate: SAUCERSWAP_V1_LIST_TEMPLATE,
      },
    },
    {
      name: 'view',
      summary: 'Show details of a specific V1 pool',
      description:
        'Load pool data for a token pair from the SaucerSwap V1 REST API (reserves, contract id, LP token id if listed).',
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
          description: 'First token (Hedera ID, alias, EVM address, or "HBAR")',
        },
        {
          name: 'token-b',
          short: 'b',
          type: OptionType.STRING,
          required: true,
          description:
            'Second token (Hedera ID, alias, EVM address, or "HBAR")',
        },
      ],
      handler: saucerswapV1View,
      output: {
        schema: SaucerSwapV1ViewOutputSchema,
        humanTemplate: SAUCERSWAP_V1_VIEW_TEMPLATE,
      },
    },
  ],
};

export default saucerswapV1PluginManifest;
