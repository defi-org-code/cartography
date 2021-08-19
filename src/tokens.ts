import _ from "lodash";
import { erc20s, IERC20, web3 } from "@defi.org/web3-candies";

export type Network = "eth" | "bsc";

export function findBaseAsset(network: Network, token: string): IERC20 {
  const theToken = _.find(
    baseAssets(network),
    (a) =>
      web3().utils.toChecksumAddress(a.address) == web3().utils.toChecksumAddress(token) ||
      a.name.toLowerCase().replace("$", "") == token.toLowerCase()
  );
  if (!theToken) throw new Error(`${token} not found in network ${network}`);
  return theToken;
}

export function baseAssets(network: Network): IERC20[] {
  switch (network) {
    case "eth":
      return [erc20s.eth.WETH(), erc20s.eth.WBTC(), erc20s.eth.USDC(), erc20s.eth.USDT(), erc20s.eth.DAI()];
    case "bsc":
      return [erc20s.bsc.WBNB(), erc20s.bsc.BTCB(), erc20s.bsc.USDC(), erc20s.bsc.USDT(), erc20s.bsc.BUSD()];
  }
}
