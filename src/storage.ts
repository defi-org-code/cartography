import path from "path";
import os from "os";
import fs from "fs-extra";
import _ from "lodash";

export const storagePath = path.resolve(process.env.HOME_DIR || os.tmpdir(), "storage.json");
const STORAGE_VERSION = 11;

export class Storage {
  static async create() {
    try {
      return await Storage._create();
    } catch (e) {
      return new Storage();
    }
  }

  private static async _create() {
    await fs.ensureFile(storagePath);
    const data = await fs.readJson(storagePath);
    if (!data.version || data.version < STORAGE_VERSION) {
      await fs.remove(storagePath);
      return new Storage();
    } else {
      return data as Storage;
    }
  }

  constructor(public version: number = STORAGE_VERSION, public blocks: Record<number, number> = {}) {}

  async save() {
    await fs.writeJson(storagePath, this.toJson());
  }

  toJson() {
    return _.toPlainObject(this);
  }

  firstBlockNumber() {
    return _(this.blocks).keys().map(_.toNumber).sort().first() || 0;
  }
}
