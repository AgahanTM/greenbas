import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';

interface Recipe {
  id: string;
  user_id: string;
  name_en: string;
  name_tk: string;
  description_en: string | null;
  description_tk: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  image_url: string | null;
  category_en: string | null;
  category_tk: string | null;
  difficulty: string | null;
  tags: string[] | null;
  created_at: string;
  profiles: { username: string | null } | null;
}

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  app_mode: string | null;
}

interface Category {
  name: string;
  image_url: string | null;
  min_time: number | null;
}

interface Favorite {
  id: string;
  recipe_id: string;
}

const SkeletonRecipeCard: React.FC = () => (
  <View style={styles.recipeCard}>
    <View style={[styles.recipeImage, styles.skeletonImage]} />
    <View style={styles.recipeInfo}>
      <View style={[styles.skeletonText, { width: '80%', height: 18, marginBottom: 4 }]} />
      <View style={[styles.skeletonText, { width: '100%', height: 14, marginBottom: 4 }]} />
      <View style={[styles.skeletonText, { width: '60%', height: 14, marginBottom: 8 }]} />
      <View style={styles.recipeMeta}>
        <View style={[styles.skeletonText, { width: 60, height: 12 }]} />
        <View style={[styles.skeletonText, { width: 60, height: 12 }]} />
        <View style={[styles.skeletonText, { width: 60, height: 12 }]} />
      </View>
      <View style={[styles.skeletonText, { width: 80, height: 12, marginBottom: 4 }]} />
      <View style={[styles.skeletonText, { width: 50, height: 12 }]} />
    </View>
  </View>
);

const Discovery: React.FC = () => {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('Good Day!');
  const [username, setUsername] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [lang, setLang] = useState<'en' | 'tk'>('en');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [shoppingCount, setShoppingCount] = useState(0);
  const perPage = 20;

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchShoppingCount();
      fetchRecommendedRecipes();
      fetchFavorites();
    }
  }, [userId, page]);

  const fetchUserProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('Please sign in to view recipes.');
        return;
      }

      setUserId(user.id);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, full_name, app_mode')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const profile = profileData as Profile;
      setUsername(profile.username || profile.full_name || 'User');
      setLang((profile.app_mode as 'en' | 'tk') || 'en');

      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good Morning!');
      else if (hour < 18) setGreeting('Good Afternoon!');
      else setGreeting('Good Evening!');
    } catch (err: any) {
      setError('Failed to load user profile. Please try again.');
      console.error('Error fetching user profile:', err.message || err);
    }
  };

  const computeCategories = (recs: Recipe[]) => {
    const catMap = new Map<string, { images: string[], times: number[] }>();
    recs.forEach((r) => {
      const cat = r[`category_${lang}` as keyof Recipe] as string;
      if (cat) {
        const existing = catMap.get(cat) || { images: [], times: [] };
        if (r.image_url) existing.images.push(r.image_url);
        const time = (r.prep_time_minutes || 0) + (r.cook_time_minutes || 0);
        if (time > 0) existing.times.push(time);
        catMap.set(cat, existing);
      }
    });
    const cats: Category[] = [];
    catMap.forEach((value, key) => {
      const minTime = value.times.length > 0 ? Math.min(...value.times) : null;
      const image = value.images[0] || null;
      cats.push({ name: key, image_url: image, min_time: minTime });
    });
    setCategories(cats.sort((a, b) => a.name.localeCompare(b.name)));
  };

  const fetchRecommendedRecipes = async () => {
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      const { data, error } = await supabase
        .from('recipes')
        .select('*, profiles!user_id (username)')
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

      if (error) throw error;

      const newRecipes = data || [];
      setRecipes((prev) => (page === 1 ? newRecipes : [...prev, ...newRecipes]));
      setFilteredRecipes((prev) => (page === 1 ? newRecipes : [...prev, ...newRecipes]));
      computeCategories([...recipes, ...newRecipes]);
    } catch (err: any) {
      setError('Failed to load recipes. Please try again.');
      console.error('Error fetching recipes:', err.message || err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('user_favorite_recipes')
        .select('recipe_id')
        .eq('user_id', userId);

      if (error) throw error;

      setFavorites((data || []).map((f: Favorite) => f.recipe_id));
    } catch (err: any) {
      console.error('Error fetching favorites:', err.message || err);
    }
  };

  const fetchShoppingCount = async () => {
    try {
      const { count, error } = await supabase
        .from('shopping_list_items')
        .select('id', { count: 'exact' })
        .eq('user_id', userId);

      if (error) throw error;

      setShoppingCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching shopping count:', err.message || err);
    }
  };

  const toggleFavorite = async (recipeId: string) => {
    try {
      const isFavorited = favorites.includes(recipeId);
      if (isFavorited) {
        const { error } = await supabase
          .from('user_favorite_recipes')
          .delete()
          .eq('user_id', userId)
          .eq('recipe_id', recipeId);

        if (error) throw error;
        setFavorites((prev) => prev.filter((id) => id !== recipeId));
      } else {
        const { error } = await supabase
          .from('user_favorite_recipes')
          .insert({ user_id: userId, recipe_id: recipeId });

        if (error) throw error;
        setFavorites((prev) => [...prev, recipeId]);
      }
    } catch (err: any) {
      console.error('Error toggling favorite:', err.message || err);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await Promise.all([fetchRecommendedRecipes(), fetchFavorites(), fetchShoppingCount()]);
    setRefreshing(false);
  }, [userId]);

  const loadMore = useCallback(() => {
    if (!loadingMore && recipes.length >= page * perPage) {
      setPage((prev) => prev + 1);
    }
  }, [loadingMore, recipes.length, page, perPage]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    filterRecipes(text, selectedCategory);
  };

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    filterRecipes(searchQuery, category);
  };

  const filterRecipes = (query: string, category: string | null) => {
    let filtered = recipes;

    if (category) {
      filtered = filtered.filter((recipe) => recipe[`category_${lang}` as keyof Recipe] === category);
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter((recipe) =>
        recipe[`name_${lang}` as keyof Recipe].toString().toLowerCase().includes(lowerQuery) ||
        (recipe[`description_${lang}` as keyof Recipe] && recipe[`description_${lang}` as keyof Recipe]!.toString().toLowerCase().includes(lowerQuery))
      );
    }

    setFilteredRecipes(filtered);
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item.name ? styles.selectedCategory : null,
      ]}
      onPress={() => handleCategorySelect(item.name === selectedCategory ? null : item.name)}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.categoryImage} />
      ) : (
        <View style={styles.categoryPlaceholder}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      <Text style={[
        styles.categoryText,
        selectedCategory === item.name ? styles.selectedCategoryText : null,
      ]}>
        {item.name}
      </Text>
      <Text style={styles.categorySubText}>
        {item.min_time ? `Starting ${item.min_time} min` : ''}
      </Text>
    </TouchableOpacity>
  );

  const renderRecipeItem = ({ item }: { item: Recipe }) => {
    const isFavorited = favorites.includes(item.id);
    const totalTime = (item.prep_time_minutes || 0) + (item.cook_time_minutes || 0);
    return (
      <TouchableOpacity
        style={styles.recipeCard}
        onPress={() => router.push({ pathname: '/recipe-detail', params: { recipeId: item.id } })}
      >
        <TouchableOpacity style={styles.favoriteButton} onPress={() => toggleFavorite(item.id)}>
          <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={24} color={isFavorited ? 'red' : '#888'} />
        </TouchableOpacity>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.recipeImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeName}>{item[`name_${lang}` as keyof Recipe] as string}</Text>
          <Text style={styles.recipeDescription} numberOfLines={2}>
            {item[`description_${lang}` as keyof Recipe] as string || 'No description available'}
          </Text>
          <View style={styles.recipeMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="timer-outline" size={12} color="#888" />
              <Text style={styles.metaText}>{item.prep_time_minutes || 'N/A'} min prep</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="timer-outline" size={12} color="#888" />
              <Text style={styles.metaText}>{item.cook_time_minutes || 'N/A'} min cook</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={12} color="#888" />
              <Text style={styles.metaText}>Serves {item.servings || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.recipeMeta}>
            <Text style={styles.metaText}>Total: {totalTime || 'N/A'} min</Text>
            <Text style={styles.metaText}>By {item.profiles?.username || 'Unknown'}</Text>
          </View>
          {item.difficulty && <Text style={styles.difficulty}>Difficulty: {item.difficulty}</Text>}
          {item[`category_${lang}` as keyof Recipe] && <Text style={styles.categoryTag}>{item[`category_${lang}` as keyof Recipe] as string}</Text>}
          {item.tags && item.tags.length > 0 && <Text style={styles.tagsText}>Tags: {item.tags.join(', ')}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return <ActivityIndicator style={{ marginVertical: 20 }} />;
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hey {username}, {greeting}</Text>
        <TouchableOpacity style={styles.cartButton} onPress={() => router.push('shoppingPlanner')}>
          <Ionicons name="cart-outline" size={28} color="#333" />
          {shoppingCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{shoppingCount}</Text></View>}
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.searchInput}
        placeholder="Search dishes, recipes..."
        value={searchQuery}
        onChangeText={handleSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {categories.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Categories</Text>
            <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
          </View>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.name}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          />
        </>
      )}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {selectedCategory ? `${selectedCategory} Recipes` : 'Open Recipes'}
        </Text>
        <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
      </View>
      {loading ? (
        <FlatList
          data={Array.from({ length: 5 })}
          renderItem={() => <SkeletonRecipeCard />}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredRecipes}
          renderItem={renderRecipeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>No recipes found.</Text></View>}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  cartButton: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF9500',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAll: {
    fontSize: 14,
    color: '#007AFF',
  },
  categoryList: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  selectedCategory: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 4,
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  categoryPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  selectedCategoryText: {
    color: '#FFF',
  },
  categorySubText: {
    fontSize: 12,
    color: '#888',
  },
  listContainer: {
    paddingBottom: 16,
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  recipeImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
  },
  skeletonImage: {
    backgroundColor: '#E0E0E0',
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  placeholderText: {
    color: '#AAA',
    fontSize: 12,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  recipeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
  },
  difficulty: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  categoryTag: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  tagsText: {
    fontSize: 12,
    color: '#888',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  skeletonText: {
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
});

export default Discovery;