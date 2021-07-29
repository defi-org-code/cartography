import _ from "lodash";
import path from "path";
import fs from "fs-extra";
import os from "os";
import Web3 from "web3";
import { erc20s, estimatedBlockNumber, setWeb3Instance, web3 } from "@defi.org/web3-candies";

const storage = path.resolve(process.env.HOME_DIR || os.tmpdir(), "storage.json");
const secrets = JSON.parse(process.env.REPO_SECRETS_JSON || "{}");
const STORAGE_VERSION = 3;

// handlers

interface Storage {
  version: number;
  blocks: Record<number, number>;
}

async function initStorage(): Promise<Storage> {
  try {
    await fs.ensureFile(storage);
    const store: Storage = await fs.readJson(storage);
    if (!store.version || store.version < STORAGE_VERSION) {
      await fs.remove(storage);
      return { version: STORAGE_VERSION, blocks: {} };
    } else {
      return store;
    }
  } catch (e) {
    return { version: STORAGE_VERSION, blocks: {} };
  }
}

async function _writer(event: any, context: any) {
  console.log("running writer");
  let currentRun: number = 0;

  if (event["taskresult"]) {
    const previousResult = JSON.parse(event["taskresult"].body);
    currentRun = previousResult.currentRun;
  }
  console.log("current run", currentRun);

  const cache = await initStorage();

  // setWeb3Instance(new Web3(`https://eth-mainnet.alchemyapi.io/v2/${secrets.ALCHEMY_KEY}`));
  setWeb3Instance(new Web3(`https://cold-silent-rain.bsc.quiknode.pro/${secrets.QUICKNODE_KEY}/`));

  await writeBlocks(cache);

  return success({ currentRun: currentRun + 1 }, currentRun < 60);
}

async function writeBlocks(cache: Storage) {
  const current = await web3().eth.getBlockNumber();
  const firstBlock = current - (60 * 60 * 24) / 3;
  for (let i = firstBlock; i <= current; i++) {
    if (!cache.blocks[current]) await onBlock(cache, current);
  }
}

const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const transferAbi = [
  {
    indexed: true,
    internalType: "address",
    name: "from",
    type: "address",
  },
  {
    indexed: true,
    internalType: "address",
    name: "to",
    type: "address",
  },
  {
    indexed: false,
    internalType: "uint256",
    name: "value",
    type: "uint256",
  },
];

async function onBlock(cache: Storage, blockNumber: number) {
  // const logs = await web3().eth.getPastLogs({
  //   fromBlock: blockNumber,
  //   toBlock: blockNumber,
  //   topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"], // Transfer
  // });
  // cache.blocks[blockNumber] = _(logs).mapValues((l) => ({from:l.}));

  const blockLogs = await web3().eth.getPastLogs({
    fromBlock: blockNumber,
    toBlock: blockNumber,
    topics: [transferTopic],
  });
  console.log("blockLogs.length", blockLogs.length);

  const transfers = _.map(blockLogs, (log) => {
    try {
      const { from, to, value } = web3().eth.abi.decodeLog(
        transferAbi,
        log.data,
        _.reject(log.topics, (t) => t == transferTopic)
      );
      return { from, to, value };
    } catch (e) {
      return undefined;
    }
  }).filter((l) => !!l);
  console.log("transfers", transfers.length);

  cache.blocks[blockNumber] = transfers.length;

  await fs.writeJson(storage, cache);
}

async function _reader(event: any, context: any) {
  const length = event.pathParameters.param;
  const cache = await initStorage();
  return success(cache);
}

// wrapper

function success(result: any, _continue?: boolean) {
  const response: any = {
    statusCode: 200,
    body: JSON.stringify(result),
  };
  if (_continue !== undefined) {
    response.continue = _continue;
  }
  return response;
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

export const reader = catchErrors.bind(_reader);
export const writer = catchErrors.bind(_writer);
