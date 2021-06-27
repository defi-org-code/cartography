import { FileStorage } from "./src/storage";
import { onGet, onSchedule } from "./src/main";
import * as os from "os";

const storage = new FileStorage(process.env.HOME_DIR || os.tmpdir());

// handlers

async function reader(event: any, context: any) {
  return success(await onGet(storage, event.pathParameters.param));
}

async function writer(event: any, context: any) {
  await onSchedule(storage);
  return success("OK");
}

// wrappers

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

// exports

export default {
  reader: catchErrors.bind(reader),
  writer: catchErrors.bind(writer),
};
