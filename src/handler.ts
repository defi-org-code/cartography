import _ from "lodash";
import path from "path";
import fs from "fs-extra";
import os from "os";
import Web3 from "web3";
import { setWeb3Instance, web3 } from "@defi.org/web3-candies";

const STORAGE_VERSION = 10;
const STEP_WAIT_SEC = 10;
const ITER_PER_STEP = 60 / STEP_WAIT_SEC;
const SECONDS_PER_BLOCK = 3;
const storage = path.resolve(process.env.HOME_DIR || os.tmpdir(), "storage.json");
const lock = path.resolve(process.env.HOME_DIR || os.tmpdir(), "lock");
const secrets = JSON.parse(process.env.REPO_SECRETS_JSON || "{}");

// handlers

interface Storage {
  version: number;
  blocks: Record<number, number>;
}

function newStorage(): Storage {
  return { version: STORAGE_VERSION, blocks: {} };
}

async function initStorage(): Promise<Storage> {
  try {
    await fs.ensureFile(storage);
    const store: Storage = await fs.readJson(storage);
    if (!store.version || store.version < STORAGE_VERSION) {
      await fs.remove(storage);
      return newStorage();
    } else {
      return store;
    }
  } catch (e) {
    return newStorage();
  }
}

async function isLocked() {
  try {
    return fs.existsSync(lock) && _.get(await fs.readJson(lock), ["locked"], 0) > Date.now() - 60 * 1000;
  } catch (e) {
    return false;
  }
}

async function _writer(event: any, context: any) {
  if (await isLocked()) {
    console.log("locked");
    return;
  }
  try {
    await fs.writeJson(lock, { locked: Date.now() });
    console.log("running writer");

    const iteration = _.get(event, ["taskresult", "body", "iteration"], 0);
    console.log("iteration", iteration);

    // setWeb3Instance(new Web3(`https://eth-mainnet.alchemyapi.io/v2/${secrets.ALCHEMY_KEY}`));
    setWeb3Instance(new Web3(`https://cold-silent-rain.bsc.quiknode.pro/${secrets.QUICKNODE_KEY}/`));

    await writeBlocks();

    return success({ iteration: iteration + 1 }, iteration < ITER_PER_STEP);
  } finally {
    fs.removeSync(lock);
  }
}

async function writeBlocks() {
  const cache = await initStorage();
  const current = await web3().eth.getBlockNumber();
  const firstBlock = _.toNumber(_(cache.blocks).keys().sortBy(_.toNumber).first() || current - 60 / SECONDS_PER_BLOCK);
  console.log("running from ", firstBlock);
  for (let i = firstBlock; i <= current; i++) {
    if (!cache.blocks[i]) {
      console.log("fetching missing block", i);
      await onBlock(cache, i);
      await fs.writeJson(storage, cache);
    }
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
  // const b = await web3().eth.getBlock(blockNumber, true);

  const blockLogs = await web3().eth.getPastLogs({
    fromBlock: blockNumber,
    toBlock: blockNumber,
    topics: [transferTopic],
  });

  const transfers = _(blockLogs)
    .map((log) => {
      try {
        const { from, to, value } = web3().eth.abi.decodeLog(
          transferAbi,
          log.data,
          _.reject(log.topics, (t) => t == transferTopic)
        );
        return { from, to, value };
      } catch (e) {}
    })
    .filter((l) => !!l)
    .map((l) => l!!)
    .value();

  cache.blocks[blockNumber] = transfers.length;
}

async function _reader(event: any, context: any) {
  const length = event.pathParameters.param;
  const cache = await initStorage();
  // const keys = _(cache.blocks)
  //   .keys()
  //   .map((k) => Number(k))
  //   .sort()
  //   .value();
  // const first = _.first(keys);
  // const last = _.last(keys);
  //
  // for (let i = 0; i < keys.length; i++) {
  //   if (keys[i] + 1 == keys[i+1]) {
  //
  //   }
  // }

  return success(cache);
}

// wrapper

function success(result: any, _continue?: boolean) {
  return {
    statusCode: 200,
    body: JSON.stringify(result),
    continue: _continue,
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

export const reader = catchErrors.bind(_reader);
export const writer = catchErrors.bind(_writer);
