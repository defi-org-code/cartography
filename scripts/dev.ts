import _ from "lodash";
import { indexerBSC, indexerETH, info, transfers } from "../src/main";
import child_process from "child_process";

async function dev() {
  const args = _.reject(process.argv, (a: string) => a.includes("dev.ts"));
  const [, fn, network, token] = args;
  switch (fn) {
    case "info":
      return JSON.parse((await info({ pathParameters: { network } }, {})).body);
    case "transfers":
      return JSON.parse((await transfers({ pathParameters: { network, token } }, {})).body);
    case "":
    case "indexerBSC":
    default: {
      await preventMacSleep(async () => {
        while (true) {
          console.log(new Date(), "running indexerBSC");
          await indexerBSC({}, {});
          console.log(new Date(), "running indexerETH");
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

dev().then(console.log).catch(console.error);
