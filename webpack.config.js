// Webpack config for React Native Web — used only for E2E smoke tests
const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  devtool: false,
  entry: './e2e/web-entry.tsx',
  output: {
    path: path.resolve(__dirname, 'e2e/dist'),
    filename: 'bundle.js',
    publicPath: '/dist/',
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
      'react-native-image-picker': path.resolve(__dirname, 'e2e/mocks/image-picker.js'),
      '@react-native-clipboard/clipboard': path.resolve(__dirname, 'e2e/mocks/clipboard.js'),
      'react-native-heroicons/outline': path.resolve(__dirname, 'e2e/mocks/heroicons.js'),
      'react-native-heroicons/solid': path.resolve(__dirname, 'e2e/mocks/heroicons.js'),
      'react-native-vector-icons/MaterialIcons': path.resolve(__dirname, 'e2e/mocks/vector-icons.js'),
      'react-native-vector-icons/Ionicons': path.resolve(__dirname, 'e2e/mocks/vector-icons.js'),
      'react-native-vector-icons/Feather': path.resolve(__dirname, 'e2e/mocks/vector-icons.js'),
      'react-native-vector-icons/FontAwesome': path.resolve(__dirname, 'e2e/mocks/vector-icons.js'),
      'react-native-vector-icons/Entypo': path.resolve(__dirname, 'e2e/mocks/vector-icons.js'),
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
              ['@babel/preset-react', { runtime: 'automatic' }],
              ['@babel/preset-typescript', { allowDeclareFields: true }],
            ],
            plugins: [
              ['@babel/plugin-proposal-decorators', { legacy: true }],
              ['module-resolver', { root: ['.'], alias: { '@': './src' } }],
            ],
          },
        },
      },
      // react-native-web needs babel for JSX
      {
        test: /\.[tj]sx?$/,
        include: /node_modules\/react-native-web/,
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
      __DEV__: JSON.stringify(true),
    }),
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
