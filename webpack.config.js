const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: {
        popup: "./src/popup.ts",
        serviceWorker: "./src/serviceWorker.ts",
        content: "./src/content.ts",
        injected: "./src/injected.ts",
    },
    output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "dist"),
        clean: true,
    },
    mode: "development",
    devtool: "cheap-module-source-map",
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".js"],
        alias: {
            xmlhttprequest: false,
        },
    },
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
