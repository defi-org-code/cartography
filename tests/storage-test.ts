import { expect } from "chai";
import { FileStorage, MemStorage, Storage } from "../src/storage";
import * as os from "os";

describe("storage", () => {
  it("MemStorage", async () => {
    const storage = new MemStorage();
    await testStorage(storage);
  });

  it("FileStorage", async () => {
    const storage = new FileStorage(os.tmpdir());
    await testStorage(storage);
  });

  async function testStorage(storage: Storage) {
    await storage.write("foo", { bar: { baz: "123" } });
    expect(await storage.read("foo")).deep.eq({ bar: { baz: "123" } });
    await storage.delete("foo");
    expect(await storage.read("foo")).deep.eq({});
  }
});
