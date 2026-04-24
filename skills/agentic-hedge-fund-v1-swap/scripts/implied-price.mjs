#!/usr/bin/env node
// implied-price.mjs
//
// Reads a JSON object from stdin:
//   { reserveA, reserveB, decimalsA, decimalsB }
// where reserves are base-unit integers (strings or numbers) and decimals are integers.
//
// Writes a JSON object to stdout:
//   { priceAinB, priceBinA }
// as decimal strings with up to 18 fractional digits.

import { readFileSync } from 'node:fs';

const PRECISION = 18n;
const SCALE = 10n ** PRECISION;

function toBigInt(value, field) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
      throw new Error(`${field} must be a non-negative integer`);
    }
    return BigInt(value);
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value);
  throw new Error(`${field} must be a non-negative integer (got ${JSON.stringify(value)})`);
}

function formatFixed(scaledNumerator, denominator) {
  if (denominator === 0n) {
    throw new Error('division by zero (empty reserve)');
  }
  const scaled = (scaledNumerator * SCALE) / denominator;
  const s = scaled.toString().padStart(Number(PRECISION) + 1, '0');
  const intPart = s.slice(0, s.length - Number(PRECISION));
  const fracPart = s.slice(s.length - Number(PRECISION)).replace(/0+$/, '');
  return fracPart ? `${intPart}.${fracPart}` : intPart;
}

function main() {
  const raw = readFileSync(0, 'utf8');
  const input = JSON.parse(raw);

  const reserveA = toBigInt(input.reserveA, 'reserveA');
  const reserveB = toBigInt(input.reserveB, 'reserveB');
  const decimalsA = Number(input.decimalsA);
  const decimalsB = Number(input.decimalsB);
  if (!Number.isInteger(decimalsA) || decimalsA < 0) throw new Error('decimalsA must be a non-negative integer');
  if (!Number.isInteger(decimalsB) || decimalsB < 0) throw new Error('decimalsB must be a non-negative integer');

  const scaleA = 10n ** BigInt(decimalsA);
  const scaleB = 10n ** BigInt(decimalsB);

  // priceAinB = (reserveB / 10^decB) / (reserveA / 10^decA)
  //           = (reserveB * 10^decA) / (reserveA * 10^decB)
  const priceAinB = formatFixed(reserveB * scaleA, reserveA * scaleB);
  const priceBinA = formatFixed(reserveA * scaleB, reserveB * scaleA);

  process.stdout.write(JSON.stringify({ priceAinB, priceBinA }) + '\n');
}

try {
  main();
} catch (err) {
  process.stderr.write(`implied-price: ${err.message}\n`);
  process.exit(1);
}
