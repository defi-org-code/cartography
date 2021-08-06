import { expect } from "chai";
import { dayUTC, findIntervalToCache } from "../src/utils";

describe("utils", () => {
  it("dayUTC", async () => {
    expect(dayUTC(Date.parse("2021-01-15T13:42:14.123Z"))).eq(Date.parse("2021-01-15T00:00:00.000Z"));
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
});
