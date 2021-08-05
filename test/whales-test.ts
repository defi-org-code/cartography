import { expect } from "chai";
import { Whales } from "../src/whales";
import { erc20s, setWeb3Instance } from "@defi.org/web3-candies";
import Web3 from "web3";
import _ from "lodash";

function config() {
  return require("../.config.json");
}

const BSC_URL = `https://cold-silent-rain.bsc.quiknode.pro/${config().quicknodeKey2}/`;
// const BSC_URL = `https://long-thrumming-dream.bsc.quiknode.pro/${config().quicknodeKey}/`;

describe("whales", () => {
  let uut: Whales;

  beforeEach(async () => {
    setWeb3Instance(new Web3(BSC_URL));
    uut = new Whales("bsc", true);
  });

  afterEach(async () => {
    await uut.saveAndClose();
  });

  it("whales of token for day by total amount received", async () => {
    await uut.addTransfers(erc20s.bsc.BTCB().address, "20210101", [
      { to: "0x1", value: 100, blockNumber: 1 },
      { to: "0x2", value: 200, blockNumber: 1 },
      { to: "0x3", value: 300, blockNumber: 1 },
      { to: "0x2", value: 300, blockNumber: 1 },
    ]);
    expect(await uut.findWhales(erc20s.bsc.BTCB().address, "20210101")).deep.eq(["0x2", "0x3", "0x1"]);
  });

  it("chunked", async () => {
    expect(Whales.chunkBlocks(100, 200, 100)).deep.eq([{ fromBlock: 100, toBlock: 200 }]);
    expect(Whales.chunkBlocks(100, 200, 50)).deep.eq([
      { fromBlock: 100, toBlock: 150 },
      { fromBlock: 151, toBlock: 200 },
    ]);
    expect(Whales.chunkBlocks(100, 200, 1000)).deep.eq([{ fromBlock: 100, toBlock: 200 }]);
    expect(Whales.chunkBlocks(0, 100_000, 500))
      .length(200)
      .deep.include({ fromBlock: 0, toBlock: 500 })
      .include({ fromBlock: 501, toBlock: 1001 })
      .include({ fromBlock: 1002, toBlock: 1502 });
    expect(_.last(Whales.chunkBlocks(0, 100_000, 500))).deep.eq({ fromBlock: 99_699, toBlock: 100_000 });
  });
});
