#!/usr/bin/env node
// price-impact.mjs
//
// Uniswap V2 constant-product pool math with the SaucerSwap V1 fee (0.30 %).
// Reserves and amounts are base-unit integers (strings).
//
// Reads a JSON object from stdin. Two modes:
//
//   { mode: "exactIn",  reserveIn, reserveOut, amountIn  }
//   { mode: "exactOut", reserveIn, reserveOut, amountOut }
//
// Writes a JSON object to stdout:
//
//   exactIn:  { amountOut, spotPrice, effectivePrice, impactPercent }
//   exactOut: { amountIn,  spotPrice, effectivePrice, impactPercent }
//
// `spotPrice` is reserveOut / reserveIn (base units, no fee).
// `effectivePrice` is the realised rate for the trade (amountOut/amountIn or
// amountIn/amountOut inverted to match the direction of spot). `impactPercent`
// is `(spotPrice - effectivePrice) / spotPrice * 100` expressed as a decimal
// string with 4 fractional digits.

import { readFileSync } from 'node:fs';

const FEE_NUM = 997n;
const FEE_DEN = 1000n;
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

function formatFixed(num, den, fractionDigits = 18) {
  if (den === 0n) throw new Error('division by zero');
  const scale = 10n ** BigInt(fractionDigits);
  const scaled = (num * scale) / den;
  const s = scaled.toString().padStart(fractionDigits + 1, '0');
  const intPart = s.slice(0, s.length - fractionDigits);
  const fracPart = s.slice(s.length - fractionDigits).replace(/0+$/, '');
  return fracPart ? `${intPart}.${fracPart}` : intPart;
}

function getAmountOut(amountIn, reserveIn, reserveOut) {
  const amountInWithFee = amountIn * FEE_NUM;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * FEE_DEN + amountInWithFee;
  return numerator / denominator;
}

function getAmountIn(amountOut, reserveIn, reserveOut) {
  if (amountOut >= reserveOut) {
    throw new Error('amountOut exceeds pool reserveOut');
  }
  const numerator = reserveIn * amountOut * FEE_DEN;
  const denominator = (reserveOut - amountOut) * FEE_NUM;
  return numerator / denominator + 1n;
}

function computeImpact(spotNum, spotDen, effNum, effDen) {
  // impact% = (spot - eff) / spot * 100
  // spot = spotNum/spotDen, eff = effNum/effDen
  // impact% = 100 * (spotNum * effDen - effNum * spotDen) / (spotNum * effDen)
  const num = spotNum * effDen - effNum * spotDen;
  const den = spotNum * effDen;
  if (den === 0n) return '0';
  // scale by 100 for percent, output with 4 fractional digits
  return formatFixed(num * 100n, den, 4);
}

function main() {
  const raw = readFileSync(0, 'utf8');
  const input = JSON.parse(raw);
  const mode = input.mode;
  const reserveIn = toBigInt(input.reserveIn, 'reserveIn');
  const reserveOut = toBigInt(input.reserveOut, 'reserveOut');
  if (reserveIn === 0n || reserveOut === 0n) throw new Error('reserves must be non-zero');

  // Spot price (output per input), no fee
  const spotPrice = formatFixed(reserveOut, reserveIn);

  if (mode === 'exactIn') {
    const amountIn = toBigInt(input.amountIn, 'amountIn');
    if (amountIn === 0n) throw new Error('amountIn must be positive');
    const amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
    const effectivePrice = formatFixed(amountOut, amountIn);
    const impactPercent = computeImpact(reserveOut, reserveIn, amountOut, amountIn);
    process.stdout.write(JSON.stringify({
      amountOut: amountOut.toString(),
      spotPrice,
      effectivePrice,
      impactPercent,
    }) + '\n');
    return;
  }

  if (mode === 'exactOut') {
    const amountOut = toBigInt(input.amountOut, 'amountOut');
    if (amountOut === 0n) throw new Error('amountOut must be positive');
    const amountIn = getAmountIn(amountOut, reserveIn, reserveOut);
    const effectivePrice = formatFixed(amountOut, amountIn);
    const impactPercent = computeImpact(reserveOut, reserveIn, amountOut, amountIn);
    process.stdout.write(JSON.stringify({
      amountIn: amountIn.toString(),
      spotPrice,
      effectivePrice,
      impactPercent,
    }) + '\n');
    return;
  }

  throw new Error(`unknown mode "${mode}" (expected "exactIn" or "exactOut")`);
}

try {
  main();
} catch (err) {
  process.stderr.write(`price-impact: ${err.message}\n`);
  process.exit(1);
}
