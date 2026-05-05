import type { PluginManifest } from '@hiero-ledger/hiero-cli';
import { OptionType } from '@hiero-ledger/hiero-cli';

import {
  marketLiquidity,
  MarketLiquidityOutputSchema,
  MARKET_LIQUIDITY_TEMPLATE,
} from './commands/liquidity';
import {
  marketPair,
  MarketPairOutputSchema,
  MARKET_PAIR_TEMPLATE,
} from './commands/pair';
import {
  marketPools,
  MarketPoolsOutputSchema,
  MARKET_POOLS_TEMPLATE,
} from './commands/pools';
import {
  marketPrice,
  MarketPriceOutputSchema,
  MARKET_PRICE_TEMPLATE,
} from './commands/price';
import {
  marketQuote,
  MarketQuoteOutputSchema,
  MARKET_QUOTE_TEMPLATE,
} from './commands/quote';
import {
  marketSearch,
  MarketSearchOutputSchema,
  MARKET_SEARCH_TEMPLATE,
} from './commands/search';

export const dexMarketPluginManifest: PluginManifest = {
  name: 'dex-market',
  version: '1.0.0',
  displayName: 'Dex Market Plugin',
  description:
    'Market data (prices, liquidity, pools) for Hedera tokens via DexScreener.',
  commands: [
    {
      name: 'price',
      summary: 'Get current price(s) for one or more tokens',
      description:
        'Fetches current prices and top pair data from DexScreener for up to 30 tokens.',
      options: [
        {
          name: 'tokens',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description: 'Comma-separated token IDs/addresses (max 30)',
        },
      ],
      handler: marketPrice,
      output: {
        schema: MarketPriceOutputSchema,
        humanTemplate: MARKET_PRICE_TEMPLATE,
      },
    },
    {
      name: 'pools',
      summary: 'List liquidity pools for a token',
      description:
        'Lists all DEX pools for a given token, sorted by liquidity.',
      options: [
        {
          name: 'token',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description: 'Token ID 0.0.x or EVM 0x...',
        },
        {
          name: 'all',
          short: 'a',
          type: OptionType.BOOLEAN,
          required: false,
          description: 'Show all pools (no limit)',
        },
      ],
      handler: marketPools,
      output: {
        schema: MarketPoolsOutputSchema,
        humanTemplate: MARKET_POOLS_TEMPLATE,
      },
    },
    {
      name: 'pair',
      summary: 'Get detailed data for a specific pair',
      description: 'Fetches full pair information by pair contract address.',
      options: [
        {
          name: 'pair',
          short: 'p',
          type: OptionType.STRING,
          required: true,
          description: 'Pair contract EVM address',
        },
      ],
      handler: marketPair,
      output: {
        schema: MarketPairOutputSchema,
        humanTemplate: MARKET_PAIR_TEMPLATE,
      },
    },
    {
      name: 'search',
      summary: 'Search for tokens/pairs',
      description:
        'Searches DexScreener by symbol, name, or address (Hedera only).',
      options: [
        {
          name: 'query',
          short: 'q',
          type: OptionType.STRING,
          required: true,
          description: 'Search query',
        },
        {
          name: 'all',
          short: 'a',
          type: OptionType.BOOLEAN,
          required: false,
          description: 'Show all results (no limit)',
        },
      ],
      handler: marketSearch,
      output: {
        schema: MarketSearchOutputSchema,
        humanTemplate: MARKET_SEARCH_TEMPLATE,
      },
    },
    {
      name: 'liquidity',
      summary: 'Check token liquidity health',
      description:
        'Aggregates liquidity across all pools and checks against a threshold.',
      options: [
        {
          name: 'token',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description: 'Token ID or EVM address',
        },
        {
          name: 'min-usd',
          short: 'm',
          type: OptionType.NUMBER,
          required: false,
          description: 'Minimum liquidity threshold in USD (default: 10000)',
        },
      ],
      handler: marketLiquidity,
      output: {
        schema: MarketLiquidityOutputSchema,
        humanTemplate: MARKET_LIQUIDITY_TEMPLATE,
      },
    },
    {
      name: 'quote',
      summary: 'Estimate slippage for a trade size',
      description: 'Estimates slippage using constant-product approximation.',
      options: [
        {
          name: 'token',
          short: 't',
          type: OptionType.STRING,
          required: true,
          description: 'Token ID or EVM address',
        },
        {
          name: 'size',
          short: 's',
          type: OptionType.NUMBER,
          required: true,
          description: 'Position size in USD',
        },
      ],
      handler: marketQuote,
      output: {
        schema: MarketQuoteOutputSchema,
        humanTemplate: MARKET_QUOTE_TEMPLATE,
      },
    },
  ],
};
