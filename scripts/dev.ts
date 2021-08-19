import _ from "lodash";
import { debug, filterBSC, filterETH, indexerBSC, indexerETH, leaders, ping } from "../src/main";
import child_process from "child_process";
import { log } from "../src/utils";

async function dev() {
  const args = _.reject(process.argv, (a: string) => a.includes("dev.ts"));
  const [, fn, network, token] = args;
  switch (fn) {
    case "debug":
      return JSON.parse((await debug({}, {})).body);
    case "ping":
      return JSON.parse((await ping({}, {})).body);
    case "leaders":
      return JSON.parse((await leaders({ pathParameters: { network, token } }, {})).body);
    default: {
      await preventMacSleep(async () => {
        while (true) {
          log("filtering ETH");
          await filterETH({}, {});
          log("filtering BSC");
          await filterBSC({}, {});
          log("running indexerBSC");
          await indexerBSC({}, {});
          log("running indexerETH");
          await indexerETH({}, {});
          await sleep(1);
        }
      });
    }
  }
}

async function preventMacSleep(fn: () => void) {
  const caffeinate = child_process.exec("caffeinate -dimsu");
  const kill = () => caffeinate.kill("SIGABRT");
  process.on("exit", kill);
  try {
    await fn();
  } finally {
    kill();
  }
}

async function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

dev().then(log).catch(console.error);
