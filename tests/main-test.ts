import { execSync } from "child_process";
import os from "os";

describe("main", () => {
  it("node loads handler", async () => {
    execSync(`HOME_DIR=${os.tmpdir()} node ./handler.js`);
  });
});
