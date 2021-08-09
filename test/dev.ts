import { indexerBSC } from "../src/main";

export async function dev() {
  return await indexerBSC({}, {});

  // return JSON.parse((await transfers({ pathParameters: { network: "bsc", date: addDaysUTC(-2) } }, {})).body);

  // return JSON.parse((await blockRange({ pathParameters: {} }, {})).body);
}
