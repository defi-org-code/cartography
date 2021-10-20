import Web3 from "web3";
import { Network, networks, setWeb3Instance, web3 } from "@defi.org/web3-candies";
import { BSC_URL, ETH_URL } from "./consts";
import { Transfers } from "./indexers/transfers";
import { silent, swizzleLog } from "./utils";
import { baseAssets, findBaseAsset, networkByName } from "./tokens";

swizzleLog();

/**
 * writers
 */
export const indexerETH = (event: any, context: any) =>
  new Main(networks.eth).execute(event, context, (m) => m.indexer());
export const indexerBSC = (event: any, context: any) =>
  new Main(networks.bsc).execute(event, context, (m) => m.indexer());
export const filterETH = (event: any, context: any) =>
  new Main(networks.eth).execute(event, context, (m) => m.ping(""));
export const filterBSC = (event: any, context: any) =>
  new Main(networks.bsc).execute(event, context, (m) => m.ping(""));

/**
 * utility
 */
export const ping = (event: any, context: any) => new Main(networks.eth).execute(event, context, (m) => m.ping(event));
export const debug = (event: any, context: any) =>
  new Main(networks.eth).execute(event, context, (m) => m.debug(event));

/**
 * readers
 */
export const allTimeLeaders = (event: any, context: any) =>
  new Main(networkByName(event.pathParameters.network)).execute(event, context, (m) =>
    m.allTimeLeaders(event.pathParameters.token)
  );

/**
 * Main
 */
class Main {
  constructor(public network: Network) {
    console.log("main", network);
    setWeb3Instance(new Web3(network.id == networks.eth.id ? ETH_URL : BSC_URL));
    console.log("web3", web3().version);
  }

  async execute(event: { pathParameters: any }, context: any, fn: (m: Main) => Promise<any>) {
    try {
      const result = await fn(this);
      return {
        statusCode: 200,
        body: JSON.stringify(result || "OK"),
      };
    } catch (err: any) {
      const message = err.stack || err.toString();
      console.error(message);
      return {
        statusCode: 500,
        body: message,
      };
    }
  }

  async indexer() {
    const currentBlock = await web3().eth.getBlockNumber();
    for (const token of baseAssets(this.network)) {
      console.log("indexing", token.name);
      const indexer = new Transfers(this.network, token, currentBlock);
      await indexer.prepare();
      await indexer.index();
    }
  }

  async debug(event: any) {}

  async ping(event: any) {
    return {
      web3: {
        eth: await silent(() => new Web3(ETH_URL).eth.getBlockNumber()),
        bsc: await silent(() => new Web3(BSC_URL).eth.getBlockNumber()),
      },
      event,
    };
  }

  async allTimeLeaders(token: string) {
    const transfers = new Transfers(
      this.network,
      findBaseAsset(this.network, token),
      await web3().eth.getBlockNumber()
    );
    await transfers.prepare();
    return { allTimeLeaders: transfers.allTimeLeaders() };
  }
}
