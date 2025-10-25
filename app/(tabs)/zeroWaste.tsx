import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getMealSuggestions } from "../../services/geminiService";
import { supabase } from "../../services/supabase";

// --- UPDATED COLOR PALETTE ---
const ZW_COLORS = {
  BACKGROUND: '#f8fcf8', // Soft greenish white
  CARD: '#FFFFFF',
  PRIMARY_ACCENT: '#2EB86E', // Vivid green
  SECONDARY_ACCENT: '#FFB84D', // Orange (Action Buttons)
  TEXT_DARK: '#0F1724',
  TEXT_MUTED: '#64748b',
  BORDER: '#e2e8f0',
  ITEM_BG: '#EAF8F0', // Pantry item light green background
};
// ---------------------------------

interface Ingredient {
  id: string;
  name_en: string;
  name_tk: string;
  default_unit: string;
}

interface PantryItem {
  id: string;
  user_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  ingredient: {
    name_en: string;
  };
}

export default function ZeroWasteScreen() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("piece");
  const [recommendation, setRecommendation] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  useEffect(() => {
    fetchIngredients();
    fetchPantryItems();
  }, []);

  const fetchIngredients = async () => {
    const { data, error } = await supabase.from("ingredients").select("*");
    if (error) Alert.alert("Error", error.message);
    else setIngredients(data || []);
  };

  const fetchPantryItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert("Error", "User not found");

    const { data, error } = await supabase
      .from("pantry_items")
      .select("*, ingredient:ingredient_id (name_en)")
      .eq("user_id", user.id);

    if (error) Alert.alert("Error", error.message);
    else setPantryItems(data || []);
  };

  const addPantryItem = async () => {
    if (!selectedIngredientId && !newItemName.trim()) {
      return Alert.alert("Warning", "Please select an ingredient or enter a new one.");
    }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      let ingredientId = selectedIngredientId;

      // Add custom ingredient
      if (!ingredientId && newItemName.trim()) {
        const { data: ingredientData, error: ingredientError } = await supabase
          .from("ingredients")
          .insert({
            name_en: newItemName,
            name_tk: newItemName,
            default_unit: unit,
          })
          .select("id")
          .single();

        if (ingredientError) throw ingredientError;
        ingredientId = ingredientData.id;
        setNewItemName("");
        fetchIngredients(); // Refresh ingredient list
      }

      // Add pantry item
      const { error } = await supabase.from("pantry_items").insert([
        {
          user_id: user.id,
          ingredient_id: ingredientId,
          quantity: parseFloat(quantity) || 1,
          unit: unit.trim() || 'piece',
        },
      ]);

      if (error) throw error;

      // Reset form and refresh pantry
      setSelectedIngredientId(null);
      setQuantity("1");
      setUnit("piece");
      setIsAddingCustom(false);
      fetchPantryItems();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const deletePantryItem = (itemId: string) => {
    Alert.alert(
      "Delete Confirmation",
      "Are you sure you want to remove this item from your pantry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase.from('pantry_items').delete().eq('id', itemId);
              if (error) throw error;
              setPantryItems(currentItems => currentItems.filter(item => item.id !== itemId));
              Alert.alert("Success", "Item removed from pantry.");
            } catch (error: any) {
              Alert.alert("Error", error.message);
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const generateRecommendation = async () => {
    if (pantryItems.length === 0) {
      return Alert.alert("Info", "You need at least one pantry item to get a recommendation.");
    }

    try {
      setLoading(true);
      setRecommendation("");
      const itemsList = pantryItems.map((i) => `${i.ingredient.name_en} (${i.quantity} ${i.unit})`).join(", ");
      
      const prompt = `You have the following ingredients: ${itemsList}. Suggest a creative and simple meal to reduce waste. Only provide the meal name, short description, and main steps in 4-5 sentences.`;
      
      const aiRecommendation = await getMealSuggestions(prompt);
      setRecommendation(aiRecommendation);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not generate recommendation.");
    } finally {
      setLoading(false);
    }
  };

  const renderPantryItem = ({ item }: { item: PantryItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemText} numberOfLines={1}>
          {item.ingredient.name_en}
        </Text>
        <Text style={styles.itemQuantity}>
          {item.quantity} {item.unit}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deletePantryItem(item.id)}
      >
        <Text style={styles.deleteButtonText}>X</Text>
      </TouchableOpacity>
    </View>
  );

  const IngredientSelector = () => (
    <View style={styles.ingredientSelectorContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ingredientScroll}>
        {ingredients.map((ing) => (
          <TouchableOpacity
            key={ing.id}
            style={[
              styles.optionButton,
              selectedIngredientId === ing.id && styles.selectedOption,
            ]}
            onPress={() => {
              setSelectedIngredientId(ing.id);
              setIsAddingCustom(false);
              const defaultUnit = ing.default_unit.trim() || 'piece';
              setUnit(defaultUnit);
            }}
          >
            <Text style={[styles.optionText, selectedIngredientId === ing.id && {color: ZW_COLORS.TEXT_DARK}]}>
              {ing.name_en}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Permanently visible + Add New button */}
      <TouchableOpacity
        style={[styles.optionButton, isAddingCustom && styles.selectedOption, {marginTop: 10}]}
        onPress={() => {
          setIsAddingCustom(!isAddingCustom);
          setSelectedIngredientId(null);
          setNewItemName('');
        }}
      >
        <Text style={[styles.optionText, isAddingCustom && {color: ZW_COLORS.TEXT_DARK}]}>
          + Add New
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }}>
        {/* ADD PANTRY FORM */}
        <View style={styles.inputCard}>
          <Text style={styles.sectionTitle}>Add Pantry Item</Text>
          
          <IngredientSelector />

          {isAddingCustom && (
            <TextInput
              style={styles.input}
              placeholder="New ingredient (e.g., Apple)"
              placeholderTextColor={ZW_COLORS.TEXT_MUTED}
              value={newItemName}
              onChangeText={setNewItemName}
            />
          )}

          <View style={styles.quantityUnitContainer}>
            <TextInput
              style={[styles.input, styles.quantityInput]}
              placeholder="Quantity"
              placeholderTextColor={ZW_COLORS.TEXT_MUTED}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.unitInput]}
              placeholder="Unit (e.g., kg)"
              placeholderTextColor={ZW_COLORS.TEXT_MUTED}
              value={unit}
              onChangeText={setUnit}
            />
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={addPantryItem}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={ZW_COLORS.TEXT_DARK} />
            ) : (
              <Text style={styles.buttonText}>ADD TO PANTRY</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* PANTRY LIST */}
        <Text style={styles.listTitle}>My Pantry ({pantryItems.length})</Text>
        <FlatList
          data={pantryItems}
          keyExtractor={(i) => i.id}
          renderItem={renderPantryItem}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Your pantry is empty. Add your first item above!</Text>
            </View>
          }
        />
        
        {/* AI RECOMMENDATION */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={generateRecommendation}
          disabled={loading || pantryItems.length === 0}
        >
          <Text style={styles.buttonText}>
            {loading ? "GENERATING RECOMMENDATION..." : "GET AI MEAL SUGGESTION"}
          </Text>
        </TouchableOpacity>

        {recommendation ? (
          <View style={styles.recommendationBox}>
            <Text style={styles.recommendationTitle}>Chef's Zero Waste Suggestion:</Text>
            <Text style={styles.recommendationText}>{recommendation}</Text>
          </View>
        ) : null}

        {loading && !recommendation && (
          <ActivityIndicator size="large" color={ZW_COLORS.PRIMARY_ACCENT} style={{ marginVertical: 20 }} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: ZW_COLORS.BACKGROUND, 
    paddingHorizontal: 20,
  },

  // INPUT/ADDITION CARD
  inputCard: {
    backgroundColor: ZW_COLORS.CARD,
    borderRadius: 15,
    padding: 20, // More padding
    marginVertical: 15, // Space from top
    shadowColor: ZW_COLORS.TEXT_DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: ZW_COLORS.BORDER,
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: ZW_COLORS.TEXT_DARK, 
    marginBottom: 15 
  },
  listTitle: { 
    fontSize: 22, 
    fontWeight: "800", 
    color: ZW_COLORS.TEXT_DARK, 
    marginVertical: 10 
  },

  // INGREDIENT SELECTION (Tags)
  ingredientSelectorContainer: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: ZW_COLORS.BORDER,
    paddingBottom: 5,
  },
  ingredientScroll: {
    paddingVertical: 5,
  },
  optionButton: { 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    backgroundColor: ZW_COLORS.CARD, 
    borderRadius: 20, 
    marginRight: 10, 
    borderWidth: 1,
    borderColor: ZW_COLORS.BORDER,
  },
  selectedOption: { 
    backgroundColor: ZW_COLORS.PRIMARY_ACCENT + '20',
    borderColor: ZW_COLORS.PRIMARY_ACCENT,
  },
  optionText: { 
    fontSize: 14, 
    color: ZW_COLORS.TEXT_MUTED, 
    fontWeight: '600' 
  },

  // INPUTS
  input: {
    borderWidth: 1,
    borderColor: ZW_COLORS.BORDER,
    borderRadius: 10,
    padding: 14,
    backgroundColor: ZW_COLORS.BACKGROUND,
    color: ZW_COLORS.TEXT_DARK,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  quantityUnitContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quantityInput: {
    flex: 1,
    marginRight: 10,
  },
  unitInput: {
    flex: 1,
  },
  
  // BUTTONS
  addButton: {
    backgroundColor: ZW_COLORS.SECONDARY_ACCENT,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 5,
    shadowColor: ZW_COLORS.SECONDARY_ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  generateButton: {
    backgroundColor: ZW_COLORS.PRIMARY_ACCENT,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
    shadowColor: ZW_COLORS.PRIMARY_ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: { 
    color: ZW_COLORS.TEXT_DARK, 
    fontWeight: "900", 
    fontSize: 16 
  },

  // PANTRY ITEM CARD
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: ZW_COLORS.ITEM_BG,
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: ZW_COLORS.PRIMARY_ACCENT + '40',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemText: { 
    fontSize: 16, 
    color: ZW_COLORS.TEXT_DARK, 
    fontWeight: '600',
    marginRight: 10,
  },
  itemQuantity: {
    fontSize: 16,
    color: ZW_COLORS.PRIMARY_ACCENT,
    fontWeight: '700',
    backgroundColor: ZW_COLORS.CARD,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  deleteButton: {
  backgroundColor: '#F87171', // light red
  width: 35,
  height: 35,
  borderRadius: 17.5,
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#F87171',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.5,
  shadowRadius: 5,
  elevation: 6,
},deleteButtonText: {
  color: ZW_COLORS.CARD,
  fontWeight: 'bold',
  fontSize: 18,
},
  emptyCard: {
    backgroundColor: ZW_COLORS.CARD,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: ZW_COLORS.BORDER,
  },
  emptyText: { 
    textAlign: "center", 
    color: ZW_COLORS.TEXT_MUTED, 
    fontSize: 15 
  },

  // RECOMMENDATION BOX
  recommendationBox: {
    backgroundColor: ZW_COLORS.CARD,
    padding: 20,
    borderRadius: 15,
    marginTop: 10,
    marginBottom: 30,
    borderWidth: 3,
    borderColor: ZW_COLORS.PRIMARY_ACCENT, 
    shadowColor: ZW_COLORS.PRIMARY_ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: ZW_COLORS.PRIMARY_ACCENT,
    marginBottom: 10,
  },
  recommendationText: { 
    fontSize: 15, 
    color: ZW_COLORS.TEXT_DARK, 
    lineHeight: 22 
  },
});