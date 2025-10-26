import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';

// --- Types
type Ingredient = {
  name: string;
  quantity: string | number;
  unit: string;
};

type Store = {
  name: string;
  pricePerUnit: number;
};

type PricedIngredient = {
  name: string;
  quantity: string | number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  selected: boolean;
};

type StoreTotals = {
  store: string;
  total: number;
  ingredients: PricedIngredient[];
};

// Mock grocery stores
const STORES: Store[] = [
  { name: 'Dukan 1', pricePerUnit: 1.5 },
  { name: 'Dukan 2', pricePerUnit: 2.0 },
];

const ShoppingPlanner = () => {
  const { ingredients: ingredientsParam, recipe_name } = useLocalSearchParams();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [storeTotals, setStoreTotals] = useState<StoreTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Received parameters:', { ingredientsParam, recipe_name });
    try {
      if (!ingredientsParam || typeof ingredientsParam !== 'string') {
        console.warn('Missing or invalid ingredients parameter');
        setError('Ingridientler saylanmady. Yza gayt we sayla.');
        setLoading(false);
        return;
      }

      const decodedIngredients = JSON.parse(ingredientsParam);
      console.log('Parsed ingredients:', decodedIngredients);

      if (!Array.isArray(decodedIngredients) || decodedIngredients.length === 0) {
        console.warn('Invalid or empty ingredients array');
        setError('Ingridientler tapylmady. Tazeden synansyn.');
        setLoading(false);
        return;
      }

      // Validate ingredient format
      const formattedIngredients: Ingredient[] = decodedIngredients.map((ing: any) => ({
        name: ing.name ?? 'Unknown',
        quantity: ing.quantity ?? '-',
        unit: ing.unit ?? '',
      }));
      setIngredients(formattedIngredients);
      calculateTotals(formattedIngredients);
    } catch (err: any) {
      console.error('Error parsing ingredients:', err);
      setError('Ingridientler yuklenmedi. Tazeden synansyn.');
    } finally {
      setLoading(false);
    }
  }, [ingredientsParam]);

  const calculateTotals = (ingredients: Ingredient[], selectedNames: string[] = []) => {
    const totals: StoreTotals[] = STORES.map((store) => {
      const pricedIngredients: PricedIngredient[] = ingredients.map((ing) => {
        const totalPrice = typeof ing.quantity === 'number' ? ing.quantity * store.pricePerUnit : store.pricePerUnit;
        return {
          ...ing,
          pricePerUnit: store.pricePerUnit,
          totalPrice: Math.round(totalPrice * 100) / 100,
          selected: selectedNames.length === 0 || selectedNames.includes(ing.name),
        };
      });
      const total = pricedIngredients
        .filter((ing) => ing.selected)
        .reduce((sum, ing) => sum + ing.totalPrice, 0);
      return {
        store: store.name,
        total: Math.round(total * 100) / 100,
        ingredients: pricedIngredients,
      };
    });
    setStoreTotals(totals);
    console.log('Calculated Totals:', totals);
  };

  const toggleIngredient = (storeName: string, ingredientName: string) => {
    setStoreTotals((prev) =>
      prev.map((store) => {
        if (store.store !== storeName) return store;
        const updatedIngredients = store.ingredients.map((ing) =>
          ing.name === ingredientName ? { ...ing, selected: !ing.selected } : ing
        );
        const total = updatedIngredients
          .filter((ing) => ing.selected)
          .reduce((sum, ing) => sum + ing.totalPrice, 0);
        return {
          ...store,
          ingredients: updatedIngredients,
          total: Math.round(total * 100) / 100,
        };
      })
    );
    console.log(`Toggled ingredient: ${ingredientName} in ${storeName}`);
  };

  const handleOrderFromStore = (storeTotals: StoreTotals) => {
    const selectedIngredients = storeTotals.ingredients.filter((ing) => ing.selected);
    if (selectedIngredients.length === 0) {
      Alert.alert('Ingridientler saylanmady', 'In azyndan 1 ingridient saylan.', [
        { text: 'Bolya', style: 'cancel' },
      ]);
      return;
    }
    Alert.alert(
      `Sundan sarga ${storeTotals.store}`,
      `Jemi: TMT ${storeTotals.total.toFixed(2)}\n\nIngridientlar:\n${selectedIngredients
        .map((ing) => `${ing.quantity} ${ing.unit} ${ing.name} (TMT ${ing.totalPrice.toFixed(2)})`)
        .join('\n')}`,
      [
        { text: 'Yza don', style: 'cancel' },
        {
          text: 'Tassykla',
          onPress: () => {
            Alert.alert('Zakaz alyndy!', `Senin su magazinden zakazyn ${storeTotals.store} alyndy!`, [
              { text: 'Bolya', onPress: () => router.back() },
            ]);
          },
        },
      ]
    );
    console.log(`Order initiated from ${storeTotals.store}:`, selectedIngredients);
  };

  const renderIngredient = ({ item }: { item: PricedIngredient }, storeName: string) => (
    <TouchableOpacity
      style={styles.ingredientRow}
      onPress={() => toggleIngredient(storeName, item.name)}
    >
      <View style={styles.checkboxContainer}>
        {item.selected ? (
          <View style={styles.checkbox}>
            <Check size={16} color="#FFF" />
          </View>
        ) : (
          <View style={styles.checkboxUnchecked} />
        )}
      </View>
      <Text style={styles.ingredientName}>{item.name}</Text>
      <Text style={styles.ingredientDetails}>
        {item.quantity} {item.unit} - TMT {item.totalPrice.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );

  const renderStoreSection = (storeTotals: StoreTotals, index: number) => (
    <View key={storeTotals.store} style={[styles.storeSection, index === 1 && styles.storeSectionLast]}>
      <View style={styles.storeHeader}>
        <Text style={styles.storeName}>{storeTotals.store}</Text>
        <Text style={styles.storeTotal}>Jemi: TMT {storeTotals.total.toFixed(2)}</Text>
      </View>
      <FlatList
        data={storeTotals.ingredients}
        renderItem={({ item }) => renderIngredient({ item }, storeTotals.store)}
        keyExtractor={(item) => item.name}
        scrollEnabled={false}
        style={styles.ingredientsList}
      />
      <TouchableOpacity style={styles.orderButton} onPress={() => handleOrderFromStore(storeTotals)}>
        <Text style={styles.orderButtonText}>Sundan sarga {storeTotals.store}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaProvider style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E8B923" />
          <Text style={styles.loadingText}>Listin yuklenyar...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (error) {
    return (
      <SafeAreaProvider style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Yza gayt</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>
            Planner {recipe_name ? `ucin \n${recipe_name}` : ''}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <Text style={styles.introText}>
            Senin ingridient listin asakda. Bar zatlaryny listden cykar, we in gowy dukanlardan sarga.
          </Text>

          {storeTotals.length > 0 ? (
            storeTotals.map((totals, index) => renderStoreSection(totals, index))
          ) : (
            <Text style={styles.noDataText}>Hic ingridient yok</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaProvider>
  );
};

export default ShoppingPlanner;

// Styles (consistent with discovery.tsx)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FFFA', // Mint Cream
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginTop: 40,
  },
  backIcon: {
    fontSize: 24,
    color: '#004040', // Rich Black
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#004040', // Rich Black
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  introText: {
    fontSize: 16,
    color: '#708090', // Slate Gray
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  storeSection: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E8B923', // Hunyadi Yellow
  },
  storeSectionLast: {
    marginBottom: 0,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  storeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#004040', // Rich Black
  },
  storeTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E8B923', // Hunyadi Yellow
  },
  ingredientsList: {
    maxHeight: 200,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5FFFA', // Mint Cream
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#4CAF50', // Muted green
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUnchecked: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#708090', // Slate Gray
  },
  ingredientName: {
    fontSize: 16,
    color: '#004040', // Rich Black
    flex: 1,
  },
  ingredientDetails: {
    fontSize: 16,
    color: '#708090', // Slate Gray
    fontWeight: '600',
  },
  orderButton: {
    backgroundColor: '#4CAF50', // Muted green
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  orderButtonText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    textAlign: 'center',
    margin: 25,
    fontSize: 16,
    color: '#004040', // Rich Black
    fontWeight: '500',
  },
  errorText: {
    textAlign: 'center',
    margin: 25,
    fontSize: 16,
    color: '#E8B923', // Hunyadi Yellow
    fontWeight: '600',
  },
  noDataText: {
    textAlign: 'center',
    margin: 25,
    fontSize: 16,
    color: '#708090', // Slate Gray
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: '#E8B923', // Hunyadi Yellow
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '700',
  },
});