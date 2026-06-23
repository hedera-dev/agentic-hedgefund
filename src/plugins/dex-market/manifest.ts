import type { PluginManifest } from '@hiero-ledger/hiero-cli';

import { OptionType } from '@hiero-ledger/hiero-cli';

import {
  MARKET_LIQUIDITY_TEMPLATE,
  marketLiquidity,
  MarketLiquidityOutputSchema,
} from './commands/liquidity';
import {
  MARKET_PAIR_TEMPLATE,
  marketPair,
  MarketPairOutputSchema,
} from './commands/pair';
import {
  MARKET_POOLS_TEMPLATE,
  marketPools,
  MarketPoolsOutputSchema,
} from './commands/pools';
import {
  MARKET_PRICE_TEMPLATE,
  marketPrice,
  MarketPriceOutputSchema,
} from './commands/price';
import {
  MARKET_QUOTE_TEMPLATE,
  marketQuote,
  MarketQuoteOutputSchema,
} from './commands/quote';
import {
  MARKET_SEARCH_TEMPLATE,
  marketSearch,
  MarketSearchOutputSchema,
} from './commands/search';
import {
  DEFAULT_POOLS_LIMIT,
  DEFAULT_SEARCH_LIMIT,
  DEX_SCREENER_MAX_BATCH,
} from './services/constants';

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
      description: `Fetches current prices and top pair data from DexScreener for up to ${DEX_SCREENER_MAX_BATCH} tokens.`,
      options: [
        {
          name: 'token',
          short: 't',
          type: OptionType.REPEATABLE,
          required: true,
          description: `Token ID or EVM address (repeatable, max ${DEX_SCREENER_MAX_BATCH})`,
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
          name: 'limit',
          short: 'l',
          type: OptionType.NUMBER,
          required: false,
          description: `Maximum pools to return (default: ${DEFAULT_POOLS_LIMIT})`,
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
          name: 'limit',
          short: 'l',
          type: OptionType.NUMBER,
          required: false,
          description: `Maximum results to return (default: ${DEFAULT_SEARCH_LIMIT})`,
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
