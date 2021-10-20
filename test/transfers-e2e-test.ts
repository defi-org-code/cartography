import { expect } from "chai";
import Web3 from "web3";
import { bn18, erc20s, networks, setWeb3Instance, web3 } from "@defi.org/web3-candies";
import { BSC_URL, STORAGE_DIR } from "../src/consts";
import { Transfers } from "../src/indexers/transfers";
import fs from "fs-extra";
import { EventData } from "web3-eth-contract";
import _ from "lodash";

describe("transfers indexer e2e", () => {
  beforeEach(async () => {
    setWeb3Instance(new Web3(BSC_URL));
  });

  describe("test data", () => {
    class TestTransfers extends Transfers {}

    let uut: TestTransfers;

    beforeEach(async () => {
      uut = new TestTransfers(networks.bsc, erc20s.bsc.BTCB(), await web3().eth.getBlockNumber());
      await fs.remove(uut.storePath);
    });

    it("stores", async () => {
      expect(await uut.load({})).deep.eq({});
      await uut.save({ foo: "bar" });
      expect(await uut.load({})).deep.eq({ foo: "bar" });
    });

    it("parse", async () => {
      uut.decimals = 18;
      const eventTemplate: EventData = {
        returnValues: {},
        raw: {
          data: "data",
          topics: [],
        },
        event: "transfer",
        signature: "sig",
        logIndex: 0,
        transactionIndex: 0,
        transactionHash: "txhash",
        blockHash: "blockhash",
        blockNumber: 12345,
        address: "tokenaddress",
      };
      const eventA = _.extend({}, eventTemplate, { returnValues: { to: "to1", value: bn18(2) } });
      const eventB = _.extend({}, eventTemplate, { returnValues: { to: "to1", value: bn18(3) } });
      const eventC = _.extend({}, eventTemplate, { returnValues: { to: "to2", value: bn18(10) } });
      const eventD = _.extend({}, eventTemplate, { returnValues: { to: "to2", value: 12345678 } }); // will filter this as dust

      const result = uut.parse([
        [eventA, eventC],
        [eventB, eventD],
        [eventD, eventD, eventD],
      ]);

      expect(result).length(3);

      expect(_.sortBy(result, (t) => t.to)).deep.eq([
        { to: "to1", value3: 2_000 },
        { to: "to1", value3: 3_000 },
        { to: "to2", value3: 10_000 },
      ]);
    });

    it("filter and reduce", async () => {
      const result = uut.reduce([
        { to: "to1", value3: 123 },
        { to: "to1", value3: 456 },
        { to: "to2", value3: 789 },
        { to: "to2", value3: 1 },
      ]);
      expect(result).deep.eq([
        { target: "to2", sum3: 790 },
        { target: "to1", sum3: 123 + 456 },
      ]);
    });

    it("earliest & latest intervals", async () => {
      await uut.prepare({ intervals: {} });
      expect(uut.earliest()).eq(0);
      expect(uut.latest()).eq(0);

      await uut.prepare({ intervals: { "1234": [{ target: "0x1", sum3: 100 }] } });
      expect(uut.earliest()).eq(1234);
      expect(uut.latest()).eq(1234);

      await uut.prepare({
        intervals: { "10000": [{ target: "0x1", sum3: 100 }], "11000": [{ target: "0x1", sum3: 100 }] },
      });
      expect(uut.earliest()).eq(10000);
      expect(uut.latest()).eq(11000);
    });

    it("allTimeLeaders", async () => {
      await uut.prepare({
        intervals: {
          "10000": [{ target: "0x1", sum3: 100 }],
          "11000": [
            { target: "0x1", sum3: 100 },
            { target: "0x2", sum3: 50 },
            { target: "0x3", sum3: 10 },
          ],
          "12000": [
            { target: "0x2", sum3: 50 },
            { target: "0x3", sum3: 1000 },
          ],
        },
      });
      expect(uut.allTimeLeaders()).deep.eq([
        { target: "0x3", sum3: 1010 },
        { target: "0x1", sum3: 200 },
        { target: "0x2", sum3: 100 },
      ]);
    });
  });

  describe("real data BSC", () => {
    before(async () => {
      await fs.remove(STORAGE_DIR);
    });

    it("transfers for BTCB", async () => {
      const real = new Transfers(networks.bsc, erc20s.bsc.BTCB(), await web3().eth.getBlockNumber());
      await real.prepare();
      await real.index();
      console.log("BTCB All Time Top Receivers:");
    });

    it("transfers for WBNB", async () => {
      const real = new Transfers(networks.bsc, erc20s.bsc.WBNB(), await web3().eth.getBlockNumber());
      await real.prepare();
      await real.index();
      console.log("WBNB All Time Top Receivers:");
    });
  });
});
