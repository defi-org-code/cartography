import _ from "lodash";
import Web3 from "web3";
import Redis from "ioredis";
import { erc20, erc20s, setWeb3Instance, web3 } from "@defi.org/web3-candies";
import { BSC_URL, BSC_URL2, REDIS_URL } from "./consts";
import { Transfers } from "./indexers/transfers";
import { withLock } from "./lock";

// const storagePath = path.resolve(process.env.HOME_DIR || os.tmpdir(), "storage.json");

// handlers

async function _indexerBSC(event: any, context: any) {
  return await withLock(async () => {
    await withState(async (redis) => {
      const network = "bsc";
      const baseAssets = [
        erc20s.bsc.WBNB(),
        erc20s.bsc.BTCB(),
        erc20s.bsc.BUSD(),
        erc20s.bsc.USDC(),
        erc20s.bsc.USDT(),
      ];
      for (const token of baseAssets) {
        const transfers = new Transfers(redis, network, token);
        await transfers.updateIndex();
      }
    });

    return success();
  });
}

async function _info(event: any, context: any) {
  return await withState(async (redis) => {
    const network = "bsc";
    const baseAssets = [erc20s.bsc.WBNB(), erc20s.bsc.BTCB(), erc20s.bsc.BUSD(), erc20s.bsc.USDC(), erc20s.bsc.USDT()];
    const transfers = {} as any;
    for (const token of baseAssets) {
      const ts = new Transfers(redis, network, token);
      transfers[token.name] = {
        indexed: await ts.indexedBounds(),
        next: await ts.nextInterval(await web3().eth.getBlockNumber()),
      };
    }

    return success({
      bsc: {
        transfers,
      },
      redis: {
        info: await redis.info(),
      },
    });
  });
}

async function _transfers(event: any, context: any) {
  return await withState(async (redis) => {
    const { network, tokenAddress } = event.pathParameters;
    const baseAssets = [erc20s.bsc.WBNB(), erc20s.bsc.BTCB(), erc20s.bsc.BUSD(), erc20s.bsc.USDC(), erc20s.bsc.USDT()];
    let token = _.find(baseAssets, (t) => t.address.toLowerCase() == tokenAddress.toLowerCase());
    if (!token) {
      token = _.find(baseAssets, (t) => t.name.toLowerCase().replace("$", "") == tokenAddress.toLowerCase());
      if (!token) throw new Error(`${tokenAddress} not found`);
    }
    const transfers = new Transfers(redis, network, token);

    return success({
      [token.name]: {
        // daily: await transfers.topTokenTransfersReceiversDaily(date),
        allTime: await transfers.topTokenTransfersReceiversAllTime(),
      },
    });
  });
}

async function _blockRange(event: any, context: any) {
  return await withState(async (redis) => {
    // const { network, date } = event.pathParameters;
    return success();
  });
}

// wrapper

async function success(result: any = "OK") {
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
}

async function catchErrors(this: any, event: any, context: any) {
  try {
    return await this(event, context);
  } catch (err) {
    const message = err.stack || err.toString();
    console.error(message);
    return {
      statusCode: 500,
      body: message,
    };
  }
}

async function withState(fn: (redis: Redis.Redis) => Promise<any>) {
  setWeb3Instance(new Web3(BSC_URL2));
  const redis = new Redis(process.env.HOME_DIR ? REDIS_URL : undefined);
  try {
    return await fn(redis);
  } finally {
    await redis.quit();
  }
}

// exports

export const indexerBSC = catchErrors.bind(_indexerBSC);
export const info = catchErrors.bind(_info);
export const transfers = catchErrors.bind(_transfers);
export const blockRange = catchErrors.bind(_blockRange);
