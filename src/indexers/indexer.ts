import fs from "fs-extra";
import * as path from "path";
import { STORAGE_DIR } from "../consts";
import { Network } from "@defi.org/web3-candies";

export abstract class Indexer {
  public storePath: string;

  protected constructor(public network: Network, public name: string) {
    this.storePath = path.resolve(STORAGE_DIR, name);
  }

  abstract index(): Promise<void>;

  async load<T>(def: T, file: string = "store.json"): Promise<T> {
    try {
      return JSON.parse(await fs.readJson(path.resolve(this.storePath, file))) || def;
    } catch (e) {
      return def;
    }
  }

  async save<T>(json: T, file: string = "store.json") {
    const f = path.resolve(this.storePath, file);
    await fs.ensureFile(f);
    await fs.writeJson(f, JSON.stringify(json));
  }
}
