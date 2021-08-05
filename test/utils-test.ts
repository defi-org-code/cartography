import { expect } from "chai";
import { dayUTC, findMissingInterval } from "../src/utils";

describe("utils", () => {
  it("dayUTC", async () => {
    expect(dayUTC(Date.parse("2021-01-15T13:42:14.123Z"))).eq(Date.parse("2021-01-15T00:00:00.000Z"));
  });

  it("findMissingInterval", async () => {
    expect(findMissingInterval(10, 100)).deep.eq({ from: 90, to: 100 });
    expect(findMissingInterval(30, 100)).deep.eq({ from: 70, to: 100 });
    expect(findMissingInterval(10, 100, 90, 100)).deep.eq({ from: 79, to: 89 });
    expect(findMissingInterval(10, 100, 79, 100)).deep.eq({ from: 68, to: 78 });
    expect(findMissingInterval(10, 115, 79, 100)).deep.eq({ from: 101, to: 115 });
    expect(findMissingInterval(10, 300, 79, 100)).deep.eq({ from: 101, to: 300 });
    expect(findMissingInterval(10, 100, 5, 100)).deep.eq({ from: 0, to: 4 });
    expect(findMissingInterval(10, 100, 0, 100)).deep.eq({ from: 0, to: 0 });
  });
});
