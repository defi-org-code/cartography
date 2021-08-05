export function dayUTC(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Returns {from -> to} missing interval assuming index has no holes (or doesn't exist yet).
 * This algo prioritizes first building the latest interval then going back in time.
 *
 * @param length - max interval length (in case of historical interval) ex. max blocks to fetch
 * @param current - the present state, ex. current block
 * @param earliestIndex - most historical cached or 0, ex. earliest block data cached
 * @param latestIndex - most recent cached or 0, ex. latest block data cached
 */
export function findMissingInterval(
  length: number,
  current: number,
  earliestIndex: number = 0,
  latestIndex: number = 0
) {
  const to = latestIndex != current ? current : Math.max(0, earliestIndex - 1);
  const from = (latestIndex || current) != current ? latestIndex + 1 : Math.max(0, to - length);
  return { from, to };
}
