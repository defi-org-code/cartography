import * as path from "path";
import * as os from "os";

const SECRETS = JSON.parse(process.env.REPO_SECRETS_JSON || "{}");

export const STORAGE_DIR = path.resolve(process.env.HOME_DIR || os.tmpdir(), "storage");

export const INTERVAL_SIZE = 1000; // blocks
export const REQ_CHUNK_SIZE = 100; // blocks
export const MAX_HISTORY_BLOCKS_BSC = 1_000_000; // ~1month
export const MAX_HISTORY_BLOCKS_ETH = 200_000; // ~1month

export const BSC_URL = SECRETS.QUICKNODE || config().quicknodeUrl;
export const ETH_URL = SECRETS.ALCHEMY || config().alchemyUrl;

function config() {
  try {
    return require("../.config.json");
  } catch (e) {
    return {};
  }
}
