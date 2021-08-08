const secrets = JSON.parse(process.env.REPO_SECRETS_JSON || "{}");

export const MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
export const MAX_DAYS_BACK = 90;
// export const BSC_URL = `https://cold-silent-rain.bsc.quiknode.pro/${secrets.QUICKNODE_KEY2 || config().quicknodeKey2}/`;
export const BSC_URL = `https://long-thrumming-dream.bsc.quiknode.pro/${
  secrets.QUICKNODE_KEY || config().quicknodeKey
}/`;
export const REDIS_URL = "base-assets-redis.u4gq8o.0001.use2.cache.amazonaws.com";

function config() {
  try {
    return require("../.config.json");
  } catch (e) {
    return {};
  }
}
