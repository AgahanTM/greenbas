import { supabase } from '@/services/supabase';
import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// --- Types
type InstructionStep = { step: number; text: string };
type RecipeIngredientRow = {
  quantity: number | string | null;
  unit: string | null;
  ingredients: { name_tk: string } | null;
};
type Recipe = {
  id: string;
  name_tk: string;
  description_tk?: string;
  image_url?: string | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  servings?: number | null;
  category_tk?: string | null;
  difficulty?: string | null;
  tags?: string[] | null;
  instructions_tk?: InstructionStep[];
  recipe_ingredients?: RecipeIngredientRow[];
};

type Category = {
  name: string;
  image_url: string | null;
};

const FALLBACK_IMAGE = 'https://plus.unsplash.com/premium_photo-1671379086168-a5d018d583cf?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8ZnJ1aXR8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&q=60&w=500';

const DiscoveryScreen = () => {
  const [username, setUsername] = useState('Guest');
  const [featuredRecipes, setFeaturedRecipes] = useState<Recipe[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    fetchUserData();
    loadFeatured();
    loadRecipes('');
  }, []);

  // Fetch user data
  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(`Auth error: ${authError.message}`);
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        if (profileError) throw new Error(`Profile fetch error: ${profileError.message}`);
        console.log('Fetched Profile:', profile);
        setUsername(profile?.username || 'Myhman');
      } else {
        console.log('No user logged in, setting username to Guest');
        setUsername('Myhman');
      }
    } catch (error: any) {
      setError(`Error fetching user profile: ${error.message}`);
      console.error('fetchUserData Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch dynamic categories
  const computeCategories = (recs: Recipe[]) => {
    const catMap = new Map<string, { images: string[] }>();
    recs.forEach((r) => {
      const cat = r.category_tk;
      if (cat) {
        const existing = catMap.get(cat) || { images: [] };
        if (r.image_url && r.image_url !== FALLBACK_IMAGE) {
          if (existing.images.length === 0) {
            existing.images.push(r.image_url);
          }
        }
        catMap.set(cat, existing);
      }
    });
    const cats: Category[] = [];
    catMap.forEach((value, key) => {
      const image = value.images[0] || null;
      cats.push({ name: key, image_url: image });
    });
    setCategories(cats.sort((a, b) => a.name.localeCompare(b.name)));
    console.log('Computed Categories:', cats);
  };

  // Helper to add signed URLs for images
  const addSignedUrls = useCallback(async (rows: Recipe[]) => {
    return Promise.all(
      rows.map(async (r) => {
        const copy = { ...r } as Recipe;
        try {
          if (copy.image_url && copy.image_url.startsWith('recipes-images/')) {
            const { data, error } = supabase.storage.from('recipes-images').getPublicUrl(copy.image_url);
            if (error) {
              console.warn('getPublicUrl error', error.message);
            } else if (data?.publicUrl) {
              copy.image_url = data.publicUrl;
            }
          }
          if (!copy.image_url) {
            copy.image_url = FALLBACK_IMAGE;
          }
        } catch (e) {
          console.warn('addSignedUrls failed', e);
          copy.image_url = FALLBACK_IMAGE;
        }
        return copy;
      })
    );
  }, []);

  // Timeout wrapper for network requests
  const fetchWithTimeout = async <T,>(promise: Promise<T>, timeout =10000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeout)),
    ]) as Promise<T>;
  };

  // Load featured recipes
  const loadFeatured = async () => {
  setFeaturedLoading(true);
  setError(null);
  try {
    const query = supabase
      .from('recipes')
      .select(
        `id, name_tk, description_tk, image_url, prep_time_minutes, cook_time_minutes, servings, category_tk, difficulty, tags, instructions_tk, recipe_ingredients(quantity, unit, ingredients(name_tk))`
      )
      .limit(6)
      .order('created_at', { ascending: false });
    const { data, error } = await fetchWithTimeout(query);
    if (error) throw error;
    const rows = (data || []) as Recipe[];
    console.log('Raw Featured Recipes:', rows);
    const updatedRows = await addSignedUrls(rows);
    console.log('Fetched Featured Recipes:', updatedRows);
    setFeaturedRecipes(updatedRows);
  } catch (err: any) {
    console.error('loadFeatured Error:', err);
    setError(err?.message ?? 'Unable to load featured recipes');
  } finally {
    setFeaturedLoading(false);
  }
};

  // Load recipes with search or category filter
  const loadRecipes = async (queryText: string, limit = 30) => {
  setLoading(true);
  setError(null);
  try {
    let builder = supabase
      .from('recipes')
      .select(
        `id, name_tk, description_tk, image_url, prep_time_minutes, cook_time_minutes, servings, category_tk, difficulty, tags, instructions_tk, recipe_ingredients(quantity, unit, ingredients(name_tk))`
      )
      .limit(limit)
      .order('created_at', { ascending: false });

    if (queryText && queryText.trim().length > 0) {
      const q = queryText.trim();
      const orExpr = `name_tk.ilike.%${q}%,description_tk.ilike.%${q}%,category_tk.ilike.%${q}%`;
      builder = builder.or(orExpr);
    }

    const { data, error } = await fetchWithTimeout(builder);
    if (error) throw error;
    const rows = (data || []) as Recipe[];
    console.log('Raw Recipes:', rows); // Log raw data
    const updatedRows = await addSignedUrls(rows);
    console.log('Fetched Recipes:', updatedRows);
    setRecipes(updatedRows);
    if (!queryText || queryText.trim().length === 0) {
        computeCategories(updatedRows);
      }
  } catch (err: any) {
    console.error('loadRecipes Error:', err);
    setError(err?.message ?? 'Unable to load recipes');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  // Handle search
  const handleSearch = () => {
    const q = searchQuery && searchQuery.trim().length > 0 ? searchQuery.trim() : selectedCategory ?? '';
    loadRecipes(q);
  };

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    console.log('Category Selected:', category);
    setSelectedCategory(category || null);
    setSearchQuery('');
    loadRecipes(category);
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
    loadFeatured();
    loadRecipes(selectedCategory ?? '');
  };

  // Show recipe details in modal
  const showRecipeDetails = (recipe: Recipe) => {
    console.log('Recipe Selected:', recipe.name_tk);
    setSelectedRecipe(recipe);
    setModalVisible(true);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  // Format ingredients for display and planner
  const safeGetIngredients = (recipe: Recipe) => {
    return (recipe.recipe_ingredients || []).map((ri) => ({
      name: ri.ingredients?.name_tk ?? 'Unknown',
      quantity: ri.quantity ?? '-',
      unit: ri.unit ?? '',
    }));
  };

  // Add ingredients to shopping planner
 const addToShoppingPlanner = (recipe: Recipe) => {
  try {
    const ingredients = safeGetIngredients(recipe);
    console.log('Navigating to shoppingPlanner with ingredients:', ingredients);
    if (ingredients.length === 0) {
      console.warn('No ingredients available for recipe:', recipe.name_tk);
      setError('No ingredients available for this recipe.');
      return;
    }
    // Serialize ingredients to JSON and encode for URL
    const ingredientsParam = encodeURIComponent(JSON.stringify(ingredients));
    router.push(`/shoppingPlanner?ingredients=${ingredientsParam}&recipe_name=${encodeURIComponent(recipe.name_tk || 'Untitled Recipe')}`);
    setModalVisible(false);
  } catch (e) {
    console.error('addToShoppingPlanner failed:', e);
    setError('Failed to navigate to shopping planner');
  }
};

  // Renderers
 const renderCategory = useCallback(
    ({ item }: { item: Category }) => ( // item is now Category
      <TouchableOpacity
        style={[styles.categoryCard, selectedCategory === item.name && styles.categoryCardSelected]}
        onPress={() => handleCategorySelect(item.name)}
      >
        {/* ADD THE IMAGE */}
        <Image
          source={{ uri: item.image_url || FALLBACK_IMAGE }}
          style={styles.categoryImage}
        />
        <Text style={styles.categoryTitle}>{item.name}</Text>
      </TouchableOpacity>
    ),
    [selectedCategory]
  );

  const renderRecipe = useCallback(
  ({ item }: { item: Recipe }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity style={styles.recipeCard} onPress={() => showRecipeDetails(item)}>
        <Image source={{ uri: item.image_url ?? FALLBACK_IMAGE }} style={styles.recipeImage} resizeMode="cover" />
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeTitle}>{item.name_tk || 'Atsyz'}</Text>
          <Text style={styles.recipeTags}>{(item.tags || []).join(' - ') || 'tag yok'}</Text>
          <View style={styles.recipeMeta}>
            <Text style={styles.recipeMetaText}>⭐ {item.difficulty || 'N/A'}</Text>
            <Text style={styles.recipeMetaText}> | </Text>
            <Text style={styles.recipeMetaText}>
              ⏱️ {item.prep_time_minutes ? `${item.prep_time_minutes} min` : 'N/A'}
            </Text>
            <TouchableOpacity
              style={styles.addToPlannerButton}
              onPress={() => addToShoppingPlanner(item)}
            >
              <Text style={styles.addToPlannerButtonText}>Sargamak plany</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  ),
  [fadeAnim]
);

  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logoIcon}
          />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerSubtitle}>Hosgeldin</Text>
          <Text style={styles.headerMainText}>{username}</Text>
        </View>
        
      </View>

      <View style={styles.staticContent}>
        <View style={styles.searchBar}>
          <Search size={18} color="#708090" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nahar we retsepler gozle..."
            placeholderTextColor="#708090"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
        </View>
      </View>

      {loading && <Text style={styles.loadingText}>Yuklenyar...</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Kategoryalra</Text>
          <TouchableOpacity onPress={() => handleCategorySelect('')}>
            <Text style={styles.seeAll}>Hemmesi {'>'}</Text>
          </TouchableOpacity>
        </View>
        {categories.length > 0 ? (
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.name}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20 }}
          />
        ) : (
          <Text style={styles.noDataText}>Kategorya elyeter dal</Text>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedCategory ? `Retseplary ${selectedCategory}` : 'Retseplar'}
          </Text>
          <TouchableOpacity onPress={() => handleCategorySelect('')}>
            <Text style={styles.seeAll}>{selectedCategory ? 'Yza gayt >' : 'Hemmesini gor >'}</Text>
          </TouchableOpacity>
        </View>
        {featuredLoading ? (
          <ActivityIndicator size="large" color="#E8B923" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.recipeList}>
            {recipes.length > 0 ? (
              recipes.map((item, index) => (
                <React.Fragment key={item.id}>{renderRecipe({ item })}</React.Fragment>
              ))
            ) : (
              <Text style={styles.noDataText}>Elyeter dal</Text>
            )}
          </View>
        )}
      </ScrollView>

      <Modal
  visible={modalVisible}
  animationType="slide"
  onRequestClose={() => setModalVisible(false)}
>
  <SafeAreaProvider style={styles.modalContainer}>
    {selectedRecipe && (
      <>
        <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
          <Text style={styles.closeButtonText}>Yap</Text>
        </TouchableOpacity>
        <ScrollView>
          <Image
            source={{ uri: selectedRecipe.image_url ?? FALLBACK_IMAGE }}
            style={styles.modalImage}
            resizeMode="cover"
          />
          <Text style={styles.modalTitle}>{selectedRecipe.name_tk || 'Bas sozsuz'}</Text>
          <Text style={styles.modalSectionTitle}>Acyklama</Text>
          <Text style={styles.modalText}>{selectedRecipe.description_tk ?? 'Acyklama yok.'}</Text>
          <Text style={styles.modalSectionTitle}>Ingridientlar</Text>
          {safeGetIngredients(selectedRecipe).map((ing, idx) => (
            <Text key={idx} style={styles.modalText}>
              • {ing.quantity} {ing.unit} {ing.name}
            </Text>
          ))}
          <Text style={styles.modalSectionTitle}>Instruksiya</Text>
          {(selectedRecipe.instructions_tk || []).map((s) => (
            <Text key={s.step} style={styles.modalText}>
              {s.step}. {s.text}
            </Text>
          ))}
          <Text style={styles.modalSectionTitle}>Gosmaca</Text>
          <Text style={styles.modalText}>
            Tayyarlyk: {selectedRecipe.prep_time_minutes ?? '-'} minut
          </Text>
          <Text style={styles.modalText}>
            Bisirmek: {selectedRecipe.cook_time_minutes ?? '-'} minut
          </Text>
          <Text style={styles.modalText}>Servis: {selectedRecipe.servings ?? '-'}</Text>
          <Text style={styles.modalText}>Kynlygy: {selectedRecipe.difficulty ?? 'N/A'}</Text>
          <Text style={styles.modalText}>
            Tags: {(selectedRecipe.tags || []).join(', ') || 'Yok'}
          </Text>
          <TouchableOpacity
            style={[styles.addToPlannerButton, { marginBottom: 20 }]}
            onPress={() => addToShoppingPlanner(selectedRecipe)}
          >
            <Text style={[styles.addToPlannerButtonText]}>Bellap goymak</Text>
          </TouchableOpacity>
        </ScrollView>
      </>
    )}
  </SafeAreaProvider>
</Modal>
    </SafeAreaProvider>
  );
};

export default DiscoveryScreen;

// Styles (updated with new button styles and category card changes)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FFFA', // Mint Cream
    paddingTop: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    backgroundColor: '#F5FFFA', // Mint Cream
  },
  logoIcon: {
    width: 80,         // Set your logo's width
    height: 80,        // Set your logo's height
    resizeMode: 'contain', // 'contain' is usually best for logos
  },
  headerTitle: {
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    marginRight: 15,
    color: '#708090', // Slate Gray
    fontWeight: '700',
  },
  headerMainText: {
    fontSize: 18,
    color: '#004040', // Rich Black
    fontWeight: '800',
  },
  staticContent: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#F5FFFA', // Mint Cream
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#004040', // Rich Black
    marginVertical: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
    color: '#708090', // Slate Gray
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#004040', // Rich Black
    paddingVertical: 0,
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
  scrollContainer: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#004040', // Rich Black
  },
  seeAll: {
    fontSize: 15,
    color: '#E8B923', // Hunyadi Yellow
    fontWeight: '600',
  },
  categoryCard: {
    width: 140,
    height: 180,
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginRight: 15,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8B923', // Hunyadi Yellow
  },
  categoryCardSelected: {
    borderWidth: 2,
    borderColor: '#4CAF50', // Muted green
    backgroundColor: '#F5FFFA', // Mint Cream
  },
  categoryImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#004040', // Rich Black
    textAlign: 'center',
  },
  categorySubtitle: {
    fontSize: 13,
    color: '#708090', // Slate Gray
    marginTop: 4,
  },
  recipeList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  recipeCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  recipeImage: {
    width: '100%',
    height: 180,
  },
  recipeInfo: {
    padding: 15,
  },
  recipeTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#004040', // Rich Black
  },
  recipeTags: {
    fontSize: 14,
    color: '#708090', // Slate Gray
    marginTop: 6,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  recipeMetaText: {
    fontSize: 14,
    color: '#708090', // Slate Gray
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5FFFA', // Mint Cream
    padding: 20,
    paddingTop: 30,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 12,
  },
  closeButtonText: {
    fontSize: 17,
    color: '#E8B923', // Hunyadi Yellow
    fontWeight: '700',
  },
  modalImage: {
    width: '100%',
    height: 250,
    borderRadius: 20,
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#004040', // Rich Black
    marginBottom: 25,
  },
  modalSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#004040', // Rich Black
    marginTop: 20,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    color: '#708090', // Slate Gray
    marginBottom: 12,
    lineHeight: 22,
  },
  addToPlannerButton: {
    backgroundColor: '#4CAF50', // Muted green
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  addToPlannerButtonText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
  },
});
