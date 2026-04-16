// webpack.prod.js
// const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = merge(common, {
    mode: 'production',
    // devtool: 'source-map', // 可选，调试用
    output: {
        filename: '[name].[contenthash:8].js', // 使用内容哈希 bundle.js
        // path: path.resolve(__dirname, 'dist/production'),  // 输出目录
        clean: { // 构建前清空 dist/
            keep: /(assets|libs|\.user\.ini|\.htaccess|404\.html)$/, // 保留 .user.ini 文件
        },
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html',
            inject: true,
            minify: {
                removeComments: true,
                collapseWhitespace: true,
                minifyJS: true,
                minifyCSS: true,
            },
        }),
    ],
    optimization: {
        minimizer: [
            new TerserPlugin(), // 压缩 JS
            new CssMinimizerPlugin(), // 压缩 CSS
        ],
        splitChunks: {
            chunks: 'all', // 代码拆分
        },
    },
});