import { z } from 'zod';

export const MarketTokenReferenceSchema = z
  .string()
  .trim()
  .min(1)
  .describe('Token ID or EVM address');

export const MarketSearchQuerySchema = z
  .string()
  .trim()
  .min(1)
  .describe('Token symbol, name, or address');

export const PositiveUsdAmountSchema = z.coerce
  .number()
  .positive()
  .describe('Amount in USD');

export const NonNegativeUsdAmountSchema = z.coerce
  .number()
  .nonnegative()
  .describe('Amount in USD');

export const PositiveIntegerLimitSchema = z.coerce
  .number()
  .int()
  .positive()
  .describe('Result limit');
