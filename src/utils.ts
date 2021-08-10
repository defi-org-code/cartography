export function log(...args: any[]) {
  console.log(new Date(), ...args);
}

export function dayUTC(timestamp: number = Date.now()) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function addDaysUTC(add: number, timestamp: number = Date.now()) {
  return dayUTC(new Date(timestamp).setUTCDate(new Date(timestamp).getUTCDate() + add));
}

/**
 * Returns {from -> to} missing interval assuming index has no holes (or doesn't exist yet).
 * This algo prioritizes first building the latest interval then going back in time.
 *
 * @param length - max interval length (in case of historical interval) ex. max blocks to fetch
 * @param current - the present state, ex. current block
 * @param earliestIndex - most historical cached or 0, ex. earliest block data cached
 * @param latestIndex - most recent cached or 0, ex. latest block data cached
 * @param lowerBound - max history total. will not return lower than lowerBound
 * @param unit - interval step, ex. 1 block, 1000 millis etc
 *
 * @returns {from,to} or undefined
 */
export function findIntervalToCache(
  length: number,
  current: number,
  earliestIndex: number = 0,
  latestIndex: number = 0,
  lowerBound: number = 0,
  unit: number = 1
) {
  const to = latestIndex != current ? current : Math.max(lowerBound, earliestIndex - unit);
  const from = (latestIndex || current) != current ? latestIndex + unit : Math.max(lowerBound, to - length);
  if (from == to && from == lowerBound) return undefined;
  return { from, to };
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
