import _ from "lodash";
import { allTimeLeaders, debug, filterBSC, filterETH, indexerBSC, indexerETH, ping } from "../src/main";
import { preventMacSleep, sleep } from "@defi.org/web3-candies";

async function dev() {
  const args = _.reject(process.argv, (a: string) => a.includes("dev.ts"));
  const [, fn, network, token] = args;
  switch (fn) {
    case "debug":
      return JSON.stringify(JSON.parse((await debug({}, {})).body), null, 4);
    case "ping":
      return JSON.parse((await ping({}, {})).body);
    case "allTimeLeaders":
      return JSON.parse((await allTimeLeaders({ pathParameters: { network, token } }, {})).body);
    default: {
      await preventMacSleep(async () => {
        while (true) {
          console.log("filtering ETH");
          await filterETH({}, {});
          console.log("filtering BSC");
          await filterBSC({}, {});
          console.log("running indexerBSC");
          await indexerBSC({}, {});
          console.log("running indexerETH");
          await indexerETH({}, {});
          await sleep(1);
        }
      });
    }
  }
}

dev().then(console.log).catch(console.error);
