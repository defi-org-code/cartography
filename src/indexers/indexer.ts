import { Redis } from "ioredis";

export abstract class Indexer {
  constructor(public redis: Redis, public network: "eth" | "bsc") {}

  abstract prefix(): string;

  abstract updateIndex(): Promise<void>;
}
