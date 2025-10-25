// app.config.js
import 'dotenv/config';

export default {
  expo: {
    name: "greenbas",
    slug: "greenbas",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "greenbas",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.madara99.greenbas", // ✅ add unique bundle ID for iOS builds
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
        backgroundColor: "#E6F4FE",
      },
      edgeToEdge: true, // ✅ new name in SDK 52+ (`edgeToEdgeEnabled` deprecated)
      package: "com.madara99.greenbas", // ✅ required for EAS builds
      permissions: [], // optional but good practice
    },

    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow $(PRODUCT_NAME) to access your camera to scan meals.",
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      eas: {
        build: {
          experimental: {
            env: true,
          },
        },
      },
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    },
  },
};
