import { expect } from "chai";
import { lockPath, lockTTL, withLock } from "../src/lock";
import { expectRevert } from "@defi.org/web3-candies";
import fs from "fs-extra";

describe("lock", () => {
  let count = 0;

  beforeEach(() => {
    count = 0;
  });

  it("run fn and return result", async () => {
    const result = await withLock(async () => {
      count++;
      return "ok";
    });

    await withLock(async () => {
      count++;
      return "ok";
    });

    expect(result).eq("ok");
    expect(count).eq(2);
  });

  it("locks access, invalid access ignored", async () => {
    await withLock(async () => {
      await withLock(async () => {
        count++;
      });
      count++;
    });
    expect(count).eq(1);
  });

  it("locks access TTL, old lock ignored", async () => {
    await withLock(async () => {
      const lock = await fs.readJson(lockPath);
      const lockTimestamp = lock["timestamp"];
      expect(lockTimestamp).closeTo(Date.now(), 100);
      await fs.writeJson(lockPath, { timestamp: lockTimestamp - lockTTL }); // simulate passage of time
      await withLock(async () => {
        count++;
      });
    });
    expect(count).eq(1);
  });
});
