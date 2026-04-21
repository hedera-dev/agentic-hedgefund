import {
  AliasNameSchema,
  EntityIdSchema,
  KeyManagerTypeSchema,
  KeyReferenceSchema,
  NetworkSchema,
  PublicKeyDefinitionSchema,
  TransactionIdSchema,
} from '@hiero-ledger/hiero-cli';
import { z } from 'zod';

/**
 * Token shape returned by the SaucerSwap V1 REST API.
 * Kept permissive (passthrough) so unexpected fields are not rejected.
 */
export const SaucerSwapV1ApiTokenSchema = z
  .object({
    id: z.string(),
    symbol: z.string(),
    name: z.string(),
    decimals: z.union([z.number(), z.string()]).transform((v) => Number(v)),
    priceUsd: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();

export type SaucerSwapV1ApiToken = z.infer<typeof SaucerSwapV1ApiTokenSchema>;

export const SaucerSwapV1ApiLpTokenSchema = z
  .object({
    id: z.string(),
    symbol: z.string().optional(),
    name: z.string().optional(),
    decimals: z
      .union([z.number(), z.string()])
      .transform((v) => Number(v))
      .optional(),
    priceUsd: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();

export type SaucerSwapV1ApiLpToken = z.infer<
  typeof SaucerSwapV1ApiLpTokenSchema
>;

export const SaucerSwapV1ApiLiquidityPoolSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    contractId: z.string(),
    tokenA: SaucerSwapV1ApiTokenSchema,
    tokenB: SaucerSwapV1ApiTokenSchema,
    tokenReserveA: z.string(),
    tokenReserveB: z.string(),
    lpToken: SaucerSwapV1ApiLpTokenSchema.optional(),
  })
  .passthrough();

export type SaucerSwapV1ApiLiquidityPool = z.infer<
  typeof SaucerSwapV1ApiLiquidityPoolSchema
>;

export const SaucerSwapV1ApiLiquidityPoolArraySchema = z.array(
  SaucerSwapV1ApiLiquidityPoolSchema,
);

/**
 * SaucerSwap V2 API schemas (concentrated liquidity).
 */
export const SaucerSwapV2ApiTokenSchema = z
  .object({
    id: z.string(),
    symbol: z.string(),
    name: z.string(),
    decimals: z.union([z.number(), z.string()]).transform((v) => Number(v)),
    priceUsd: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();

export type SaucerSwapV2ApiToken = z.infer<typeof SaucerSwapV2ApiTokenSchema>;

export const SaucerSwapV2ApiPoolSchema = z
  .object({
    contractId: z.string(),
    tokenA: SaucerSwapV2ApiTokenSchema,
    tokenB: SaucerSwapV2ApiTokenSchema,
    fee: z.union([z.number(), z.string()]).transform((v) => Number(v)),
    liquidity: z.string().optional(),
    sqrtRatioX96: z.string().optional(),
    tickCurrent: z
      .union([z.number(), z.string()])
      .transform((v) => Number(v))
      .optional(),
  })
  .passthrough();

export type SaucerSwapV2ApiPool = z.infer<typeof SaucerSwapV2ApiPoolSchema>;

export const SaucerSwapV2ApiPoolArraySchema = z.array(
  SaucerSwapV2ApiPoolSchema,
);

export const SaucerSwapV2ApiPositionSchema = z
  .object({
    tokenSN: z.union([z.number(), z.string()]).transform((v) => Number(v)),
    token0: SaucerSwapV2ApiTokenSchema.optional(),
    token1: SaucerSwapV2ApiTokenSchema.optional(),
    fee: z
      .union([z.number(), z.string()])
      .transform((v) => Number(v))
      .optional(),
    tickLower: z
      .union([z.number(), z.string()])
      .transform((v) => Number(v))
      .optional(),
    tickUpper: z
      .union([z.number(), z.string()])
      .transform((v) => Number(v))
      .optional(),
    liquidity: z.string().optional(),
    feeGrowthInside0LastX128: z.string().optional(),
    feeGrowthInside1LastX128: z.string().optional(),
    tokensOwed0: z.string().optional(),
    tokensOwed1: z.string().optional(),
  })
  .passthrough();

export type SaucerSwapV2ApiPosition = z.infer<
  typeof SaucerSwapV2ApiPositionSchema
>;

export const SaucerSwapV2ApiPositionArraySchema = z.array(
  SaucerSwapV2ApiPositionSchema,
);

export const SlippageTolerancePercentSchema = z
  .number()
  .min(0)
  .max(100)
  .optional()
  .default(0.5)
  .describe('Slippage tolerance (%)');

export const DeadlineSchema = z
  .number()
  .int()
  .positive()
  .optional()
  .default(180)
  .describe('Deadline in seconds from current time');

export const ScheduledTransactionDataSchema = z.object({
  name: AliasNameSchema,
  scheduledId: EntityIdSchema.optional(),
  network: NetworkSchema,
  keyManager: KeyManagerTypeSchema,
  adminKeyRefId: KeyReferenceSchema.optional(),
  adminPublicKey: PublicKeyDefinitionSchema.optional(),
  payerAccountId: EntityIdSchema.optional(),
  payerKeyRefId: KeyReferenceSchema.optional(),
  memo: z.string().max(100).optional(),
  expirationTime: z.string().optional(),
  waitForExpiry: z.boolean().default(false),
  scheduled: z.boolean().default(false),
  executed: z.boolean().default(false),
  command: z
    .string()
    .min(1)
    .optional()
    .describe('Name of the command entry point'),
  normalizedParams: z
    .record(z.string(), z.unknown())
    .default({})
    .optional()
    .describe(
      'Normalized params from the command that produced this transaction',
    ),
  transactionId: TransactionIdSchema.optional().describe(
    'Inner transaction ID',
  ),
  createdAt: z.string().optional(),
});
