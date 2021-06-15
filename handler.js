import { FileStorage } from "./src/storage";
import { onGet, onSchedule } from "./src/main";

const storage = new FileStorage(process.env.HOME_DIR);

// handlers

async function reader(event, context) {
  return success(await onGet(storage, event.pathParameters.param));
}

async function writer(event, context) {
  await onSchedule(storage);
  return success("OK");
}

function success(result) {
  return {
    statusCode: 200,
    body: JSON.stringify(result, null, 2),
  };
}

async function catchErrors(event, context) {
  try {
    return await this(event, context);
  } catch (err) {
    return {
      statusCode: 500,
      body: err.stack || err.toString(),
    };
  }
}

module.exports = {
  reader: catchErrors.bind(reader),
  writer: catchErrors.bind(writer),
};
