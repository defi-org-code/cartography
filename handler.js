const path = require("path");
const fs = require("fs-extra");

const storage = path.resolve(process.env.HOME_DIR, "storage.json");

// handlers

async function reader(event, context) {
  const param = event.pathParameters.param;
  const result = await fs.readJson(storage);
  return success({ param, timestamp: new Date(result.timestamp) });
}

async function writer(event, context) {
  await fs.ensureFile(storage);
  const timestamp = new Date().getTime();
  await fs.writeJson(storage, {timestamp});
  return success("OK");
}

// helpers

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

// exports

module.exports = {
  reader: catchErrors.bind(reader),
  writer: catchErrors.bind(writer),
}
