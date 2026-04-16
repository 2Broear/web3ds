// webpack.dev.js
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'cheap-module-source-map',  //inline-source-map
  output: {
    filename: '[name].js', // 强制覆盖哈希配置
    // clean: { // 构建前清空 dist/
    //     keep: /(assets|\.user\.ini|\.htaccess|404\.html)$/, // 保留 .user.ini 文件
    // },
  },
  plugins: [
      new HtmlWebpackPlugin({
          template: './src/index.html',
          filename: 'indexs.html', // 动态生成文件名
          inject: true,
          minify: false,
      }),
  ],
  devServer: {
    static: {
        directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 9001,
    hot: true,
    devMiddleware: {
        writeToDisk: true, // 强制生成物理文件（不推荐生产使用）
    },
    host: '0.0.0.0', // 允许外部访问
    allowedHosts: ['139.155.150.85','node.2broear.com'], // allowedHosts: 'all',
    client: {
        webSocketURL: "auto://node.2broear.com/ws",
    },
  },
});
