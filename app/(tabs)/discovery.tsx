// app/(tabs)/discovery.tsx
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChefHat, Leaf, Search } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Button, FlatList, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../services/supabase';

type Recipe = {
  id: string;
  name_en: string;
  description_en: string;
  image_url: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  category_en: string;
  difficulty: string;
  tags: string[];
  instructions_en: { step: number; text: string }[]; // Assuming jsonb structure
  recipe_ingredients: { quantity: number; unit: string; ingredients: { name_en: string } }[]; // Joined data
};

const categories = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Low-Carb', 'Sustainable', 'Zero-Waste'];

export default function DiscoveryScreen() {
  const [featuredRecipes, setFeaturedRecipes] = useState<Recipe[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Sustainable');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchFeaturedRecipes();
    handleCategorySelect('Sustainable');
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const fetchWithTimeout = async (queryBuilder: any, timeout = 5000) => {
    return Promise.race([
      queryBuilder,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeout))
    ]);
  };

  const fetchFeaturedRecipes = async () => {
    try {
      const { data, error } = await fetchWithTimeout(
        supabase
          .from('recipes')
          .select('id, name_en, description_en, image_url, prep_time_minutes, cook_time_minutes, servings, category_en, difficulty, tags, instructions_en, recipe_ingredients(quantity, unit, ingredients(name_en))')
          .limit(5)
      );
      if (error) throw error;
      setFeaturedRecipes(await addSignedUrls(data || []));
    } catch (err) {
      setError(err.message || 'Failed to fetch featured recipes. Check your connection.');
      console.error('Error fetching featured recipes:', err.message);
    }
  };

  const fetchRecipes = async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      let supabaseQuery = supabase
        .from('recipes')
        .select('id, name_en, description_en, image_url, prep_time_minutes, cook_time_minutes, servings, category_en, difficulty, tags, instructions_en, recipe_ingredients(quantity, unit, ingredients(name_en))')
        .limit(20);
      if (query) {
        supabaseQuery = supabaseQuery.ilike('name_en', `%${query}%`).or(`description_en.ilike.%${query}%`);
      }
      const { data, error } = await fetchWithTimeout(supabaseQuery);
      if (error) throw error;
      setRecipes(await addSignedUrls(data || []));
    } catch (err) {
      setError(err.message || 'Failed to fetch recipes. Check your connection or Supabase setup.');
      console.error('Error fetching recipes:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // If image_url is a storage path (e.g., 'recipes-images/path.jpg'), generate signed URL
  const addSignedUrls = async (recipes: Recipe[]) => {
    return Promise.all(recipes.map(async (recipe) => {
      if (recipe.image_url && recipe.image_url.startsWith('recipes-images/')) { // Assume bucket name
        const { data } = supabase.storage.from('recipes-images').getPublicUrl(recipe.image_url);
        recipe.image_url = data.publicUrl;
      }
      return recipe;
    }));
  };

  const handleSearch = () => {
    fetchRecipes(searchQuery || selectedCategory);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSearchQuery(category);
    fetchRecipes(category);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeaturedRecipes();
    fetchRecipes(selectedCategory);
  };

  const showRecipeDetails = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setModalVisible(true);
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    });
  };

  const getIngredients = (recipe: Recipe) => {
    return recipe.recipe_ingredients.map(ri => ({
      name: ri.ingredients.name_en,
      quantity: ri.quantity,
      unit: ri.unit
    }));
  };

  const addToShoppingPlanner = (ingredients: ReturnType<typeof getIngredients>) => {
    const ingredientsJson = JSON.stringify(ingredients);
    router.push({ pathname: '/(tabs)/shoppingPlanner', params: { ingredients: ingredientsJson } });
    setModalVisible(false);
  };

  const renderFeaturedRecipe = ({ item }: { item: Recipe }) => (
    <TouchableOpacity style={styles.featuredCard} onPress={() => showRecipeDetails(item)}>
      <Image source={{ uri: item.image_url }} style={styles.featuredImage} />
      <LinearGradient colors={['transparent', 'rgba(0,100,0,0.7)']} style={styles.featuredOverlay}>
        <Text style={styles.featuredBadge}>Featured 🌿</Text>
        <Text style={styles.featuredTitle}>{item.name_en}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderCategory = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.categoryButton, selectedCategory === item && styles.selectedCategoryButton]}
      onPress={() => handleCategorySelect(item)}
    >
      <Text style={[styles.categoryText, selectedCategory === item && styles.selectedCategoryText]}>{item}</Text>
    </TouchableOpacity>
  );

  const renderRecipe = ({ item }: { item: Recipe }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity style={styles.recipeCard} onPress={() => showRecipeDetails(item)}>
        <Image source={{ uri: item.image_url }} style={styles.recipeImage} />
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeTitle}>{item.name_en}</Text>
          <Text style={styles.recipeMeta}>Prep: {item.prep_time_minutes} min • Cook: {item.cook_time_minutes} min • Serves: {item.servings} • Difficulty: {item.difficulty}</Text>
          <Text style={styles.recipeDescription} numberOfLines={2}>{item.description_en}</Text>
          <Text style={styles.recipeTags}>Tags: {item.tags?.join(', ')}</Text>
          <Button title="Add to Planner" onPress={() => addToShoppingPlanner(getIngredients(item))} color="#4CAF50" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <LinearGradient colors={['#d0f0c0', '#f0fff0']} style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        <View style={styles.header}>
          <Leaf size={32} color="#228B22" />
          <Text style={styles.title}>GreenBas Discovery</Text>
          <ChefHat size={32} color="#228B22" />
        </View>

        <Text style={styles.sectionTitle}>Featured Eco Recipes</Text>
        <FlatList
          data={featuredRecipes}
          renderItem={renderFeaturedRecipe}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredList}
          ListEmptyComponent={<Text style={styles.emptyText}>Loading...</Text>}
        />

        <Text style={styles.sectionTitle}>Categories</Text>
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={item => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        />

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Search size={24} color="white" />
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {loading ? (
          <ActivityIndicator size="large" color="#228B22" style={styles.loader} />
        ) : recipes.length === 0 ? (
          <Text style={styles.emptyText}>No recipes found. Try a different search or check your connection.</Text>
        ) : (
          <FlatList
            data={recipes}
            renderItem={renderRecipe}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.recipeList}
          />
        )}

        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
            <Animated.View style={[styles.modalContent, { opacity: fadeAnim }]}>
              <ScrollView>
                {selectedRecipe && (
                  <>
                    <Text style={styles.modalTitle}>{selectedRecipe.name_en}</Text>
                    <Image source={{ uri: selectedRecipe.image_url }} style={styles.modalImage} />
                    <Text style={styles.sectionHeader}>Description:</Text>
                    <Text style={styles.listItem}>{selectedRecipe.description_en}</Text>
                    <Text style={styles.sectionHeader}>Ingredients:</Text>
                    {getIngredients(selectedRecipe).map((ing, index) => (
                      <Text key={index} style={styles.listItem}>• {ing.quantity} {ing.unit} {ing.name}</Text>
                    ))}
                    <Text style={styles.sectionHeader}>Instructions:</Text>
                    {selectedRecipe.instructions_en.map((step) => (
                      <Text key={step.step} style={styles.listItem}>{step.step}. {step.text}</Text>
                    ))}
                    <Button title="Add to Planner" onPress={() => addToShoppingPlanner(getIngredients(selectedRecipe))} color="#4CAF50" />
                    <Button title="Close" onPress={() => setModalVisible(false)} color="#999" />
                  </>
                )}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // ... (same as before, add errorText)
  errorText: { color: 'red', textAlign: 'center', marginBottom: 16, fontSize: 16 },
  // other styles...
   container: { flex: 1, paddingTop: 40, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 30, fontWeight: '700', color: '#228B22', marginHorizontal: 12 },
  sectionTitle: { fontSize: 22, fontWeight: '600', color: '#228B22', marginBottom: 12 },
  featuredList: { marginBottom: 24 },
  featuredCard: { width: 240, height: 300, marginRight: 16, borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  featuredBadge: { fontSize: 14, color: 'white', backgroundColor: '#228B22', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, alignSelf: 'flex-start', marginBottom: 6 },
  featuredTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  categoryList: { marginBottom: 24 },
  categoryButton: { backgroundColor: '#f0fff0', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, marginRight: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  selectedCategoryButton: { backgroundColor: '#228B22' },
  categoryText: { fontSize: 15, fontWeight: '600', color: '#333' },
  selectedCategoryText: { color: 'white' },
  searchContainer: { flexDirection: 'row', marginBottom: 24 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', padding: 14, borderRadius: 16, backgroundColor: 'white', elevation: 3 },
  searchButton: { backgroundColor: '#228B22', padding: 14, borderRadius: 16, marginLeft: 12, justifyContent: 'center' },
  recipeList: { paddingBottom: 20 },
  recipeCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 24, marginBottom: 20, elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, overflow: 'hidden' },
  recipeImage: { width: 160, height: 160 },
  recipeInfo: { flex: 1, padding: 16, justifyContent: 'space-between' },
  recipeTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  recipeMeta: { fontSize: 15, color: 'gray', marginVertical: 6 },
  recipeDescription: { fontSize: 14, color: '#555', marginBottom: 8 },
  emptyText: { textAlign: 'center', marginTop: 40, color: 'gray', fontSize: 16 },
  loader: { marginTop: 40 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 24, borderRadius: 24, width: '95%', maxHeight: '85%', elevation: 12, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12 },
  modalTitle: { fontSize: 26, fontWeight: 'bold', marginBottom: 16, color: '#228B22' },
  modalImage: { width: '100%', height: 260, borderRadius: 16, marginBottom: 20 },
  sectionHeader: { fontSize: 22, fontWeight: '600', marginTop: 20, marginBottom: 12, color: '#228B22' },
  listItem: { fontSize: 17, marginBottom: 10, lineHeight: 26 },
});
