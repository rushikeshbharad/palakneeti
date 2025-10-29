const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  // The entry point of our application
  entry: "./blogs/index.js",

  // Where to output the bundled files
  output: {
    path: path.resolve(__dirname, "blogs", "dist"),
    filename: "bundle.js",
    clean: true, // Cleans the dist folder before each build
  },

  // How to process different types of modules
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/, // Apply this rule to .js and .jsx files
        exclude: /node_modules/,
        use: "babel-loader", // Use Babel to transpile JS
      },
    ],
  },

  // Plugins to enhance the build process
  plugins: [
    new HtmlWebpackPlugin({
      template: "./blogs/index.html", // Use this file as a template
    }),
  ],

  // Configuration for the development server
  devServer: {
    static: path.join(__dirname, "blogs", "dist"),
    port: 3000,
    hot: true, // Enable Hot Module Replacement
  },
};
