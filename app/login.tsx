import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View
} from "react-native";
import { FormField } from "../components/FormField";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Enhanced animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  // Sophisticated background gradient animation
  const backgroundColor = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#059669', '#10b981']
  });

  useEffect(() => {
    // Staggered animations with better timing
    Animated.parallel([
      Animated.timing(backgroundAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }),
      Animated.stagger(100, [
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(slideUpAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
            toValue: 1,
            friction: 8,
            useNativeDriver: true,
          })
        ])
      ])
    ]).start();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleLogin = async () => {
    if (!formData.username.trim() || !formData.password) {
      setError("Please enter both username and password");
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      if (formData.username === "demo" && formData.password === "password") {
        router.replace("/(tabs)/discovery");
      } else {
        setError("Invalid username or password");
      }
    }, 1500);
  };

  const onPressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ backgroundColor }} className="flex-1">
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          {/* Header Section */}
          <View className="pt-20 pb-12 px-8 items-center">
            <Animated.View 
              style={{
                opacity: fadeAnim,
                transform: [{ scale: logoScale }]
              }}
              className="items-center"
            >
              <View className="bg-white/20 p-6 rounded-3xl mb-6 shadow-2xl">
                <Image
                  source={{ uri: "https://i.ibb.co/6gS35zJ/green-leaf-logo.png" }}
                  style={{ width: 80, height: 80 }}
                  resizeMode="contain"
                />
              </View>
              <Text className="text-5xl font-black text-white text-center mb-3">
                GreenBasket
              </Text>
              <Text className="text-white/90 text-lg font-light tracking-wide">
                Eat smarter. Waste less.
              </Text>
            </Animated.View>
          </View>

          {/* Login Card */}
          <Animated.View 
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }]
            }}
            className="flex-1 bg-white rounded-t-[40px] px-8 pt-12 pb-8 shadow-2xl"
          >
            <View className="items-center mb-8">
              <Text className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back
              </Text>
              <Text className="text-gray-600 text-base">
                Sign in to continue your journey
              </Text>
            </View>

            {/* Form Fields */}
            <View className="space-y-6 mb-8">
              <View>
                <Text className="text-gray-700 font-semibold mb-3 text-sm uppercase tracking-wide">
                  Username
                </Text>
                <FormField
                  icon="mail-outline"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                  onFocus={() => setFocused("username")}
                  onBlur={() => setFocused(null)}
                  isFocused={focused === "username"}
                  autoCapitalize="none"
                  style="bg-gray-50 border-gray-200"
                />
              </View>

              <View>
                <Text className="text-gray-700 font-semibold mb-3 text-sm uppercase tracking-wide">
                  Password
                </Text>
                <FormField
                  icon="lock-closed-outline"
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  isFocused={focused === "password"}
                  rightIcon={
                    <Pressable 
                      onPress={() => setShowPassword(!showPassword)}
                      className="p-2"
                    >
                      <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color="#6b7280" 
                      />
                    </Pressable>
                  }
                  style="bg-gray-50 border-gray-200"
                />
              </View>
            </View>

            {/* Error Message */}
            {error && (
              <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex-row items-center">
                <Ionicons name="alert-circle" size={20} color="#dc2626" />
                <Text className="text-red-700 ml-2 flex-1 font-medium">
                  {error}
                </Text>
              </View>
            )}

            {/* Login Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }} className="mb-6">
              <Pressable
                onPress={handleLogin}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                disabled={isLoading}
                className={`rounded-2xl overflow-hidden shadow-lg ${
                  isLoading ? 'opacity-80' : ''
                }`}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="py-5 items-center"
                >
                  {isLoading ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator size="small" color="white" />
                      <Text className="text-white text-lg font-semibold ml-3">
                        Signing In...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-white text-lg font-semibold">
                      Sign In
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Divider */}
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="text-gray-500 mx-4 font-medium text-sm">OR</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>

            {/* Social Login */}
            <View className="flex-row justify-between mb-8">
              <Pressable className="flex-1 bg-white border border-gray-200 rounded-xl p-4 mr-2 shadow-sm">
                <View className="items-center">
                  <Ionicons name="logo-google" size={24} color="#dc2626" />
                  <Text className="text-gray-700 font-medium mt-1 text-sm">Google</Text>
                </View>
              </Pressable>
              
              <Pressable className="flex-1 bg-white border border-gray-200 rounded-xl p-4 mx-2 shadow-sm">
                <View className="items-center">
                  <Ionicons name="logo-apple" size={24} color="#000000" />
                  <Text className="text-gray-700 font-medium mt-1 text-sm">Apple</Text>
                </View>
              </Pressable>
              
              <Pressable className="flex-1 bg-white border border-gray-200 rounded-xl p-4 ml-2 shadow-sm">
                <View className="items-center">
                  <Ionicons name="logo-facebook" size={24} color="#2563eb" />
                  <Text className="text-gray-700 font-medium mt-1 text-sm">Facebook</Text>
                </View>
              </Pressable>
            </View>

            {/* Sign Up Link */}
            <View className="items-center">
              <Text className="text-gray-600 text-base">
                Don't have an account?{" "}
                <Text className="text-green-600 font-semibold underline">
                  Sign Up
                </Text>
              </Text>
            </View>

            {/* Demo Hint */}
            <View className="mt-8 p-4 bg-green-50 rounded-xl border border-green-200">
              <Text className="text-green-800 text-center text-sm font-medium">
                🎯 Demo: username "demo" / password "password"
              </Text>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </ScrollView>
    </Animated.View>
  );
}