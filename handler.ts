import { FileStorage } from "./src/storage";
import { onGet, onSchedule } from "./src/main";
import * as os from "os";

const storage = new FileStorage(process.env.HOME_DIR || os.tmpdir());

async function _writer(event: any, context: any) {}

function success(result: any) {
  return {
    statusCode: 200,
    body: JSON.stringify(result, null, 2),
  };
}

async function catchErrors(this: any, event: any, context: any) {
  try {
    return await this(event, context);
  } catch (err) {
    return {
      statusCode: 500,
      body: err.stack || err.toString(),
    };
  }
}

export const reader = catchErrors.bind(async (event: any, context: any) =>
  success(await onGet(storage, event.pathParameters.param))
);

export const writer = catchErrors.bind(async (event: any, context: any) => {
  await onSchedule(storage);
  success("OK");
});
