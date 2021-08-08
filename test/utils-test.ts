import _ from "lodash";
import { expect } from "chai";
import { addDaysUTC, chunkIntervals, dayUTC, findIntervalToCache } from "../src/utils";

describe("utils", () => {
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

  it("findIntervalToCache", async () => {
    expect(findIntervalToCache(10, 100)).deep.eq({ from: 90, to: 100 });
    expect(findIntervalToCache(30, 100)).deep.eq({ from: 70, to: 100 });
    expect(findIntervalToCache(10, 100, 90, 100)).deep.eq({ from: 79, to: 89 });
    expect(findIntervalToCache(10, 100, 79, 100)).deep.eq({ from: 68, to: 78 });
    expect(findIntervalToCache(10, 115, 79, 100)).deep.eq({ from: 101, to: 115 });
    expect(findIntervalToCache(10, 300, 79, 100)).deep.eq({ from: 101, to: 300 });
    expect(findIntervalToCache(10, 100, 5, 100)).deep.eq({ from: 0, to: 4 });
    expect(findIntervalToCache(10, 100, 0, 100)).undefined;
  });

  it("findIntervalToCache lowerBound", async () => {
    expect(findIntervalToCache(80, 100, 0, 0, 50)).deep.eq({ from: 50, to: 100 });
    expect(findIntervalToCache(80, 100, 0, 100, 50)).undefined;
  });

  it("findIntervalToCache unit", async () => {
    expect(findIntervalToCache(10, 100, 0, 90, 0, 2)).deep.eq({ from: 92, to: 100 });
    expect(findIntervalToCache(10, 100, 70, 100, 0, 2)).deep.eq({ from: 58, to: 68 });
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
});
