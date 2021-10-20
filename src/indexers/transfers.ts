import _ from "lodash";
import { Indexer } from "./indexer";
import { IERC20, Network, to3 } from "@defi.org/web3-candies";
import { chunkIntervals, nextInterval } from "../utils";
import { INTERVAL_SIZE, REQ_CHUNK_SIZE } from "../consts";
import type { EventData } from "web3-eth-contract";

export const MAX_TARGETS_PER_INTERVAL = 100;

export type TransferEvent = {
  to: string;
  value3: number;
};

export type Leader = { target: string; sum3: number };

export type TransfersStore = {
  intervals: {
    [block: string]: Leader[];
  };
};

export class Transfers extends Indexer {
  public store!: TransfersStore;
  public decimals!: number;

  constructor(network: Network, public token: IERC20, public block: number) {
    super(network, `transfers:${network.shortname}:${token.address.toLowerCase()}`);
  }

  async prepare(initial: TransfersStore = { intervals: {} }) {
    this.store = await this.load<TransfersStore>(initial);
    this.decimals = parseInt(await this.token.methods.decimals().call());
  }

  /**
   * index next 1000block interval
   */
  async index() {
    console.log("transfers->index", this.network.name, this.token.name, this.block);

    const next = nextInterval(this.network, this.block, this.earliest(), this.latest());
    console.log("earliest", this.earliest(), "latest", this.latest(), "next interval", next);
    if (next <= 0) return;

    const transfers = await this.fetchTransfers(next);
    console.log("transfers.length", transfers.length);

    const reduced = this.reduce(transfers);
    console.log("reduced.length", reduced.length);

    _.set(this.store, ["intervals", next.toString()], reduced);
    await this.save<TransfersStore>(this.store);

    console.log("done");
  }

  allTimeLeaders() {
    return _(this.store.intervals)
      .values()
      .flatten()
      .groupBy((l) => l.target)
      .map<Leader>((byTarget) => ({
        target: byTarget[0].target,
        sum3: _.reduce(byTarget, (sum, t) => sum + t.sum3, 0),
      }))
      .sortBy((l) => l.sum3)
      .reverse()
      .take(MAX_TARGETS_PER_INTERVAL)
      .value();
  }

  /**
   * fetches interval (1000 blocks)
   *
   * @param interval: blocknumber of starting interval of size INTERVAL_SIZE
   */
  async fetchTransfers(interval: number): Promise<TransferEvent[]> {
    const chunks = chunkIntervals(interval, interval + INTERVAL_SIZE - 1, REQ_CHUNK_SIZE);

    const events = await Promise.all(
      chunks.map((c) => this.token.getPastEvents("Transfer", { fromBlock: c.from, toBlock: c.to }))
    );

    return this.parse(events);
  }

  earliest() {
    const n = _(this.store.intervals)
      .keys()
      .minBy((k) => parseInt(k));
    return n ? parseInt(n) : 0;
  }

  latest() {
    const n = _(this.store.intervals)
      .keys()
      .maxBy((k) => parseInt(k));
    return n ? parseInt(n) : 0;
  }

  /**
   * flattens, truncates to 3 decimals, removes 0 values
   */
  parse(events: EventData[][]): TransferEvent[] {
    return _(events)
      .flatten()
      .map((e) => ({
        to: _.toString(e.returnValues.to).toLowerCase(),
        value3: to3(e.returnValues.value, this.decimals).toNumber(),
      }))
      .filter((e) => e.value3 > 0)
      .value();
  }

  reduce(transfers: TransferEvent[]) {
    return _(transfers)
      .groupBy((t) => t.to)
      .map<Leader>((byTarget) => ({
        target: byTarget[0].to,
        sum3: _.reduce(byTarget, (sum, t) => sum + t.value3, 0),
      }))
      .sortBy((t) => t.sum3)
      .reverse()
      .take(MAX_TARGETS_PER_INTERVAL)
      .value();
  }
}
