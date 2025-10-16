// babel.config.js

module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // This is a required plugin for Expo Router.
      'expo-router/babel',
      
      // Add other plugins here, for example:
      // 'react-native-reanimated/plugin', 
    ],
  };
};