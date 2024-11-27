const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: {
        popup: "./src/popup.js",
        serviceWorker: "./src/serviceWorker.js",
        content: "./src/content.js",
        injected: "./src/injected.js",
    },
    output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "dist"),
    },
    mode: "development",
    devtool: "cheap-module-source-map",
    plugins: [
        new CopyWebpackPlugin({
            patterns: [{ from: "static" }],
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, "dist"),
        },
        compress: true,
        port: 3000,
        hot: true,
        devMiddleware: {
            writeToDisk: true,
        },
    },
};
