import { Text, View } from "react-native";

export default function MealRecognitionScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold text-green-600 mb-2">
        Meal Recognition
      </Text>
      <Text className="text-gray-500">
        (Future: take a photo and identify your meal)
      </Text>
    </View>
  );
}
