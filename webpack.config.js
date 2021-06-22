const slsw = require("serverless-webpack");

module.exports = {
  mode: slsw.lib.webpack.isLocal ? "development" : "production",
  entry: slsw.lib.entries,
  resolve: {
    extensions: [".ts", "tsx"],
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
