import _ from "lodash";
import Redis from "ioredis";
import fs from "fs-extra";
import { Indexer } from "./indexer";
import { Transfers } from "./transfers";
import { Network } from "../tokens";

export class Filter extends Indexer {
  constructor(redis: Redis.Redis, network: Network, public transfers: Transfers) {
    super(redis, network);
  }

  prefix(): string {
    return `cartography:filter:${this.network}`;
  }

  async updateIndex() {
    const data = require(`../static/${this.network}.json`);
  }
}
