const path = require("path");
const fs = require("fs-extra");
const fetch = require("node-fetch");

const storage = path.resolve(process.env.HOME_DIR, "storage.json");

// handlers

async function reader(event, context) {
  const param = event.pathParameters.param;
  const {timestamp, writeIP} = await fs.readJson(storage);
  const readIP = (await fetchGZippedResponse()).origin;
  return success({param, timestamp: new Date(timestamp), writeIP, readIP, event, context});
}

async function writer(event, context) {
  await fs.ensureFile(storage);
  const timestamp = new Date().getTime();
  const writeIP = (await fetchGZippedResponse()).origin;
  await fs.writeJson(storage, {timestamp, writeIP});
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

async function fetchGZippedResponse() {
  const response = await fetch("https://httpbin.org/gzip"); // returns gzipped response with request info
  return await response.json();
}

// exports

module.exports = {
  reader: catchErrors.bind(reader),
  writer: catchErrors.bind(writer),
}
