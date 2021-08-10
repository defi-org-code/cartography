import _ from "lodash";
import Web3 from "web3";
import Redis from "ioredis";
import { erc20s, setWeb3Instance, web3 } from "@defi.org/web3-candies";
import { BSC_URL, ETH_URL, REDIS_URL } from "./consts";
import { Transfers } from "./indexers/transfers";
import { log } from "./utils";

export const indexerBSC = (event: any, context: any) => new Main("bsc").execute(event, context, (m) => m.indexerBSC());
export const indexerETH = (event: any, context: any) => new Main("eth").execute(event, context, (m) => m.indexerETH());
export const info = (event: any, context: any) => new Main("eth").execute(event, context, (m) => m.info());
export const transfers = (event: any, context: any) =>
  new Main(event.pathParameters.network).execute(event, context, (m) => m.transfers(event.pathParameters.token));

class Main {
  redis: Redis.Redis;
  constructor(public network: "eth" | "bsc") {
    log("main");
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
        body: JSON.stringify(result),
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

  async indexerBSC() {
    console.log("PINGING:");
    const result = await this.redis.ping();
    console.log("PING result", result);
    return result;
    // for (const token of this.assets(this.network)) {
    //   const transfers = new Transfers(this.redis, this.network, token);
    //   await transfers.updateIndex();
    // }
  }

  async indexerETH() {
    for (const token of this.assets(this.network)) {
      const transfers = new Transfers(this.redis, this.network, token);
      await transfers.updateIndex();
    }
  }

  async info() {
    const transfers = {
      eth: {},
      bsc: {},
    } as any;
    for (const network of ["eth", "bsc"]) {
      setWeb3Instance(new Web3(network == "eth" ? ETH_URL : BSC_URL));
      const currentBlock = await web3().eth.getBlockNumber();
      for (const token of this.assets(network as any)) {
        const ts = new Transfers(this.redis, network as any, token);
        transfers[network][token.name] = {
          indexed: await ts.indexedBounds(),
          next: await ts.nextInterval(currentBlock),
        };
      }
    }
    return {
      transfers,
      redis: {
        info: await this.redis.info(),
      },
    };
  }

  async transfers(token: string) {
    log("main->transfers", token);
    const t = this.findToken(this.network, token);
    log("t", t.name);
    const transfers = new Transfers(this.redis, this.network, t);
    log("transfers bounds", await transfers.indexedBounds());

    return {
      [t.name]: {
        // daily: await transfers.topTokenTransfersReceiversDaily(date),
        allTime: await transfers.topTokenTransfersReceiversAllTime(),
      },
    };
  }

  findToken(network: "bsc" | "eth", token: string) {
    const theToken = _.find(
      this.assets(network),
      (a) =>
        a.address.toLowerCase() == token.toLowerCase() || a.name.toLowerCase().replace("$", "") == token.toLowerCase()
    );
    if (!theToken) throw new Error(`${token} not found in network ${network}`);
    return theToken;
  }

  assets(network: "eth" | "bsc") {
    switch (network) {
      case "bsc":
        return [erc20s.bsc.WBNB(), erc20s.bsc.BTCB(), erc20s.bsc.BUSD(), erc20s.bsc.USDC(), erc20s.bsc.USDT()];
      case "eth":
        return [erc20s.eth.WETH(), erc20s.eth.WBTC(), erc20s.eth.USDC(), erc20s.eth.USDT(), erc20s.eth.DAI()];
    }
  }
}
