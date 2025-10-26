import { Picker } from '@react-native-picker/picker';
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

const ZW_COLORS = {
  BACKGROUND: '#f8fcf8',
  CARD: '#FFFFFF',
  PRIMARY_ACCENT: '#28b96cff',
  SECONDARY_ACCENT: '#E8B923',
  TEXT_DARK: '#2d343fff',
  TEXT_MUTED: '#64748b',
  BORDER: '#e2e8f0',
  ITEM_BG: '#EAF8F0',
};

interface Ingredient {
  id: string;
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
    name_tk: string;
  };
}

export default function ZeroWasteScreen() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("sany");
  const [recommendation, setRecommendation] = useState("");
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingRecommend, setLoadingRecommend] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  useEffect(() => {
    fetchIngredients();
    fetchPantryItems();
  }, []);

  const fetchIngredients = async () => {
    const { data, error } = await supabase.from("ingredients").select("*");
    if (error) Alert.alert("Ýalňyşlyk", error.message);
    else setIngredients(data || []);
  };

  const fetchPantryItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert("Ýalňyşlyk", "Ulanyjy tapylmady");

    const { data, error } = await supabase
      .from("pantry_items")
      .select("*, ingredient:ingredient_id (name_tk)")
      .eq("user_id", user.id);

    if (error) Alert.alert("Ýalňyşlyk", error.message);
    else setPantryItems(data || []);
  };

  const addPantryItem = async () => {
    if (!selectedIngredientId && !newItemName.trim()) {
      return Alert.alert("Duýduryş", "Ingredient saýlaň ýa-da täze birini giriziň.");
    }
    setLoadingAdd(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ulanyjy tapylmady");

      let ingredientId = selectedIngredientId;

      if (!ingredientId && newItemName.trim()) {
        const { data: ingredientData, error: ingredientError } = await supabase
          .from("ingredients")
          .insert({
            name_tk: newItemName,
            default_unit: unit,
          })
          .select("id")
          .single();

        if (ingredientError) throw ingredientError;
        ingredientId = ingredientData.id;
        setNewItemName("");
        fetchIngredients();
      }

      const { error } = await supabase.from("pantry_items").insert([
        {
          user_id: user.id,
          ingredient_id: ingredientId,
          quantity: parseFloat(quantity) || 1,
          unit: unit.trim() || 'sany',
        },
      ]);

      if (error) throw error;

      setSelectedIngredientId(null);
      setQuantity("1");
      setUnit("sany");
      setIsAddingCustom(false);
      fetchPantryItems();
    } catch (error: any) {
      Alert.alert("Ýalňyşlyk", error.message);
    } finally {
      setLoadingAdd(false);
    }
  };

  const deletePantryItem = (itemId: string) => {
    Alert.alert(
      "Pozmak",
      "Bu ingredienti ammardan aýyrmak isleýäňizmi?",
      [
        { text: "Ýok", style: "cancel" },
        {
          text: "Hawa",
          onPress: async () => {
            setLoadingAdd(true);
            try {
              const { error } = await supabase.from('pantry_items').delete().eq('id', itemId);
              if (error) throw error;
              setPantryItems(currentItems => currentItems.filter(item => item.id !== itemId));
              Alert.alert("Üstünlik", "Ingredient aýryldy.");
            } catch (error: any) {
              Alert.alert("Ýalňyşlyk", error.message);
            } finally {
              setLoadingAdd(false);
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const generateRecommendation = async () => {
    if (pantryItems.length === 0) {
      return Alert.alert("Maglumat", "AI teklip üçin azyndan bir ingredient goşuň.");
    }

    try {
      setLoadingRecommend(true);
      setRecommendation("");
      const itemsList = pantryItems.map((i) => `${i.ingredient.name_tk} (${i.quantity} ${i.unit})`).join(", ");
      const prompt = `Sizde aşakdaky ingredientler bar: ${itemsList}. Galyndyny azaltmak üçin ýönekeýje bir nahar teklip ediň. Emma naharyň adyny, gysga düşündirişini we esasy ädimlerini 4-5 setirde beriň.`;
      const aiRecommendation = await getMealSuggestions(prompt);
      setRecommendation(aiRecommendation);
    } catch (err: any) {
      Alert.alert("Ýalňyşlyk", err.message || "Teklip döredilip bilmedi.");
    } finally {
      setLoadingRecommend(false);
    }
  };

  const renderPantryItem = ({ item }: { item: PantryItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemText} numberOfLines={1}>{item.ingredient.name_tk}</Text>
        <Text style={styles.itemQuantity}>{item.quantity} {item.unit}</Text>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => deletePantryItem(item.id)}>
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
            style={[styles.optionButton, selectedIngredientId === ing.id && styles.selectedOption]}
            onPress={() => {
              setSelectedIngredientId(ing.id);
              setIsAddingCustom(false);
              setUnit(ing.default_unit || 'sany');
            }}
          >
            <Text style={[styles.optionText, selectedIngredientId === ing.id && { color: ZW_COLORS.TEXT_DARK }]}>
              {ing.name_tk}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.optionButton, isAddingCustom && styles.selectedOption, { marginTop: 10 }]}
        onPress={() => {
          setIsAddingCustom(!isAddingCustom);
          setSelectedIngredientId(null);
          setNewItemName('');
          setUnit('sany');
        }}
      >
        <Text style={[styles.optionText, isAddingCustom && { color: ZW_COLORS.TEXT_DARK }]}>
          + Täze goş
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.inputCard}>
          <Text style={styles.sectionTitle}>Ammara goş</Text>
          <IngredientSelector />

          {isAddingCustom && (
            <TextInput
              style={styles.input}
              placeholder="Täze ingredient (mysal: Alma)"
              placeholderTextColor={ZW_COLORS.TEXT_MUTED}
              value={newItemName}
              onChangeText={setNewItemName}
            />
          )}

          <View style={styles.quantityUnitContainer}>
            <TextInput
              style={[styles.input, styles.quantityInput]}
              placeholder="Mukdar"
              placeholderTextColor={ZW_COLORS.TEXT_MUTED}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />
            <View style={[styles.input, styles.unitInput, { padding: 0 }]}>
              <Picker
                selectedValue={unit}
                onValueChange={(itemValue) => setUnit(itemValue)}
                style={{ color: ZW_COLORS.TEXT_DARK }}
                itemStyle={{ fontSize: 16 }}
              >
                <Picker.Item label="sany" value="sany" />
                <Picker.Item label="kg" value="kg" />
                <Picker.Item label="gram" value="gram" />
                <Picker.Item label="litr" value="litr" />
                <Picker.Item label="ml" value="ml" />
              </Picker>
            </View>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={addPantryItem} disabled={loadingAdd}>
            {loadingAdd ? (
              <ActivityIndicator color={ZW_COLORS.TEXT_DARK} />
            ) : (
              <Text style={styles.buttonText}>Ammara goş</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.listTitle}>Meniň Ammarym ({pantryItems.length})</Text>
        <FlatList
          data={pantryItems}
          keyExtractor={(i) => i.id}
          renderItem={renderPantryItem}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Ammaryňyz boş. Ilkinji ingredientiňizi goşuň!</Text>
            </View>
          }
        />

        <TouchableOpacity
          style={styles.generateButton}
          onPress={generateRecommendation}
          disabled={loadingRecommend || pantryItems.length === 0}
        >
          <Text style={styles.buttonText}>
            {loadingRecommend ? "TEKLIP DÄREDILÝÄR..." : "AI NAHAR TEKLIPI AL"}
          </Text>
        </TouchableOpacity>

        {recommendation && (
          <View style={styles.recommendationBox}>
            <Text style={styles.recommendationTitle}>Şefiň Teklibi:</Text>
            <Text style={styles.recommendationText}>{recommendation}</Text>
          </View>
        )}

        {loadingRecommend && !recommendation && (
          <ActivityIndicator size="large" color={ZW_COLORS.PRIMARY_ACCENT} style={{ marginVertical: 20 }} />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ZW_COLORS.BACKGROUND, paddingHorizontal: 20, paddingTop: 40 },
  inputCard: {
    backgroundColor: ZW_COLORS.CARD,
    borderRadius: 15,
    padding: 20,
    marginVertical: 15,
    shadowColor: ZW_COLORS.TEXT_DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: ZW_COLORS.BORDER,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: ZW_COLORS.TEXT_DARK, marginBottom: 15 },
  listTitle: { fontSize: 22, fontWeight: "800", color: ZW_COLORS.TEXT_DARK, marginVertical: 10 },
  ingredientSelectorContainer: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: ZW_COLORS.BORDER,
    paddingBottom: 5,
  },
  ingredientScroll: { paddingVertical: 5 },
  optionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: ZW_COLORS.CARD,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: ZW_COLORS.BORDER,
  },
  selectedOption: { backgroundColor: ZW_COLORS.PRIMARY_ACCENT + '20', borderColor: ZW_COLORS.PRIMARY_ACCENT },
  optionText: { fontSize: 14, color: ZW_COLORS.TEXT_MUTED, fontWeight: '600' },
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
  quantityUnitContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  quantityInput: { flex: 1, marginRight: 10 },
  unitInput: { flex: 1 },
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
  buttonText: { color: 'white', fontWeight: "900", fontSize: 16 },
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
  itemInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemText: { fontSize: 16, color: ZW_COLORS.TEXT_DARK, fontWeight: '600', marginRight: 10 },
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
    backgroundColor: '#F87171',
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
  },
  deleteButtonText: { color: ZW_COLORS.CARD, fontWeight: 'bold', fontSize: 18 },
  emptyCard: {
    backgroundColor: ZW_COLORS.CARD,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: ZW_COLORS.BORDER,
  },
  emptyText: { textAlign: "center", color: ZW_COLORS.TEXT_MUTED, fontSize: 15 },
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
  recommendationTitle: { fontSize: 18, fontWeight: '800', color: ZW_COLORS.PRIMARY_ACCENT, marginBottom: 10 },
  recommendationText: { fontSize: 15, color: ZW_COLORS.TEXT_DARK, lineHeight: 22 },
});