const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: {
    main: path.join(__dirname, "src", "index.ts"),
  },
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
    path: path.join(__dirname, "firebase", "public"),
  },
  performance: {hints: false},
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.join("src", "*.js"),
          to: path.join(__dirname, "firebase", "public", "[name][ext]"), // TODO(evy): figure out how to properly handle the dot in [ext]
          toType: "template",
        }
      ]
    }),
    new HtmlWebpackPlugin({
      excludeChunks: ["service_worker"],
      template: path.join(__dirname, "src", "index.html"),
      publicPath: "/",
    }),
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    roots: [path.join(__dirname, "src")],
  },
};
