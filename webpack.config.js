const fs = require("fs");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  devServer: {
    compress: true,
    port: 8443,
    http2: true,
    host: "0.0.0.0",
    historyApiFallback: true,
    static: {
      directory: path.join(__dirname, "src"),
    },
    https: {
      minVersion: "TLSv1.2",
      key: fs.readFileSync(path.join(__dirname, "./localhost.key")),
      cert: fs.readFileSync(path.join(__dirname, "./localhost.pem")),
    },
  },
  devtool: "cheap-module-source-map",
  entry: {
    main: path.join(__dirname, "src", "index.ts"),
    service_worker: {
      import: path.join(__dirname, "src", "firebase-messaging-sw.ts"),
      filename: "firebase-messaging-sw.js",
    },
  },
  mode: "development",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        commons: {
          test: /[\\/]node_modules[\\/]((?!(@?firebase)).*)[\\/]/,
          name: "vendor",
          chunks: "initial",
        },
        firebase: {
          test: /[\\/]node_modules\/@?firebase[\\/]/,
          name: "firebase",
          chunks: "initial",
        },
      },
    },
  },
  output: {
    filename: "[name].[chunkhash:8].js",
    path: path.resolve(__dirname, "dist"),
  },
  performance: { hints: false },
  plugins: [
    new HtmlWebpackPlugin({
      excludeChunks: ["service_worker"],
      template: path.join(__dirname, "src", "index.html"),
      xhtml: true,
    }),
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
};
