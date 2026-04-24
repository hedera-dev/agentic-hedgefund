#!/usr/bin/env node
// audit-log.mjs
//
// Append-only JSONL audit log with a "latest snapshot" reader.
//
// Usage (both subcommands read a JSON object from stdin):
//
//   node audit-log.mjs append
//     input:  { "path": "./audit/agentic-hedge-fund.jsonl", "entry": { ... } }
//     output: { "ok": true, "path": "...", "bytes": N }
//
//   node audit-log.mjs read-snapshot
//     input:  { "path": "...", "pair": "HBAR/0.0.429274", "network": "testnet" }
//     output: <observation entry> OR null
//
// `read-snapshot` returns the most recent entry where:
//   phase === "observation" && pair === <pair> && network === <network>
// scanning from the tail of the file. If the file does not exist or no entry
// matches, prints `null`.

import { readFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

function readStdinJson() {
  const raw = readFileSync(0, 'utf8');
  if (!raw.trim()) throw new Error('empty stdin');
  return JSON.parse(raw);
}

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function cmdAppend() {
  const { path, entry } = readStdinJson();
  if (!path || typeof path !== 'string') throw new Error('path (string) is required');
  if (!entry || typeof entry !== 'object') throw new Error('entry (object) is required');

  const enriched = { timestamp: new Date().toISOString(), ...entry };
  // If the caller already set timestamp, keep theirs.
  if (entry.timestamp) enriched.timestamp = entry.timestamp;

  const line = JSON.stringify(enriched) + '\n';
  ensureDir(path);
  appendFileSync(path, line, 'utf8');
  process.stdout.write(JSON.stringify({ ok: true, path, bytes: Buffer.byteLength(line, 'utf8') }) + '\n');
}

function cmdReadSnapshot() {
  const { path, pair, network } = readStdinJson();
  if (!path || typeof path !== 'string') throw new Error('path (string) is required');
  if (!pair || typeof pair !== 'string') throw new Error('pair (string) is required');
  if (!network || typeof network !== 'string') throw new Error('network (string) is required');

  if (!existsSync(path)) {
    process.stdout.write('null\n');
    return;
  }

  const content = readFileSync(path, 'utf8');
  const lines = content.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry && entry.phase === 'observation' && entry.pair === pair && entry.network === network) {
      process.stdout.write(JSON.stringify(entry) + '\n');
      return;
    }
  }
  process.stdout.write('null\n');
}

function main() {
  const cmd = process.argv[2];
  if (cmd === 'append') return cmdAppend();
  if (cmd === 'read-snapshot') return cmdReadSnapshot();
  throw new Error(`unknown subcommand "${cmd ?? ''}" (expected "append" or "read-snapshot")`);
}

try {
  main();
} catch (err) {
  process.stderr.write(`audit-log: ${err.message}\n`);
  process.exit(1);
}
