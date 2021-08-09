import { expect } from "chai";
import Web3 from "web3";
import Redis from "ioredis";
import { erc20s, setWeb3Instance } from "@defi.org/web3-candies";
import { BSC_URL } from "../src/consts";
import { Transfers } from "../src/indexers/transfers";

describe("transfers indexer e2e", () => {
  let redis: Redis.Redis;

  beforeEach(async () => {
    setWeb3Instance(new Web3(BSC_URL));
    redis = new Redis();
  });

  afterEach(async () => {
    await redis.quit();
  });

  describe("test data", () => {
    class TestTransfers extends Transfers {
      prefix(): string {
        return `test_${super.prefix()}`;
      }
    }
    let uut: TestTransfers;

    beforeEach(async () => {
      uut = new TestTransfers(redis, "bsc", erc20s.bsc.BTCB());
      const keys = await redis.keys(`${uut.prefix()}*`);
      if (keys.length) await redis.del(keys);
    });

    it("find interval of 1000 blocks to cache", async () => {
      expect(await uut.indexedBounds()).deep.eq({ earliest: 0, latest: 0 });
      expect(await uut.nextInterval(10000)).eq(9000);

      await uut.redis.send_command("ZADD", uut.kSumKeys(), 10000, "a");
      await uut.redis.send_command("ZADD", uut.kSumKeys(), 11000, "b");
      await uut.redis.send_command("ZADD", uut.kSumKeys(), 12000, "c");
      expect(await uut.indexedBounds()).deep.eq({ earliest: 10000, latest: 12000 });

      expect(await uut.nextInterval(13000)).eq(9000);
      expect(await uut.nextInterval(13123)).eq(9000);
      expect(await uut.nextInterval(13999)).eq(9000);
      expect(await uut.nextInterval(14000)).eq(13000);
      expect(await uut.nextInterval(15000)).eq(13000);

      await uut.redis.send_command("ZADD", uut.kSumKeys(), 13000, "d");
      expect(await uut.nextInterval(15000)).eq(14000);

      await uut.redis.send_command("ZADD", uut.kSumKeys(), 14000, "e");
      expect(await uut.nextInterval(15000)).eq(9000);

      await uut.redis.send_command("ZADD", uut.kSumKeys(), 9000, "f");
      expect(await uut.nextInterval(15000)).eq(8000);

      // // minimum 90 days back TODO
      // expect(await uut.nextInterval(3_000_000)).eq(408_000);
      // await uut.redis.send_command("ZADD", uut.kSumKeys(), 3_000_000, "z");
      // expect(await uut.nextInterval(3_000_000)).eq(0);
    });

    it("index daily token transfer targets sum by received amount", async () => {
      await uut.saveTransfers(1000, [
        { to: "0x1", value3: 100, block: 1 },
        { to: "0x2", value3: 200, block: 1 },
        { to: "0x3", value3: 300, block: 1 },
        { to: "0x2", value3: 300, block: 1 },
      ]);
      expect(await uut.topTokenTransfersReceiversAllTime()).deep.eq(["0x2", "0x3", "0x1"]);
    });
  });

  describe("real data BSC", () => {
    it("transfers for BTCB", async () => {
      const real = new Transfers(redis, "bsc", erc20s.bsc.BTCB());
      await real.updateIndex();
      console.log("BTCB All Time Top Receivers:", await real.topTokenTransfersReceiversAllTime());
    });

    it("transfers for WBNB", async () => {
      const real = new Transfers(redis, "bsc", erc20s.bsc.WBNB());
      await real.updateIndex();
      console.log("WBNB All Time Top Receivers:", await real.topTokenTransfersReceiversAllTime());
    });
  });
});
