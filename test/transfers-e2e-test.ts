import { expect } from "chai";
import Web3 from "web3";
import Redis from "ioredis";
import { erc20s, setWeb3Instance } from "@defi.org/web3-candies";
import { BSC_URL } from "../src/consts";
import { Transfers } from "../src/indexers/transfers";
import { Blocks } from "../src/indexers/blocks";
import { addDaysUTC, dayUTC } from "../src/utils";

describe("transfers indexer e2e", () => {
  let redis: Redis.Redis;

  beforeEach(async () => {
    setWeb3Instance(new Web3(BSC_URL));
    redis = new Redis();
  });

  describe("test data", () => {
    class TestTransfers extends Transfers {
      prefix(): string {
        return `test_${super.prefix()}`;
      }
    }
    let uut: TestTransfers;

    beforeEach(async () => {
      uut = new TestTransfers(redis, "bsc", new Blocks(redis, "bsc"), erc20s.bsc.BTCB());
      const keys = await redis.keys(`${uut.prefix()}*`);
      if (keys.length) await redis.del(keys);
    });

    it("index daily token transfer targets sum by received amount", async () => {
      await uut.saveTransfersSUM(Date.parse("2021-01-01"), [
        { to: "0x1", value3: 100, block: 1 },
        { to: "0x2", value3: 200, block: 1 },
        { to: "0x3", value3: 300, block: 1 },
        { to: "0x2", value3: 300, block: 1 },
      ]);
      expect(await uut.topTokenTransfersReceiversDaily(Date.parse("2021-01-01"))).deep.eq(["0x2", "0x3", "0x1"]);
    });

    it("earliestDayIndexed", async () => {
      expect(await uut.earliestDayIndexed()).eq(0);
      await uut.redis.send_command("ZADD", uut.kSumDailyKeys(), 0, "foo");
      expect(await uut.earliestDayIndexed()).eq(0);
      await uut.redis.send_command("ZREM", uut.kSumDailyKeys(), "foo");
      await uut.redis.send_command("ZADD", uut.kSumDailyKeys(), addDaysUTC(1), "456");
      await uut.redis.send_command("ZADD", uut.kSumDailyKeys(), dayUTC(), "123");
      await uut.redis.send_command("ZADD", uut.kSumDailyKeys(), addDaysUTC(2), "789");
      expect(await uut.earliestDayIndexed()).eq(dayUTC());
    });

    it("find needed day to cache", async () => {
      expect(await uut.findDayToCache(0)).eq(addDaysUTC(-1));
      expect(await uut.findDayToCache(0.1)).eq(addDaysUTC(-1));
      expect(await uut.findDayToCache(addDaysUTC(-1))).eq(addDaysUTC(-2));
      expect(await uut.findDayToCache(addDaysUTC(-2))).eq(addDaysUTC(-3));
      expect(await uut.findDayToCache(addDaysUTC(-1000))).eq(-1);
    });
  });

  afterEach(async () => {
    await redis.quit();
  });

  it("real data: fetch transfers and SUM", async () => {
    const real = new Transfers(redis, "bsc", new Blocks(redis, "bsc"), erc20s.bsc.BTCB());
    await real.updateIndex();
    console.log("Yesterday Top Receivers:", await real.topTokenTransfersReceiversDaily());
    console.log("Earliest Day Indexed:", new Date(await real.earliestDayIndexed()));
    console.log("All Time Top Receivers:", await real.topTokenTransfersReceiversAllTime());
  });
});
