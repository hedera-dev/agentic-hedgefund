#!/usr/bin/env node
// implied-price.mjs
//
// Reads a JSON object from stdin. Two modes, auto-detected by the fields present:
//
//   V1 (constant-product):
//     { reserveA, reserveB, decimalsA, decimalsB }
//     reserves are base-unit integers (strings or numbers).
//
//   V2 (concentrated liquidity):
//     { sqrtRatioX96, decimalsA, decimalsB }
//     sqrtRatioX96 is the pool's Q64.96 square-root price as a decimal string.
//     A = pool's token0 (lower EVM address, as returned by saucerswap-v2 view-pool).
//     B = pool's token1.
//
// Writes a JSON object to stdout:
//   { priceAinB, priceBinA }
// as decimal strings with up to 18 fractional digits.

import { readFileSync } from 'node:fs';

const PRECISION = 18n;
const SCALE = 10n ** PRECISION;
const Q192 = 2n ** 192n;

function toBigInt(value, field) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
      throw new Error(`${field} must be a non-negative integer`);
    }
    return BigInt(value);
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);
  throw new Error(
    `${field} must be a non-negative integer (got ${JSON.stringify(value)})`,
  );
}

function formatFixed(numerator, denominator) {
  if (denominator === 0n) {
    throw new Error('division by zero (empty pool)');
  }
  const scaled = (numerator * SCALE) / denominator;
  const s = scaled.toString().padStart(Number(PRECISION) + 1, '0');
  const intPart = s.slice(0, s.length - Number(PRECISION));
  const fracPart = s.slice(s.length - Number(PRECISION)).replace(/0+$/, '');
  return fracPart ? `${intPart}.${fracPart}` : intPart;
}

function priceFromReserves(input) {
  const reserveA = toBigInt(input.reserveA, 'reserveA');
  const reserveB = toBigInt(input.reserveB, 'reserveB');
  const decimalsA = Number(input.decimalsA);
  const decimalsB = Number(input.decimalsB);
  if (!Number.isInteger(decimalsA) || decimalsA < 0)
    throw new Error('decimalsA must be a non-negative integer');
  if (!Number.isInteger(decimalsB) || decimalsB < 0)
    throw new Error('decimalsB must be a non-negative integer');

  const scaleA = 10n ** BigInt(decimalsA);
  const scaleB = 10n ** BigInt(decimalsB);

  // priceAinB = (reserveB / 10^dB) / (reserveA / 10^dA)
  //           = (reserveB * 10^dA) / (reserveA * 10^dB)
  const priceAinB = formatFixed(reserveB * scaleA, reserveA * scaleB);
  const priceBinA = formatFixed(reserveA * scaleB, reserveB * scaleA);
  return { priceAinB, priceBinA };
}

function priceFromSqrtRatioX96(input) {
  // sqrtRatioX96 = sqrt(token1_base / token0_base) * 2^96
  // price_token0_in_token1_base = sqrtRatioX96^2 / 2^192
  // price_token0_in_token1_display = (sqrtRatioX96^2 / 2^192) * (10^dA / 10^dB)
  //   where dA = decimals of token0, dB = decimals of token1
  const sqrtRatioX96 = toBigInt(input.sqrtRatioX96, 'sqrtRatioX96');
  const decimalsA = Number(input.decimalsA);
  const decimalsB = Number(input.decimalsB);
  if (!Number.isInteger(decimalsA) || decimalsA < 0)
    throw new Error('decimalsA must be a non-negative integer');
  if (!Number.isInteger(decimalsB) || decimalsB < 0)
    throw new Error('decimalsB must be a non-negative integer');

  const scaleA = 10n ** BigInt(decimalsA);
  const scaleB = 10n ** BigInt(decimalsB);
  const sqrtSq = sqrtRatioX96 * sqrtRatioX96;

  // priceAinB = sqrtRatioX96^2 * 10^dA / (2^192 * 10^dB)
  const priceAinB = formatFixed(sqrtSq * scaleA, Q192 * scaleB);
  // priceBinA = 2^192 * 10^dB / (sqrtRatioX96^2 * 10^dA)
  const priceBinA = formatFixed(Q192 * scaleB, sqrtSq * scaleA);
  return { priceAinB, priceBinA };
}

function main() {
  const raw = readFileSync(0, 'utf8');
  const input = JSON.parse(raw);

  const result =
    input.sqrtRatioX96 !== undefined
      ? priceFromSqrtRatioX96(input)
      : priceFromReserves(input);

  process.stdout.write(JSON.stringify(result) + '\n');
}

try {
  main();
} catch (err) {
  process.stderr.write(`implied-price: ${err.message}\n`);
  process.exit(1);
}
