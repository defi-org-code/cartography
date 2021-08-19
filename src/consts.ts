const secrets = JSON.parse(process.env.REPO_SECRETS_JSON || "{}");
// const storagePath = path.resolve(process.env.HOME_DIR || os.tmpdir(), "storage.json");

export const INTERVAL_SIZE = 1000;
export const REQ_CHUNK_SIZE = 100;
export const MAX_DAYS_BACK = 90;

export const BSC_URL = secrets.QUICKNODE || config().quicknodeUrl;
export const BSC_URL2 = secrets.QUICKNODE2 || config().quicknodeUrl2;
export const ETH_URL = secrets.ALCHEMY || config().alchemyUrl;
export const REDIS_URL = secrets.REDIS;

function config() {
  try {
    return require("../.config.json");
  } catch (e) {
    return {};
  }
}
