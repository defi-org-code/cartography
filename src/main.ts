import _ from "lodash";
import Web3 from "web3";
import Redis from "ioredis";
import { erc20s, setWeb3Instance, web3 } from "@defi.org/web3-candies";
import { BSC_URL, ETH_URL, REDIS_URL } from "./consts";
import { Transfers } from "./indexers/transfers";
import { log, silent } from "./utils";
import { baseAssets, findBaseAsset, Network } from "./tokens";
import { Filter } from "./indexers/filter";

// writers
export const indexerBSC = (event: any, context: any) => new Main("bsc").execute(event, context, (m) => m.indexer());
export const indexerETH = (event: any, context: any) => new Main("eth").execute(event, context, (m) => m.indexer());
export const filterETH = (event: any, context: any) => new Main("eth").execute(event, context, (m) => m.filter());
export const filterBSC = (event: any, context: any) => new Main("bsc").execute(event, context, (m) => m.filter());

// utility
export const ping = (event: any, context: any) => new Main("eth").execute(event, context, (m) => m.ping(event));
export const debug = (event: any, context: any) =>
  new Main("eth").execute(event, context, (m) => m.debug(_.get(event.queryStringParameters, "flush")));

// readers
export const leaders = (event: any, context: any) =>
  new Main(event.pathParameters.network).execute(event, context, (m) => m.leaders(event.pathParameters.token));

class Main {
  redis: Redis.Redis;

  constructor(public network: Network) {
    log("main", network);
    setWeb3Instance(new Web3(network == "eth" ? ETH_URL : BSC_URL));
    log("web3", web3().version);
    this.redis = new Redis(process.env.HOME_DIR ? REDIS_URL : undefined);
    log("redis", this.redis.options.host);
  }

  async execute(event: { pathParameters: any }, context: any, fn: (m: Main) => Promise<any>) {
    try {
      const result = await fn(this);
      return {
        statusCode: 200,
        body: JSON.stringify(result || "OK"),
      };
    } catch (err) {
      const message = err.stack || err.toString();
      console.error(message);
      return {
        statusCode: 500,
        body: message,
      };
    } finally {
      await this.redis.quit();
    }
  }

  async indexer() {
    const currentBlock = await this.currentBlock();
    for (const token of baseAssets(this.network)) {
      log("indexing", token.name);
      const indexer = new Transfers(this.redis, this.network, token, currentBlock);
      await indexer.updateIndex();
    }
  }

  async filter() {
    const currentBlock = await this.currentBlock();
    for (const token of baseAssets(this.network)) {
      log("filtering", token.name);
      const transfers = new Transfers(this.redis, this.network, token, currentBlock);
      const indexer = new Filter(this.redis, this.network, transfers);
      await indexer.updateIndex();
    }
    // for (const token of this.assets(this.network)) {
    //   log("consuming info on", token.name);
    //   const response = await this.transfers(token.address);
    //   const leaders: string[] = response[token.name].allTime;
    //
    //   for (const address of leaders) {
    //     const k = `test:consumed:${this.network}:${token.name}:${address}`;
    //     await this.redis.send_command("SADD", "test:consumed:keys", k);
    //     try {
    //       const code = await web3().eth.getCode(address);
    //       if (code) {
    //         const erc = erc20("unknown", address);
    //         const [decimals, name, symbol] = await Promise.all([
    //           erc.methods.decimals().call(),
    //           erc.methods.name().call(),
    //           erc.methods.symbol().call(),
    //         ]);
    //         await this.redis.send_command(
    //           "HMSET",
    //           k,
    //           "address",
    //           address,
    //           "decimals",
    //           decimals,
    //           "name",
    //           name,
    //           "symbol",
    //           symbol,
    //           "erc20",
    //           "true"
    //         );
    //       } else {
    //         await this.redis.send_command("HMSET", `${k}:eoa`, "address", address, "erc20", "false", "type", "EOA");
    //       }
    //     } catch (e) {
    //       await this.redis.send_command("HMSET", `${k}:unknown`, "address", address, "erc20", "false");
    //     }
    //   }
    // }
  }

  async debug(flush: boolean) {
    if (flush) {
      await this.redis.flushall(); //TODO remove after stabilize
    }

    const transfers = {
      eth: {},
      bsc: {},
    } as any;

    for (const network of ["eth", "bsc"]) {
      setWeb3Instance(new Web3(network == "eth" ? ETH_URL : BSC_URL));
      const currentBlock = await this.currentBlock();
      transfers[network].currentBlock = currentBlock;

      await Promise.all(
        baseAssets(network as any).map((token) => {
          const ts = new Transfers(this.redis, network as any, token, currentBlock);
          return Promise.all([ts.indexedBounds(), ts.nextInterval(currentBlock)]).then(([indexed, next]) => {
            transfers[network][token.name] = { indexed, next };
          });
        })
      );
    }

    return { transfers };
  }

  async ping(event: any) {
    return {
      web3: {
        eth: await silent(() => new Web3(ETH_URL).eth.getBlockNumber()),
        bsc: await silent(() => new Web3(BSC_URL).eth.getBlockNumber()),
      },
      redis: {
        ping: await silent(() => this.redis.ping()),
        info: await silent(() => this.redis.info()),
      },
      event,
    };
  }

  async leaders(token: string) {
    const t = findBaseAsset(this.network, token);
    log("found token", t.name);
    const currentBlock = await this.currentBlock();
    log("currentBlock", currentBlock);
    const transfers = new Transfers(this.redis, this.network, t, currentBlock);
    log("transfers bounds", await transfers.indexedBounds());

    return {
      allTime: await transfers.topTokenTransferReceiversAllTime(),
    };
  }

  async currentBlock() {
    return web3().eth.getBlockNumber();
  }
}
