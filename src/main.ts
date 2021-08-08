import Web3 from "web3";
import path from "path";
import os from "os";
import fs from "fs-extra";
import Redis from "ioredis";
import { erc20s, setWeb3Instance } from "@defi.org/web3-candies";
import { BSC_URL, REDIS_URL } from "./consts";
import { Transfers } from "./indexers/transfers";
import { Blocks } from "./indexers/blocks";
import { withLock } from "./lock";

const storagePath = path.resolve(process.env.HOME_DIR || os.tmpdir(), "storage.json");

setWeb3Instance(new Web3(BSC_URL));
const redis = new Redis(process.env.HOME_DIR ? REDIS_URL : undefined);

// handlers

async function _indexerBSC(event: any, context: any) {
  await withLock(async () => {
    await fs.remove(storagePath);

    const token = erc20s.bsc.BTCB();
    const blocks = new Blocks(redis, "bsc");
    const transfers = new Transfers(redis, "bsc", blocks, token);

    await blocks.updateIndex();
    await transfers.updateIndex();
  });

  return success();
}

async function _info(event: any, context: any) {
  const token = erc20s.bsc.BTCB();

  const blocks = new Blocks(redis, "bsc");
  const transfers = new Transfers(redis, "bsc", blocks, token);

  return success({
    bsc: {
      blocks: {
        latest: await blocks.latestIndexed(),
        earliest: await blocks.earliestIndexed(),
      },
      transfers: {
        [token.name]: {
          earliest: await transfers.earliestDayIndexed(),
        },
      },
      redis: {
        info: await redis.info(),
      },
    },
  });
}

async function _blockRange(event: any, context: any) {
  const { network, date } = event.pathParameters;
  const parsed = Date.parse(date);
  const blocks = new Blocks(redis, network);
  return success(await blocks.blockRangeForDay(parsed));
}

async function _transfers(event: any, context: any) {
  const { network, date } = event.pathParameters;

  const token = erc20s.bsc.BTCB();
  const blocks = new Blocks(redis, network);
  const transfers = new Transfers(redis, network, blocks, token);

  return success({
    [token.name]: {
      daily: await transfers.topTokenTransfersReceiversDaily(date),
      allTime: await transfers.topTokenTransfersReceiversAllTime(),
    },
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

// exports

export const indexerBSC = catchErrors.bind(_indexerBSC);
export const info = catchErrors.bind(_info);
export const blockRange = catchErrors.bind(_blockRange);
export const transfers = catchErrors.bind(_transfers);
