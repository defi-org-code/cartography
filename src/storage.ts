import path from "path";
import os from "os";
import _ from "lodash";
import { createClient, RedisClient } from "redis";
import { promisify } from "util";

const storagePath = path.resolve(process.env.HOME_DIR || os.tmpdir(), "storage.json");
const STORAGE_VERSION = 1;

export class Storage {
  redis: RedisClient;
  redis_save: () => Promise<any>;
  redis_quit: () => Promise<any>;
  redis_zincrby: (key: string, incScore: number, member: string) => Promise<string>;
  redis_zrevrangebyscore: (key: string, min: number, max: number) => Promise<any>;

  constructor(private mocked: boolean = false) {
    this.redis = this.mocked
      ? require("redis-mock").createClient({
          prefix: "cartography:storage:bsc",
        })
      : createClient(6379, "base-assets-redis.u4gq8o.0001.use2.cache.amazonaws.com", {
          prefix: "cartography:storage:bsc",
        });
    this.redis_save = this.redis.save ? promisify(this.redis.save).bind(this.redis) : async () => {};
    this.redis_quit = promisify(this.redis.quit).bind(this.redis);
    this.redis_zincrby = promisify(this.redis.zincrby).bind(this.redis);
    this.redis_zrevrangebyscore = promisify(this.redis.sort).bind(this.redis);
  }

  // private static async _create() {
  //   await fs.ensureFile(storagePath);
  //   const data = await fs.readJson(storagePath);
  //   if (!data.version || data.version < STORAGE_VERSION) {
  //     await fs.remove(storagePath);
  //     return new Storage();
  //   } else {
  //     return new Storage(data.version, data.blocks);
  //   }
  // }

  async saveAndClose() {
    // TODO needed?
    // await this.redis_save();
    // await this.redis_quit();
  }

  async firstBlockNumber() {
    return await this.redis_zrevrangebyscore(`blocks`, 0, -1);
    // return _(this.blocks).keys().map(_.toNumber).sort().first() || 0;
  }

  async onBlock(blockNumber: number, timestamp: number, token: string, receiver: string, amount: number) {
    await this.redis_zincrby(`transfers:daily:${token}`, amount, receiver);
  }
}
