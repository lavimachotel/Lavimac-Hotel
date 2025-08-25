const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Minimal fallbacks - only what we absolutely need
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "crypto": false,
        "stream": false,
        "buffer": false,
        "util": false,
        "path": false,
        "fs": false,
        "process": false,
      };

      // Remove problematic modules
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        "sql.js": false,
        "crypto-js": false,
        "idb": false,
      };

      // Minimal plugins
      webpackConfig.plugins = [
        ...webpackConfig.plugins,
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        }),
      ];

      // Ignore warnings about missing modules
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
        /Module not found/,
        /Can't resolve/,
        /Critical dependency/,
      ];

      return webpackConfig;
    },
  },
}; 