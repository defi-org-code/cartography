import { indexerBSC, indexerETH, info, transfers } from "../src/main";
import child_process from "child_process";

export async function dev() {
  const [, fn, network, token] = process.argv;
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
