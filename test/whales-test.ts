import { expect } from "chai";
import { Whales } from "../src/whales";
import { blockNumberByDate, erc20s, setWeb3Instance } from "@defi.org/web3-candies";
import Web3 from "web3";
import _ from "lodash";

function config() {
  return require("../.config.json");
}
const BSC_URL = `https://cold-silent-rain.bsc.quiknode.pro/${config().quicknodeKey}/`;

describe("whales", () => {
  let uut: Whales;

  beforeEach(async () => {
    setWeb3Instance(new Web3(BSC_URL));
    uut = new Whales("bsc", true);
  });

  afterEach(async () => {
    await uut.saveAndClose();
  });

  it.only("whales of token for day by total amount received", async () => {
    // await uut.addTransfers(erc20s.bsc.BTCB().address, "20210101", [
    //   { to: "0x1", amount: 100 },
    //   { to: "0x2", amount: 200 },
    //   { to: "0x3", amount: 300 },
    //   { to: "0x2", amount: 300 },
    // ]);
    // expect(await uut.findWhales(erc20s.bsc.BTCB().address, "20210101")).deep.eq(["0x2", "0x3", "0x1"]);
    const s = Date.now();
    const events = await erc20s.bsc.BTCB().getPastEvents("Transfer", { fromBlock: 3593318, toBlock: 3622113 });

    const txs = _.map(events, (e) => ({
      to: _.get(e.returnValues, ["to"], "") as string,
      amount: _.get(e.returnValues, ["value"], 0) as number,
    }));
    await uut.addTransfers(erc20s.bsc.BTCB().address, "20210101", txs);

    console.log(await uut.findWhales(erc20s.bsc.BTCB().address, "20210101"));

    console.log(Date.now() - s);
    // { date: '2021-01-01T00:00:00Z', block: 3593318, timestamp: 1609459202 }
    // { date: '2021-01-02T00:00:00Z', block: 3622113, timestamp: 1609545600 }
  }).timeout("5m");
});
