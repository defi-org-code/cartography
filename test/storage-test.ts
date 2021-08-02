import { expect } from "chai";
import { Storage } from "../src/storage";

describe("storage", () => {
  it("blocks store", async () => {
    const uut = await Storage.create();
    expect(uut.firstBlockNumber()).eq(0);
  });
});
