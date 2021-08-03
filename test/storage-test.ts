import { expect } from "chai";
import { Storage } from "../src/storage";
import { promisify } from "util";

describe("storage", () => {
  let storage: Storage;
  beforeEach(async () => {
    storage = new Storage(true);
    await promisify(storage.redis.flushall).bind(storage.redis)();
  });

  afterEach(async () => {
    await storage.saveAndClose();
  });

  it("total transfers per token receivers", async () => {
    expect(await storage.firstBlockNumber()).eq(0);

    await storage.onBlock(456789, 1);
    await storage.onBlock(123456, 1);
    await storage.onBlock(123456, 2);
    await storage.onBlock(123456, 3);
    await storage.onBlock(789456, 10);
    await storage.onBlock(789456, 100);

    expect(storage.firstBlockNumber()).eq(123456);
  });

  // it("persisted", async () => {
  //   storage.addBlockTransfers(456789, 1);
  //   storage.addBlockTransfers(123456, 1);
  //   storage.addBlockTransfers(789456, 1);
  //   await storage.save();
  //
  //   const other = await Storage.create();
  //   expect(other.firstBlockNumber()).eq(123456);
  // });
});
