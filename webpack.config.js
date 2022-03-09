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
  },
  devtool: "inline-source-map",
  entry: path.join(__dirname, "src", "index.ts"),
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
      template: path.join(__dirname, "src", "index.html"),
      xhtml: true,
    }),
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
};
