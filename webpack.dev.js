const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./src/dev-standalone.tsx", // Different entry point for dev mode
  
  devtool: 'eval-source-map', // Better debugging
  
  output: {
    path: path.resolve(__dirname, 'dev-dist'),
    publicPath: "/",
    clean: true,
  },
  
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true, // Faster compilation in dev
            }
          }
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader'
        ]
      }
    ],
  },
  
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/dev-index.html', 
      favicon: './public/favicon.ico',
      title: 'Plugin Development Mode'
    }),
  ],
  
  devServer: {
    port: 3034, // Different port from main plugin
    static: {
      directory: path.join(__dirname, "public"),
    },
    hot: true,
    open: false, // Auto-open browser
    historyApiFallback: true,
    client: {
      overlay: {
        warnings: false,
        errors: true
      }
    }
  },
  
  // Optimize for development speed
  optimization: {
    splitChunks: false, // Disable code splitting in dev mode
    runtimeChunk: false
  }
};
