import _ from "lodash";
import { Redis } from "ioredis";
import { Indexer } from "./indexer";
import { IERC20, to3, web3 } from "@defi.org/web3-candies";
import { chunkIntervals, log, silent, tempKey } from "../utils";
import { INTERVAL_SIZE, REQ_CHUNK_SIZE } from "../consts";
import { Network } from "../tokens";

export type TransferEvent = {
  block: number;
  to: string;
  value3: number;
};

export class Transfers extends Indexer {
  constructor(redis: Redis, network: Network, public token: IERC20, public block: number) {
    super(redis, network);
  }

  prefix(): string {
    return `cartography:transfers:${this.network}`;
  }

  async updateIndex() {
    log("transfers->updateIndex", this.network, this.token.name, this.block);
    const next = await this.nextInterval(this.block);
    log("next interval", next);
    if (next <= 0) return;

    const transfers = await this.fetchTransfers(next);
    log("transfers", transfers.length);

    await this.saveTransfers(next, transfers);
    log("done");
  }

  async topTokenTransferReceiversAllTime(count: number = 10) {
    const k = tempKey(`${this.kSumKeys()}:alltime`);

    const keys: string[] = await this.redis.send_command("ZRANGE", this.kSumKeys(), 0, -1);
    await this.redis.send_command("ZUNIONSTORE", k, keys.length, ...keys);

    const result = await this.redis.send_command("ZRANGE", k, "+inf", 0, "BYSCORE", "REV", "LIMIT", 0, count);
    await silent(() => this.redis.send_command("unlink", k));
    return result;
  }

  async fetchTransfers(interval: number): Promise<TransferEvent[]> {
    const decimals = parseInt(await this.token.methods.decimals().call());

    const chunks = chunkIntervals(interval, interval + INTERVAL_SIZE - 1, REQ_CHUNK_SIZE);

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
      .filter((e) => e.value3 > 0)
      .value();
  }

  async saveTransfers(interval: number, transfers: TransferEvent[], maxMembers: number = 100) {
    const key = this.kSum(interval);
    await silent(() => this.redis.send_command(`DEL ${key}`));
    await Promise.all(_.map(transfers, (t) => this.redis.send_command("ZINCRBY", key, t.value3, t.to)));
    await this.redis.send_command("ZREMRANGEBYRANK", key, 0, -maxMembers - 1);
    await this.redis.send_command("ZADD", this.kSumKeys(), interval, key);
  }

  async nextInterval(currentBlock: number) {
    const { earliest, latest } = await this.indexedBounds();
    const current = Math.floor(currentBlock / INTERVAL_SIZE) * INTERVAL_SIZE;

    // const minimum = _.toInteger(currentBlock - (MAX_DAYS_BACK * 24 * 60 * 60) / (this.network == "bsc" ? 3 : 13.2));

    if (!earliest) return Math.max(0, current - INTERVAL_SIZE);

    return Math.max(0, current - INTERVAL_SIZE <= latest ? earliest - INTERVAL_SIZE : latest + INTERVAL_SIZE);
  }

  async indexedBounds() {
    const [, earliest] = await this.redis.send_command("ZRANGE", this.kSumKeys(), 0, 0, "WITHSCORES");
    const [, latest] = await this.redis.send_command("ZRANGE", this.kSumKeys(), -1, -1, "WITHSCORES");
    return { earliest: _.toInteger(earliest), latest: _.toInteger(latest) };
  }

  kSumKeys() {
    return `${this.prefix()}:${this.token.address}:sum:keys`.toLowerCase();
  }

  kSum(interval: number) {
    return `${this.prefix()}:${this.token.address}:sum:${interval}`.toLowerCase();
  }
}
