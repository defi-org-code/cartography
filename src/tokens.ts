import _ from "lodash";
import { erc20s, IERC20, Network, networks } from "@defi.org/web3-candies";

export function networkByName(name: string): Network {
  return _.find(networks, (n) => n.shortname == name || n.id.toString() == name)!!;
}

export function findBaseAsset(network: Network, token: string): IERC20 {
  const theToken = _.find(
    baseAssets(network),
    (a) =>
      a.address.toLowerCase() == token.toLowerCase() || a.name.toLowerCase().replace("$", "") == token.toLowerCase()
  );
  if (!theToken) throw new Error(`${token} not found in network ${network.name}`);
  return theToken;
}

export function baseAssets(network: Network): IERC20[] {
  return _.values(_.get(erc20s, [network.shortname])).map((fn) => fn());
}
