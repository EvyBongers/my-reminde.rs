const {merge} = require("webpack-merge");
const common = require("./webpack.common.js");

const fs = require("fs");
const path = require("path");

module.exports = merge(common, {
  devServer: {
    compress: true,
    port: 8080,
    host: "0.0.0.0",
    historyApiFallback: true,
    server: "http",
    static: {
      directory: path.join(__dirname, "src"),
    },
  },
  devtool: "cheap-module-source-map",
  mode: "development",
});
