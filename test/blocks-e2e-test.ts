import { expect } from "chai";
import Web3 from "web3";
import Redis from "ioredis";
import { block, setWeb3Instance } from "@defi.org/web3-candies";
import { Blocks } from "../src/indexers/blocks";
import { BSC_URL } from "../src/consts";
import { addDaysUTC, dayUTC } from "../src/utils";

describe("blocks indexer e2e", () => {
  let uut: Blocks;

  beforeEach(async () => {
    setWeb3Instance(new Web3(BSC_URL));
    uut = new Blocks(new Redis(), "bsc");
  });

  afterEach(async () => {
    await uut.redis.quit();
  });

  it("blocknumber at start of UTC day", async () => {
    await uut.updateIndex();
    const result = await uut.getFirstBlockOfUTCDay();
    const blockBefore = dayUTC((await block(result - 1)).timestamp * 1000);
    const blockAfter = dayUTC((await block(result + 1)).timestamp * 1000);
    expect(blockBefore).lessThan(dayUTC());
    expect(blockAfter).eq(dayUTC());
  });

  it("blocks for day", async () => {
    const yesterday = addDaysUTC(-1);
    const result = await uut.blockRangeForDay(yesterday);
    expect(dayUTC((await block(result.from)).timestamp * 1000)).eq(yesterday);
    expect(dayUTC((await block(result.to)).timestamp * 1000)).eq(yesterday);
  });
});
