import path from "path";
import os from "os";
import fs from "fs-extra";
import _ from "lodash";

export const lockPath = path.resolve(process.env.HOME_DIR || os.tmpdir(), "lock.json");
export const lockTTL = 60 * 1000;

export async function withLock(fn: () => Promise<any>): Promise<any> {
  if (isLocked()) return;
  try {
    fs.writeJsonSync(lockPath, { timestamp: Date.now() });
    return await fn();
  } finally {
    fs.removeSync(lockPath);
  }
}

function isLocked() {
  try {
    return _.get(fs.readJsonSync(lockPath), ["timestamp"], 0) > Date.now() - lockTTL;
  } catch (e) {
    return false;
  }
}
