import _ from "lodash";
import { Redis } from "ioredis";
import { addDaysUTC, chunkIntervals, dayUTC } from "../utils";
import { Indexer } from "./indexer";
import { IERC20, to3 } from "@defi.org/web3-candies";
import { Blocks } from "./blocks";
import { MAX_DAYS_BACK } from "../consts";

const BLOCK_BATCH_SIZE = 512;

export type TransferEvent = {
  block: number;
  to: string;
  value3: number;
};

export class Transfers extends Indexer {
  constructor(redis: Redis, network: "eth" | "bsc", public blocks: Blocks, public token: IERC20) {
    super(redis, network);
  }

  prefix(): string {
    return `cartography:transfers:${this.network}`;
  }

  async updateIndex() {
    const dayToCache = await this.findDayToCache(await this.earliestDayIndexed());
    if (dayToCache <= 0) return;

    const { from, to } = await this.blocks.blockRangeForDay(dayToCache);

    const transfers = await this.fetchTransfersSUM(from, to);

    await this.saveTransfersSUM(dayToCache, transfers);
  }

  async fetchTransfersSUM(from: number, to: number): Promise<TransferEvent[]> {
    const decimals = parseInt(await this.token.methods.decimals().call());

    const chunks = chunkIntervals(from, to, BLOCK_BATCH_SIZE);

    const events = _.flatten(
      await Promise.all(
        _.map(chunks, (c) => this.token.getPastEvents("Transfer", { fromBlock: c.from, toBlock: c.to }))
      )
    );

    return events.map((e) => ({
      to: _.toString(e.returnValues.to).toLowerCase(),
      value3: to3(e.returnValues.value, decimals).toNumber(),
      block: e.blockNumber,
    }));
  }

  async topTokenTransfersReceiversDaily(date: number = addDaysUTC(-1), count: number = 10) {
    const key = this.kSumDaily(dayUTC(date));
    return await this.redis.send_command("ZRANGE", key, "+inf", 0, "BYSCORE", "REV", "LIMIT", 0, count);
  }

  async topTokenTransfersReceiversAllTime(count: number = 10) {
    const keys: string[] = await this.redis.send_command("ZRANGE", this.kSumDailyKeys(), 0, -1);
    const sumKey = `${this.kSumDailyKeys()}:sum`;
    await this.redis.send_command("ZUNIONSTORE", sumKey, keys.length, ...keys);
    return await this.redis.send_command("ZRANGE", sumKey, "+inf", 0, "BYSCORE", "REV", "LIMIT", 0, count);
  }

  async earliestDayIndexed(): Promise<number> {
    const [, earliest] = await this.redis.send_command("ZRANGE", this.kSumDailyKeys(), 0, 0, "WITHSCORES");
    return _.toInteger(earliest);
  }

  async saveTransfersSUM(day: number, transfers: TransferEvent[]) {
    const key = this.kSumDaily(day);
    try {
      await this.redis.send_command(`DEL ${key}`);
    } catch (e) {}
    await Promise.all(_.map(transfers, (t) => this.redis.send_command("ZINCRBY", key, t.value3, t.to)));
    await this.redis.send_command("ZADD", this.kSumDailyKeys(), day, key);
  }

  async findDayToCache(earliest: number) {
    const indexed = _.toInteger(earliest) || dayUTC();
    const lowerBound = addDaysUTC(-MAX_DAYS_BACK);
    if (indexed < lowerBound) return -1;
    return addDaysUTC(-1, indexed);
  }

  kSumDailyKeys() {
    return `${this.prefix()}:sum:daily:${this.token.address}:keys`.toLowerCase();
  }

  kSumDaily(day: number) {
    return `${this.prefix()}:sum:daily:${this.token.address}:${this.dayString(day)}`.toLowerCase();
  }

  dayString(timestamp: number) {
    return new Date(timestamp).toISOString().split("T")[0];
  }
}
