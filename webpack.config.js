// webpack.config.js
const slsw = require("serverless-webpack");

module.exports = {
  mode: slsw.lib.webpack.isLocal ? "development" : "production",
  entry: slsw.lib.entries,
  resolve: {
    extensions: [".ts", "tsx"],
    // alias: {
    //   "node-fetch$": "node-fetch/lib/index.js",
    // },
  },
  target: "node",
  module: {
    rules: [
      {
        loader: "ts-loader",
      },
    ],
  },
};
