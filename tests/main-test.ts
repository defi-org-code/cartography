import { onSchedule, storageKey } from "../src/main";
import { MemStorage } from "../src/storage";

describe("main", () => {
  it("schedule with MemStorage", async () => {
    const storage = new MemStorage();
    await onSchedule(storage);
    await storage.read(storageKey);
  });
});
