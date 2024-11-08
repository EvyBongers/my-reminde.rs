const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const firebase = require("firebase/package.json");

function inject_module_versions(content) {
  return content.toString()
    .replaceAll('__FIREBASE_SDK_VERSION__', firebase.version);
}

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
          from: path.join("src", "*.{js,json,webmanifest}"),
          to: path.join(__dirname, "firebase", "public", "[name][ext]"), // TODO(evy): figure out how to properly handle the dot in [ext]
          toType: "template",
          transform: function (content, path) {
            return inject_module_versions(content)
          },
        },
        {
          from: path.join("src", "images"),
          to: path.join(__dirname, "firebase", "public", "images"),
        },
      ],
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
