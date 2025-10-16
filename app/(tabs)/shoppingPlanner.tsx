import { Text, View } from "react-native";

export default function ShoppingPlannerScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold text-green-600 mb-2">
        Smart Shopping & Planner
      </Text>
      <Text className="text-gray-500">(Plan your meals and shopping list)</Text>
    </View>
  );
}
