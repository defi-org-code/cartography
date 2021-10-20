import { INTERVAL_SIZE, MAX_HISTORY_BLOCKS_BSC, MAX_HISTORY_BLOCKS_ETH } from "./consts";
import { Network, networks } from "@defi.org/web3-candies";

export function swizzleLog() {
  const orig = console.log;
  console.log = (...args: any[]) => orig("💸", new Date(), ...args);
}

export function dayUTC(timestamp: number = Date.now()) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function addDaysUTC(add: number, timestamp: number = Date.now()) {
  return dayUTC(new Date(timestamp).setUTCDate(new Date(timestamp).getUTCDate() + add));
}

/**
 * Returns missing interval assuming index has no holes (or doesn't exist yet).
 * This algo prioritizes first building the latest interval then going back in time, no more than MAX_BLOCKS_BACK
 */
export function nextInterval(network: Network, block: number, earliest: number, latest: number) {
  const current = block - (block % INTERVAL_SIZE);

  const result = !earliest
    ? current - INTERVAL_SIZE
    : current - INTERVAL_SIZE <= latest
    ? earliest - INTERVAL_SIZE
    : latest + INTERVAL_SIZE;

  const minimum = current - (network.id == networks.eth.id ? MAX_HISTORY_BLOCKS_ETH : MAX_HISTORY_BLOCKS_BSC);

  return result < minimum ? 0 : result;
}

/**
 * split from->to into intervals of size (inclusive), jumping by unit.
 * the last interval is <= size
 */
export function chunkIntervals(from: number, to: number, size: number, unit: number = 1) {
  const result = [];
  for (let i = from; i < to; i += size + unit) {
    result.push({ from: i, to: Math.min(i + size, to) });
  }
  return result;
}

export async function silent(fn: () => any) {
  try {
    return await fn();
  } catch (e) {
    return e;
  }
}

export function tempKey(key: string) {
  return `${key}:${Date.now()}:${Math.round(Math.random() * 1e9)}`;
}
