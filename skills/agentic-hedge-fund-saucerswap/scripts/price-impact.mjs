#!/usr/bin/env node
// price-impact.mjs
//
// Reads a JSON object from stdin. Two pool types, auto-detected by the fields present:
//
// ── V1 (constant-product, SaucerSwap V1 fee = 0.30%) ──────────────────────────
//   { mode: "exactIn",  reserveIn, reserveOut, amountIn  }
//   { mode: "exactOut", reserveIn, reserveOut, amountOut }
//
// ── V2 (concentrated liquidity, fee tier from feeTier param) ──────────────────
//   { mode: "exactIn",  sqrtRatioX96, liquidity, feeTier, direction, amountIn  }
//   { mode: "exactOut", sqrtRatioX96, liquidity, feeTier, direction, amountOut }
//
//   direction: "aToB" | "bToA"
//     "aToB" — selling token0 (pool's lower-address token) to buy token1.
//     "bToA" — selling token1 to buy token0.
//   The virtual reserves are derived from sqrtRatioX96 and liquidity.
//   V2 uses feeTier/1_000_000 as the fee fraction (e.g. 3000 → 0.30%).
//
// All reserves and amounts are base-unit integers (strings or numbers).
//
// Writes a JSON object to stdout:
//   exactIn:  { amountOut, spotPrice, effectivePrice, impactPercent }
//   exactOut: { amountIn,  spotPrice, effectivePrice, impactPercent }
//
// `spotPrice`      = reserveOut / reserveIn (no fee, base units).
// `effectivePrice` = realised output/input rate.
// `impactPercent`  = (spotPrice - effectivePrice) / spotPrice * 100,
//                    as a decimal string with 4 fractional digits.

import { readFileSync } from 'node:fs';

const PRECISION = 18n;
const SCALE = 10n ** PRECISION;
const Q96 = 2n ** 96n;

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

function computeImpact(spotNum, spotDen, effNum, effDen) {
  // impact% = (spot - eff) / spot * 100
  // = 100 * (spotNum * effDen - effNum * spotDen) / (spotNum * effDen)
  const num = spotNum * effDen - effNum * spotDen;
  const den = spotNum * effDen;
  if (den === 0n) return '0';
  return formatFixed(num * 100n, den, 4);
}

function getAmountOut(amountIn, reserveIn, reserveOut, feeNum, feeDen) {
  const amountInWithFee = amountIn * feeNum;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * feeDen + amountInWithFee;
  return numerator / denominator;
}

function getAmountIn(amountOut, reserveIn, reserveOut, feeNum, feeDen) {
  if (amountOut >= reserveOut) {
    throw new Error('amountOut exceeds pool virtual liquidity');
  }
  const numerator = reserveIn * amountOut * feeDen;
  const denominator = (reserveOut - amountOut) * feeNum;
  return numerator / denominator + 1n;
}

// Derive virtual reserves from sqrtRatioX96 + liquidity.
// direction "aToB": selling token0, so reserveIn = virtual token0, reserveOut = virtual token1.
// direction "bToA": selling token1, so reserveIn = virtual token1, reserveOut = virtual token0.
function virtualReserves(sqrtRatioX96, liquidity, direction) {
  // virtualReserve0 = L * 2^96 / sqrtP
  // virtualReserve1 = L * sqrtP / 2^96
  if (sqrtRatioX96 === 0n) throw new Error('sqrtRatioX96 must be non-zero');
  const r0 = (liquidity * Q96) / sqrtRatioX96;
  const r1 = (liquidity * sqrtRatioX96) / Q96;
  if (direction === 'aToB') return { reserveIn: r0, reserveOut: r1 };
  if (direction === 'bToA') return { reserveIn: r1, reserveOut: r0 };
  throw new Error(`direction must be "aToB" or "bToA" (got ${JSON.stringify(direction)})`);
}

function runV1(input, mode) {
  const reserveIn = toBigInt(input.reserveIn, 'reserveIn');
  const reserveOut = toBigInt(input.reserveOut, 'reserveOut');
  if (reserveIn === 0n || reserveOut === 0n) throw new Error('reserves must be non-zero');

  const feeNum = 997n;
  const feeDen = 1000n;
  const spotPrice = formatFixed(reserveOut, reserveIn);

  if (mode === 'exactIn') {
    const amountIn = toBigInt(input.amountIn, 'amountIn');
    if (amountIn === 0n) throw new Error('amountIn must be positive');
    const amountOut = getAmountOut(amountIn, reserveIn, reserveOut, feeNum, feeDen);
    return {
      amountOut: amountOut.toString(),
      spotPrice,
      effectivePrice: formatFixed(amountOut, amountIn),
      impactPercent: computeImpact(reserveOut, reserveIn, amountOut, amountIn),
    };
  }

  const amountOut = toBigInt(input.amountOut, 'amountOut');
  if (amountOut === 0n) throw new Error('amountOut must be positive');
  const amountIn = getAmountIn(amountOut, reserveIn, reserveOut, feeNum, feeDen);
  return {
    amountIn: amountIn.toString(),
    spotPrice,
    effectivePrice: formatFixed(amountOut, amountIn),
    impactPercent: computeImpact(reserveOut, reserveIn, amountOut, amountIn),
  };
}

function runV2(input, mode) {
  const sqrtRatioX96 = toBigInt(input.sqrtRatioX96, 'sqrtRatioX96');
  const liquidity = toBigInt(input.liquidity, 'liquidity');
  const feeTier = Number(input.feeTier);
  if (!Number.isInteger(feeTier) || feeTier <= 0 || feeTier >= 1_000_000) {
    throw new Error('feeTier must be a positive integer less than 1_000_000 (e.g. 500, 1500, 3000, 10000)');
  }
  const direction = input.direction;
  const feeNum = BigInt(1_000_000 - feeTier);
  const feeDen = 1_000_000n;

  const { reserveIn, reserveOut } = virtualReserves(sqrtRatioX96, liquidity, direction);
  if (reserveIn === 0n || reserveOut === 0n) throw new Error('virtual reserves must be non-zero (pool may have no liquidity at current tick)');

  const spotPrice = formatFixed(reserveOut, reserveIn);

  if (mode === 'exactIn') {
    const amountIn = toBigInt(input.amountIn, 'amountIn');
    if (amountIn === 0n) throw new Error('amountIn must be positive');
    const amountOut = getAmountOut(amountIn, reserveIn, reserveOut, feeNum, feeDen);
    return {
      amountOut: amountOut.toString(),
      spotPrice,
      effectivePrice: formatFixed(amountOut, amountIn),
      impactPercent: computeImpact(reserveOut, reserveIn, amountOut, amountIn),
    };
  }

  const amountOut = toBigInt(input.amountOut, 'amountOut');
  if (amountOut === 0n) throw new Error('amountOut must be positive');
  const amountIn = getAmountIn(amountOut, reserveIn, reserveOut, feeNum, feeDen);
  return {
    amountIn: amountIn.toString(),
    spotPrice,
    effectivePrice: formatFixed(amountOut, amountIn),
    impactPercent: computeImpact(reserveOut, reserveIn, amountOut, amountIn),
  };
}

function main() {
  const raw = readFileSync(0, 'utf8');
  const input = JSON.parse(raw);
  const mode = input.mode;
  if (mode !== 'exactIn' && mode !== 'exactOut') {
    throw new Error(`unknown mode "${mode ?? ''}" (expected "exactIn" or "exactOut")`);
  }

  const result = input.sqrtRatioX96 !== undefined
    ? runV2(input, mode)
    : runV1(input, mode);

  process.stdout.write(JSON.stringify(result) + '\n');
}

try {
  main();
} catch (err) {
  process.stderr.write(`price-impact: ${err.message}\n`);
  process.exit(1);
}
