// Webpack config for React Native Web — used for E2E smoke tests and GitHub Pages
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  // argv.mode may not be set when mode is only in the config object; default to true
  // since this webpack config is only used for E2E smoke tests in development
  const isDev = !argv.mode || argv.mode === 'development';
  const isPages = env && env.pages;

  return {
    mode: isDev ? 'development' : 'production',
  devtool: isDev ? 'eval-source-map' : false,
  entry: './e2e/web-entry.tsx',
  output: {
    path: isPages ? path.resolve(__dirname, 'pages-dist') : path.resolve(__dirname, 'e2e/dist'),
    filename: isPages ? 'bundle.[contenthash:8].js' : 'bundle.js',
    publicPath: isPages ? '/borderly/' : '/dist/',
    clean: true,
  },
  resolve: {
    alias: {
      // Pin react/react-dom to exact same resolved path to avoid version mismatch
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-native-screens': path.resolve(__dirname, 'e2e/mocks/react-native-screens.js'),
      'react-native$': 'react-native-web',
      'react-native-haptic-feedback': path.resolve(__dirname, 'e2e/mocks/haptic.js'),
      'react-native-keychain': path.resolve(__dirname, 'e2e/mocks/keychain.js'),
      'react-native-mmkv': path.resolve(__dirname, 'e2e/mocks/mmkv.js'),
      'react-native-camera': path.resolve(__dirname, 'e2e/mocks/camera.js'),
      'react-native-webview': path.resolve(__dirname, 'e2e/mocks/webview.js'),
      'react-native-image-picker': path.resolve(__dirname, 'e2e/mocks/image-picker.js'),
      '@react-native-clipboard/clipboard': path.resolve(__dirname, 'e2e/mocks/clipboard.js'),
      '@react-native-async-storage/async-storage': path.resolve(__dirname, 'e2e/mocks/async-storage.js'),
      'react-native-heroicons/outline': path.resolve(__dirname, 'e2e/mocks/heroicons.js'),
      'react-native-heroicons/solid': path.resolve(__dirname, 'e2e/mocks/heroicons.js'),
      'react-native-vector-icons/MaterialIcons': path.resolve(__dirname, 'e2e/mocks/vector-icons.js'),
      'react-native-vector-icons/Ionicons': path.resolve(__dirname, 'e2e/mocks/vector-icons.js'),
      'react-native-vector-icons/Feather': path.resolve(__dirname, 'e2e/mocks/vector-icons.js'),
      'react-native-vector-icons/FontAwesome': path.resolve(__dirname, 'e2e/mocks/vector-icons.js'),
      'react-native-vector-icons/Entypo': path.resolve(__dirname, 'e2e/mocks/vector-icons.js'),
      // react-native-css-interop is NOT mocked — it's pure JS and needed for NativeWind v4 web styles
      'react-native-svg': path.resolve(__dirname, 'e2e/mocks/react-native-svg.js'),
      'lucide-react-native': path.resolve(__dirname, 'e2e/mocks/lucide-react-native.js'),
      'react-native-get-random-values': path.resolve(__dirname, 'e2e/mocks/random-values.js'),
      '@nozbe/watermelondb/decorators': path.resolve(__dirname, 'e2e/mocks/watermelondb.js'),
      '@nozbe/watermelondb/adapters/sqlite': path.resolve(__dirname, 'e2e/mocks/watermelondb.js'),
      '@nozbe/watermelondb/Schema/migrations': path.resolve(__dirname, 'e2e/mocks/watermelondb-migrations.js'),
      '@nozbe/watermelondb': path.resolve(__dirname, 'e2e/mocks/watermelondb.js'),
      '@': path.resolve(__dirname, 'src'),
    },
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      // App source code — full babel pipeline
      {
        test: /\.[tj]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: { chrome: '100' }, modules: false }],
              ['@babel/preset-typescript', { allowDeclareFields: true }],
              'react-native-css-interop/babel',
            ],
            plugins: [
              ['@babel/plugin-proposal-decorators', { legacy: true }],
              ['module-resolver', { root: ['.'], alias: { '@': './src' } }],
            ],
          },
        },
      },
      // react-native-web and react-native-css-interop need babel for JSX
      {
        test: /\.[tj]sx?$/,
        include: /node_modules\/react-native-web|node_modules\/react-native-css-interop/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: { chrome: '100' }, modules: false }],
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
          },
        },
      },
      // Disable fullySpecified for ESM packages that import without extensions
      {
        test: /\.js$/,
        include: /node_modules\/@react-navigation|node_modules\/react-native-gesture-handler|node_modules\/react-native-safe-area-context/,
        resolve: { fullySpecified: false },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    // React Native's __DEV__ global
    new webpack.DefinePlugin({
      __DEV__: isDev,
    }),
    // Generate index.html with script tag automatically
    ...(isPages ? [new HtmlWebpackPlugin({
      templateContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Borderly</title>
  <style>html, body, #root { height: 100%; margin: 0; font-family: -apple-system, system-ui, sans-serif; } #root { display: flex; flex-direction: column; }</style>
</head>
<body><div id="root"></div></body>
</html>`,
      inject: true,
    })] : []),
    // Replace the entire storage barrel export to avoid WatermelonDB decorator compilation
    new webpack.NormalModuleReplacementPlugin(
      /src\/services\/storage\/index\.ts$/,
      path.resolve(__dirname, 'e2e/mocks/storage.js')
    ),
  ],
  devServer: {
    static: path.resolve(__dirname, 'e2e'),
    port: 3000,
    hot: false,
  },
  };
};
