import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function ProfileScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold text-green-600 mb-4">Your Profile</Text>
      <TouchableOpacity
        className="bg-green-500 px-8 py-3 rounded-full"
        onPress={() => router.replace("/login")}
      >
        <Text className="text-white font-semibold">Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
