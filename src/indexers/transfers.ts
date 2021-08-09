import _ from "lodash";
import { Redis } from "ioredis";
import { Indexer } from "./indexer";
import { IERC20, to3, web3 } from "@defi.org/web3-candies";
import { chunkIntervals } from "../utils";

const SIZE = 1000; //blocks
const CHUNK_SIZE = 100;

export type TransferEvent = {
  block: number;
  to: string;
  value3: number;
};

export class Transfers extends Indexer {
  constructor(redis: Redis, network: "eth" | "bsc", public token: IERC20) {
    super(redis, network);
  }

  prefix(): string {
    return `cartography:transfers:${this.network}`;
  }

  async updateIndex() {
    const next = await this.nextInterval(await web3().eth.getBlockNumber());
    if (next <= 0) return;

    const transfers = await this.fetchTransfers(next);

    await this.saveTransfers(next, transfers);
  }

  async topTokenTransfersReceiversAllTime(count: number = 10) {
    const keys: string[] = await this.redis.send_command("ZRANGE", this.kSumKeys(), 0, -1);
    const sumKey = `${this.kSumKeys()}:alltime`;
    await this.redis.send_command("ZUNIONSTORE", sumKey, keys.length, ...keys);
    return await this.redis.send_command("ZRANGE", sumKey, "+inf", 0, "BYSCORE", "REV", "LIMIT", 0, count);
  }

  async fetchTransfers(interval: number): Promise<TransferEvent[]> {
    const decimals = parseInt(await this.token.methods.decimals().call());

    const chunks = chunkIntervals(interval, interval + SIZE - 1, CHUNK_SIZE);

    const events = await Promise.all(
      chunks.map((c) => this.token.getPastEvents("Transfer", { fromBlock: c.from, toBlock: c.to }))
    );

    return _(events)
      .flatten()
      .map((e) => ({
        to: _.toString(e.returnValues.to).toLowerCase(),
        value3: to3(e.returnValues.value, decimals).toNumber(),
        block: e.blockNumber,
      }))
      .value();
  }

  async saveTransfers(interval: number, transfers: TransferEvent[]) {
    const key = this.kSum(interval);
    try {
      await this.redis.send_command(`DEL ${key}`);
    } catch (e) {}
    await Promise.all(_.map(transfers, (t) => this.redis.send_command("ZINCRBY", key, t.value3, t.to)));
    await this.redis.send_command("ZADD", this.kSumKeys(), interval, key);
  }

  async nextInterval(currentBlock: number) {
    const { earliest, latest } = await this.indexedBounds();
    const current = Math.floor(currentBlock / SIZE) * SIZE;

    // const minimum = _.toInteger(currentBlock - (MAX_DAYS_BACK * 24 * 60 * 60) / (this.network == "bsc" ? 3 : 13.2));

    if (!earliest) return Math.max(0, current - SIZE);

    return Math.max(0, current - SIZE <= latest ? earliest - SIZE : latest + SIZE);
  }

  async indexedBounds() {
    const [, earliest] = await this.redis.send_command("ZRANGE", this.kSumKeys(), 0, 0, "WITHSCORES");
    const [, latest] = await this.redis.send_command("ZRANGE", this.kSumKeys(), -1, -1, "WITHSCORES");
    return { earliest: _.toInteger(earliest), latest: _.toInteger(latest) };
  }

  kSumKeys() {
    return `${this.prefix()}:intervals:${SIZE}:${this.token.address}:sum:keys`.toLowerCase();
  }

  kSum(interval: number) {
    return `${this.prefix()}:intervals:${SIZE}:${this.token.address}:sum:${interval}`.toLowerCase();
  }

  // kSumDailyKeys() {
  //   return `${this.prefix()}:sum:daily:${this.token.address}:keys`.toLowerCase();
  // }
  //
  // kSumDaily(day: number) {
  //   return `${this.prefix()}:sum:daily:${this.token.address}:${this.dayString(day)}`.toLowerCase();
  // }
  //
  // dayString(timestamp: number) {
  //   return new Date(timestamp).toISOString().split("T")[0];
  // }
}
