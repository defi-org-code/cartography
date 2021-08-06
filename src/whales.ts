import _ from "lodash";
import Redis from "ioredis";
import { blockNumbersEveryDate } from "@defi.org/web3-candies";
import { dayUTC, findIntervalToCache } from "./utils";

const BLOCK_BATCH_SIZE = 512;
const MAX_DAYS_BACK = 30;

export type TransferEvent = {
  blockNumber: number;
  to: string;
  value: number;
};

export class Whales {
  redis: Redis.Redis;

  constructor(public network: "eth" | "bsc", localhost: boolean = false) {
    this.redis = new Redis(6379, localhost ? "127.0.0.1" : "base-assets-redis.u4gq8o.0001.use2.cache.amazonaws.com");
  }

  async saveAndClose() {
    await this.redis.quit();
  }

  async execute() {
    await this.cacheBlockNumbersByDay();
    // find missing blocks windows (missing per day): fromBlock, toBlock
    // token.getPastEvents
    // addTransfers
    // mark added blocks
  }

  // async getMissingBlocks() {
  //   const latest = await web3().eth.getBlockNumber();
  //   const now = new Date();
  //   const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  //   const fromBlock = (await blockNumberByDate(day)).block;
  //   const chunks = Whales.chunkBlocks(fromBlock, latest, BLOCK_BATCH_SIZE);
  //
  //   const events = _.flatten(
  //     await Promise.all(
  //       _.map(chunks, (c) =>
  //         erc20s.bsc.BTCB().getPastEvents("Transfer", { fromBlock: c.fromBlock, toBlock: c.toBlock })
  //       )
  //     )
  //   );
  //
  //   const transfers = events.map((e) => ({
  //     to: e.returnValues.to as string,
  //     value: to3(e.returnValues.value, 18).toNumber(),
  //     blockNumber: e.blockNumber,
  //   }));
  //   await this.addTransfers(erc20s.bsc.BTCB().address, day.toISOString().split("T")[0], transfers);
  // }

  async findWhales(token: string, day: string, count: number = 10) {
    const key = Whales.kDailyTransfers(token, day);
    return await this.redis.send_command("ZRANGE", key, "+inf", 0, "BYSCORE", "REV", "LIMIT", 0, count);
  }

  async addTransfers(token: string, day: string, transfers: TransferEvent[]) {
    const key = Whales.kDailyTransfers(token, day);
    await Promise.all(_.map(transfers, (t) => this.redis.send_command("ZINCRBY", key, t.value, t.to)));
  }

  // async splitByDays(transfers: TransferEvent[]) {
  //   blockNumbersEveryDate("days", )
  //   _(transfers).map((t) => t.blockNumber);
  // }

  async cacheBlockNumbersByDay() {
    const key = Whales.kBlockNumberByDay();

    const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
    const length = MILLIS_PER_DAY * MAX_DAYS_BACK;
    const today = dayUTC(Date.now());
    const lowerBound = dayUTC(today - length);
    const [, earliestIndexedDay] = await this.redis.send_command("ZRANGE", key, 0, 0, "WITHSCORES");
    const [, latestIndexedDay] = await this.redis.send_command("ZRANGE", key, 0, 0, "REV", "WITHSCORES");

    const missing = findIntervalToCache(
      length,
      today,
      earliestIndexedDay,
      latestIndexedDay,
      lowerBound,
      MILLIS_PER_DAY
    );

    if (!missing) return;

    const blockInfos = await blockNumbersEveryDate("days", missing.from, missing.to);
    await Promise.all(_.map(blockInfos, (b) => this.redis.send_command("ZADD", key, Date.parse(b.date), b.block)));
  }

  static chunkBlocks(from: number, to: number, size: number) {
    const result = [];
    for (let i = from; i < to; i += size + 1) {
      result.push({ fromBlock: i, toBlock: Math.min(i + size, to) });
    }
    return result;
  }

  static prefix() {
    return "cartography:whales";
  }

  static kBlockNumberByDay() {
    return `${this.prefix()}:blocknumber-by-day`.toLowerCase();
  }

  static kDailyTransfers(token: string, day: string) {
    return `${this.prefix()}:token-receivers:daily:${token}:${day}`.toLowerCase();
  }
}
