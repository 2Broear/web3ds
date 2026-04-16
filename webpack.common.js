// webpack.common.js
const path = require('path');
// const HtmlWebpackPlugin = require('html-webpack-plugin');
// 判断当前环境（通过 package.json 的脚本注入）
// const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  entry: './src/index.js',  // 入口文件
  output: {
    // filename: isProduction ? '[name].[contenthash].js' : '[name].js',
    path: path.resolve(__dirname, 'dist'),  // 输出目录
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        include: path.resolve(__dirname, 'style'),
        use: [
          'style-loader',  // MiniCssExtractPlugin.loader
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1
            }
          },
          'postcss-loader'
        ],
      },
    ],
  },
};
