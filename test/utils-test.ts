import _ from "lodash";
import { expect } from "chai";
import { addDaysUTC, chunkIntervals, dayUTC, nextInterval, silent, tempKey } from "../src/utils";
import { baseAssets } from "../src/tokens";
import { networks, setWeb3Instance } from "@defi.org/web3-candies";
import Web3 from "web3";
import { BSC_URL } from "../src/consts";

describe("utils", () => {
  beforeEach(async () => {
    setWeb3Instance(new Web3(BSC_URL));
  });

  it("dayUTC", async () => {
    expect(dayUTC(Date.parse("2021-01-15T13:42:14.123Z"))).eq(Date.parse("2021-01-15T00:00:00.000Z"));
  });

  it("dayUTC add days", async () => {
    expect(addDaysUTC(1, Date.parse("2021-01-15T13:42:14.123Z"))).eq(Date.parse("2021-01-16T00:00:00.000Z"));
    expect(addDaysUTC(-1, Date.parse("2021-01-15T13:42:14.123Z"))).eq(Date.parse("2021-01-14T00:00:00.000Z"));
    expect(addDaysUTC(-1, Date.parse("2021-01-01T13:42:14.123Z"))).eq(Date.parse("2020-12-31T00:00:00.000Z"));
    expect(addDaysUTC(31, Date.parse("2021-01-01T13:42:14.123Z"))).eq(Date.parse("2021-02-01T00:00:00.000Z"));
    expect(addDaysUTC(1, Date.parse("2021-02-28T13:42:14.123Z"))).eq(Date.parse("2021-03-01T00:00:00.000Z"));
  });

  it("nextInterval", async () => {
    expect(nextInterval(networks.bsc, 10_234, 10_000, 12_000)).eq(9_000);
    expect(nextInterval(networks.bsc, 13_000, 10_000, 12_000)).eq(9_000);
    expect(nextInterval(networks.bsc, 13_999, 10_000, 12_000)).eq(9_000);
    expect(nextInterval(networks.bsc, 14_000, 10_000, 12_000)).eq(13_000);
    expect(nextInterval(networks.bsc, 15_123, 10_000, 12_000)).eq(13_000);
    expect(nextInterval(networks.bsc, 15_123, 10_000, 13_000)).eq(14_000);
    expect(nextInterval(networks.bsc, 15_123, 10_000, 14_000)).eq(9_000);
    expect(nextInterval(networks.bsc, 15_123, 9_000, 14_000)).eq(8_000);
  });

  it("nextInterval max blocks on bsc", async () => {
    expect(nextInterval(networks.bsc, 3_001_234, 10_000, 2_999_000)).eq(3_000_000);
    expect(nextInterval(networks.bsc, 3_001_234, 2_500_000, 3_000_000)).eq(2_499_000);
    expect(nextInterval(networks.bsc, 3_001_234, 2_002_000, 3_000_000)).eq(2_001_000);
    expect(nextInterval(networks.bsc, 3_001_234, 2_001_000, 3_000_000)).eq(0);
  });

  it("nextInterval max blocks on eth", async () => {
    expect(nextInterval(networks.eth, 301_234, 10_000, 299_000)).eq(300_000);
    expect(nextInterval(networks.eth, 301_234, 250_000, 300_000)).eq(249_000);
    expect(nextInterval(networks.eth, 301_234, 102_000, 300_000)).eq(101_000);
    expect(nextInterval(networks.eth, 301_234, 101_000, 300_000)).eq(0);
  });

  it("chunkIntervals", async () => {
    expect(chunkIntervals(100, 200, 100)).deep.eq([{ from: 100, to: 200 }]);
    expect(chunkIntervals(100, 200, 50)).deep.eq([
      { from: 100, to: 150 },
      { from: 151, to: 200 },
    ]);
    expect(chunkIntervals(100, 200, 1000)).deep.eq([{ from: 100, to: 200 }]);
    expect(chunkIntervals(0, 100_000, 500))
      .length(200)
      .deep.include({ from: 0, to: 500 })
      .include({ from: 501, to: 1001 })
      .include({ from: 1002, to: 1502 });
    expect(_.last(chunkIntervals(0, 100_000, 500))).deep.eq({ from: 99_699, to: 100_000 });
  });

  it("tempKey", async () => {
    const k1 = tempKey("foo");
    const k2 = tempKey("foo");
    expect(k1).not.deep.eq(k2);
  });

  it("silent", async () => {
    expect(await silent(() => "foo"));
    const result = await silent(() => {
      throw new Error("foo");
    });
    expect(result.message).eq("foo");
  });
});
