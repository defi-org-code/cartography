import _ from "lodash";
import Redis from "ioredis";

const PREFIX = "cartography:whales";

export class Whales {
  redis: Redis.Redis;

  constructor(public network: "eth" | "bsc", localhost: boolean = false) {
    this.redis = new Redis(6379, localhost ? "127.0.0.1" : "base-assets-redis.u4gq8o.0001.use2.cache.amazonaws.com");
  }

  async saveAndClose() {
    await this.redis.save();
    await this.redis.quit();
  }

  async execute(token: string, day: string) {
    // find missing blocks windows (missing per day): fromBlock, toBlock
    // token.getPastEvents
    // addTransfers
    // mark added blocks
  }

  async findWhales(token: string, day: string, count: number = 10) {
    const key = this.kDailyTransfers(token, day);
    return await this.redis.send_command("ZRANGE", key, "+inf", 1, "BYSCORE", "REV", "LIMIT", 0, count);
  }

  async addTransfers(token: string, day: string, transfers: TransferEvent[]) {
    const key = this.kDailyTransfers(token, day);
    await Promise.all(_.map(transfers, (t) => this.redis.send_command("ZINCRBY", key, t.amount, t.to)));
  }

  private kDailyTransfers(token: string, day: string) {
    return `${PREFIX}:${this.network}:transfers:daily:${token}:${day}`.toLowerCase();
  }
}

export type TransferEvent = {
  to: string;
  amount: number;
};
