import 'dotenv/config';

export default {
  expo: {
    name: "Ýaşyl Sepet",
    slug: "Ýaşyl Sepet",
    version: "1.1.1",
    orientation: "portrait",
    icon: "./assets/images/logo.png",
    scheme: "Ýaşyl Sepet",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.madara99.greenbas"
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/logo.png",
        backgroundImage: "./assets/images/logo.png",
        monochromeImage: "./assets/images/logo.png",
        backgroundColor: "#ffffff96",
      },
      edgeToEdge: true,
      package: "com.madara99.greenbas"
    },

    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/logo.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: { backgroundColor: "#b3eeb1cb" }
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow $(PRODUCT_NAME) to access your camera to scan meals."
        }
      ]
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },

    extra: {
      eas: {
        projectId: "6e2fa8da-a50b-40ed-a00f-1b0533276b14",
        build: {
          experimental: {
            env: true
          }
        }
      },
      GEMINI_API_KEY: process.env.GEMINI_API_KEY
    }
  }
};
