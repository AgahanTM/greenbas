import { ScrollView, Text, TextInput, View } from "react-native";

export default function DiscoveryScreen() {
  return (
    <ScrollView className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4 text-green-600">Discover Recipes</Text>

      <TextInput
        className="border border-gray-300 rounded-lg p-3 mb-4"
        placeholder="Search for a meal..."
      />

      <View className="border p-4 rounded-xl bg-green-50 mb-4">
        <Text className="text-lg font-semibold">Avocado Toast</Text>
        <Text className="text-gray-600">Simple, healthy breakfast idea.</Text>
      </View>

      <View className="border p-4 rounded-xl bg-green-50 mb-4">
        <Text className="text-lg font-semibold">Pasta Primavera</Text>
        <Text className="text-gray-600">Fresh veggies and creamy sauce.</Text>
      </View>

      <View className="border p-4 rounded-xl bg-green-50">
        <Text className="text-lg font-semibold">Grilled Chicken Bowl</Text>
        <Text className="text-gray-600">High-protein meal with rice and greens.</Text>
      </View>
    </ScrollView>
  );
}
