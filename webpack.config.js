const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/ts/main.ts',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true, // optional: cleans old files in dist
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: 'ts-loader',
      },
      {
        test: /\.(glsl|vs|fs|vert|frag)$/,
        use: 'raw-loader',
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|glb)$/i,
        type: 'asset/resource', // This emits the file and gives you a URL
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/html/index.html', // Your HTML template
    }),
  ],
  mode: 'production',
};
