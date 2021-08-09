import _ from "lodash";
import { web3 } from "@defi.org/web3-candies";
import { addDaysUTC, dayUTC, findIntervalToCache } from "../utils";
import { Indexer } from "./indexer";
import { MAX_DAYS_BACK } from "../consts";

const millisPerDay = 1000 * 60 * 60 * 24;

export class Blocks extends Indexer {
  prefix() {
    return `cartography:blocks:${this.network}`;
  }

  async updateIndex() {
    const key = this.kBlockNumberByDay();
    const length = millisPerDay * MAX_DAYS_BACK;
    const today = dayUTC();
    const lowerBound = dayUTC(today - length);

    const missing = findIntervalToCache(
      length,
      today,
      await this.earliestIndexed(),
      await this.latestIndexed(),
      lowerBound,
      millisPerDay
    );

    if (!missing) return;

    const blockInfos = await blockNumbersEveryDate("days", missing.from, missing.to);
    await Promise.all(_.map(blockInfos, (b) => this.redis.send_command("ZADD", key, Date.parse(b.date), b.block)));
  }

  async earliestIndexed() {
    const [, earliest] = await this.redis.send_command("ZRANGE", this.kBlockNumberByDay(), 0, 0, "WITHSCORES");
    return _.toInteger(earliest);
  }

  async latestIndexed() {
    const [, latest] = await this.redis.send_command("ZRANGE", this.kBlockNumberByDay(), 0, 0, "REV", "WITHSCORES");
    return _.toInteger(latest);
  }

  async getFirstBlockOfUTCDay(timestamp: number = Date.now()): Promise<number> {
    const day = dayUTC(timestamp);
    const key = this.kBlockNumberByDay();
    const [res] = await this.redis.send_command("ZRANGE", key, day, day, "BYSCORE", "LIMIT", 0, 1);
    return _.toInteger(res);
  }

  async blockRangeForDay(timestamp: number) {
    const from = await this.getFirstBlockOfUTCDay(timestamp);
    const to = (await this.getFirstBlockOfUTCDay(addDaysUTC(1, timestamp))) - 1;
    return { from, to };
  }

  kBlockNumberByDay() {
    return `${this.prefix()}:daily`.toLowerCase();
  }
}

// TODO optimize this!
// fetch blocks:

const EthDater = require("ethereum-block-by-date");
let ethDaterInstance: any = undefined;

interface IBlockByDate {
  date: string;
  block: number;
  timestamp: number;
}

async function blockNumbersEveryDate(
  period: "years" | "quarters" | "months" | "weeks" | "days" | "hours" | "minutes",
  startDate: string | number | Date,
  endDate: string | number | Date,
  duration?: number, // default 1
  after?: boolean // default true
): Promise<IBlockByDate[]> {
  if (!ethDaterInstance) ethDaterInstance = new EthDater(web3());
  return await ethDaterInstance.getEvery(period, startDate, endDate, duration, after);
}
async function blockNumberByDate(date: string | number | Date): Promise<IBlockByDate> {
  if (!ethDaterInstance) ethDaterInstance = new EthDater(web3());
  return ethDaterInstance.getDate(date);
}
