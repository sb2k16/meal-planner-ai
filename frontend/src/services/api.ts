import axios, { AxiosResponse } from 'axios';
import {
  Recipe,
  Ingredient,
  Cuisine,
  PaginatedResponse,
  IngredientFilters,
  RecipeFilters,
  RecipeTag,
  MealPlan,
  ShoppingList,
  UserPreferences,
  USDAFoodSearchResponse,
  USDAFood,
  CreateIngredientRequest,
  UpdateIngredientRequest,
  CreateRecipeRequest,
  UpdateRecipeRequest,
  CreateMealPlanRequest,
  GenerateMealPlanRequest,
  CreateShoppingListRequest,
  UpdateShoppingListRequest,
  CreateUserPreferencesRequest,
  UpdateUserPreferencesRequest,
  ShoppingCart,
  ShoppingCartItem,
  AddToCartRequest,
  UpdateCartItemRequest,
  GroceryStore,
  CheckoutSession,
  CartItemProducts,
  CheckoutPaneData,
  RecipeGenerationRequest,
  RecipeGenerationResponse,
  NutritionSummary
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Error handling interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Cuisines API
export const cuisinesApi = {
  getAll: () => api.get<Cuisine[]>('/cuisines'),
  getById: (id: string) => api.get<Cuisine>(`/cuisines/${id}`),
  create: (cuisine: Omit<Cuisine, 'id' | 'created_at' | 'updated_at'>) => 
    api.post<Cuisine>('/cuisines', cuisine),
  update: (id: string, cuisine: Partial<Cuisine>) => 
    api.put<Cuisine>(`/cuisines/${id}`, cuisine),
  delete: (id: string) => api.delete(`/cuisines/${id}`),
};

// Enhanced Ingredients API with USDA integration
export const ingredientsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.category) searchParams.append('category', params.category);
    if (params?.search) searchParams.append('search', params.search);
    
    return api.get<{
      ingredients: Ingredient[];
      total: number;
      page: number;
      limit: number;
    }>(`/ingredients?${searchParams.toString()}`);
  },

  getById: (id: string) => api.get<Ingredient>(`/ingredients/${id}`),
  
  create: (ingredient: CreateIngredientRequest) => 
    api.post<Ingredient>('/ingredients', ingredient),
  
  update: (id: string, ingredient: UpdateIngredientRequest) => 
    api.put<Ingredient>(`/ingredients/${id}`, ingredient),
  
  delete: (id: string) => api.delete(`/ingredients/${id}`),

  // USDA Integration
  searchUSDA: (query: string, limit: number = 10) => {
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('limit', limit.toString());
    return api.get<USDAFoodSearchResponse>(`/ingredients/search?${params.toString()}`);
  },

  importFromUSDA: (fdcId: number) => 
    api.post<Ingredient>('/ingredients/import-usda', { fdc_id: fdcId }),

  // Enhanced search with calorie filtering
  searchWithCalories: (params: {
    search?: string;
    category?: string;
    minCalories?: number;
    maxCalories?: number;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.category) searchParams.append('category', params.category);
    if (params.minCalories) searchParams.append('min_calories', params.minCalories.toString());
    if (params.maxCalories) searchParams.append('max_calories', params.maxCalories.toString());
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    
    return api.get<{
      ingredients: Ingredient[];
      total: number;
      page: number;
      limit: number;
    }>(`/ingredients?${searchParams.toString()}`);
  },

  // Get ingredients grouped by calorie ranges
  getByCalorieRanges: () => 
    api.get<{
      low: Ingredient[];      // 0-100 calories per 100g
      medium: Ingredient[];   // 100-300 calories per 100g
      high: Ingredient[];     // 300+ calories per 100g
    }>('/ingredients/calorie-ranges'),

  // Get nutrition summary
  getNutritionSummary: () => 
    api.get<NutritionSummary>('/ingredients/nutrition-summary'),
};

// Recipes API
export const recipesApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    cuisine_id?: string;
    search?: string;
    max_time?: number;
    max_calories?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.cuisine_id) searchParams.append('cuisine_id', params.cuisine_id);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.max_time) searchParams.append('max_time', params.max_time.toString());
    if (params?.max_calories) searchParams.append('max_calories', params.max_calories.toString());
    
    return api.get<{
      recipes: Recipe[];
      total: number;
      page: number;
      limit: number;
    }>(`/recipes?${searchParams.toString()}`);
  },

  getById: (id: string) => api.get<Recipe>(`/recipes/${id}`),
  create: (recipe: CreateRecipeRequest) => api.post<Recipe>('/recipes', recipe),
  update: (id: string, recipe: UpdateRecipeRequest) => api.put<Recipe>(`/recipes/${id}`, recipe),
  delete: (id: string) => api.delete(`/recipes/${id}`),
  calculateNutrition: (id: string) => api.post<Recipe>(`/recipes/${id}/calculate-nutrition`),
  
  // AI Recipe Generation
  generateFromPrompt: (request: RecipeGenerationRequest) => 
    api.post<RecipeGenerationResponse>('/generate-recipe', request),
};

// Recipe Tags API
export const tagsApi = {
  getAll: () => api.get<RecipeTag[]>('/tags'),
  create: (tag: Omit<RecipeTag, 'id' | 'created_at' | 'updated_at'>) => 
    api.post<RecipeTag>('/tags', tag),
  update: (id: string, tag: Partial<RecipeTag>) => 
    api.put<RecipeTag>(`/tags/${id}`, tag),
  delete: (id: string) => api.delete(`/tags/${id}`),
};

// Meal Plans API
export const mealPlansApi = {
  getAll: () => api.get<MealPlan[]>('/meal-plans'),
  getById: (id: string) => api.get<MealPlan>(`/meal-plans/${id}`),
  create: (mealPlan: CreateMealPlanRequest) => api.post<MealPlan>('/meal-plans', mealPlan),
  update: (id: string, mealPlan: Partial<MealPlan>) => 
    api.put<MealPlan>(`/meal-plans/${id}`, mealPlan),
  delete: (id: string) => api.delete(`/meal-plans/${id}`),
  generate: (request: GenerateMealPlanRequest) => 
    api.post<MealPlan>('/meal-plans/generate', request),
};

// AI Meal Plans API
export const aiMealPlanApi = {
  generateAIMealPlan: (query: string) => 
    api.post('/meal-plans/generate', { query }),
};

// Shopping Lists API
export const shoppingListsApi = {
  getAll: () => api.get<ShoppingList[]>('/shopping-lists'),
  getById: (id: string) => api.get<ShoppingList>(`/shopping-lists/${id}`),
  create: (shoppingList: CreateShoppingListRequest) => 
    api.post<ShoppingList>('/shopping-lists', shoppingList),
  update: (id: string, shoppingList: UpdateShoppingListRequest) => 
    api.put<ShoppingList>(`/shopping-lists/${id}`, shoppingList),
  delete: (id: string) => api.delete(`/shopping-lists/${id}`),
};

// Web Scraping API
export const scrapingApi = {
  scrapeRecipe: (url: string) => api.post('/scrape', { url }),
};

// User Preferences API
export const preferencesApi = {
  get: () => api.get<UserPreferences>('/preferences'),
  create: (preferences: CreateUserPreferencesRequest) => 
    api.post<UserPreferences>('/preferences', preferences),
  update: (id: string, preferences: UpdateUserPreferencesRequest) => 
    api.put<UserPreferences>(`/preferences/${id}`, preferences),
};

// Shopping Cart API
export const cartApi = {
  get: () => api.get<ShoppingCart>('/cart'),
  
  addItem: (item: AddToCartRequest) => 
    api.post<ShoppingCartItem>('/cart/items', item),
  
  updateItem: (id: string, item: UpdateCartItemRequest) => 
    api.put<ShoppingCartItem>(`/cart/items/${id}`, item),
  
  removeItem: (id: string) => 
    api.delete(`/cart/items/${id}`),
  
  clear: () => 
    api.delete('/cart'),
  
  getStores: () => 
    api.get<{ stores: GroceryStore[] }>('/cart/stores'),
  
  checkout: (store: string) => 
    api.post<CheckoutSession>(`/cart/checkout/${store}`),
  
  getStoreProducts: (store: string) => 
    api.get<{
      store: string;
      store_name: string;
      cart_id: string;
      items: CartItemProducts[];
      total_items: number;
    }>(`/cart/store-products/${store}`),
  
  checkoutPane: (store: string) => 
    api.post<CheckoutPaneData>(`/cart/checkout-pane/${store}`),
};

// Enhanced USDA-specific utilities
export const usdaUtils = {
  // Convert USDA food to ingredient preview
  convertToIngredientPreview: (usdaFood: USDAFood): Partial<Ingredient> => {
    const calories = usdaFood.foodNutrients?.find(n => n.nutrientId === 1008)?.value;
    const protein = usdaFood.foodNutrients?.find(n => n.nutrientId === 1003)?.value;
    const fat = usdaFood.foodNutrients?.find(n => n.nutrientId === 1004)?.value;
    const carbs = usdaFood.foodNutrients?.find(n => n.nutrientId === 1005)?.value;

    return {
      name: usdaFood.description,
      description: usdaFood.description,
      fdc_id: usdaFood.fdcId,
      calories_per_100g: calories,
      protein_per_100g: protein,
      fat_per_100g: fat,
      carbs_per_100g: carbs,
      category: usdaUtils.categorizeFood(usdaFood.description),
    };
  },

  // Categorize food based on description
  categorizeFood: (description: string): string => {
    const desc = description.toLowerCase();

    if (desc.includes('chicken') || desc.includes('beef') || desc.includes('fish') || 
        desc.includes('salmon') || desc.includes('tuna') || desc.includes('turkey') ||
        desc.includes('pork') || desc.includes('egg') || desc.includes('beans') || 
        desc.includes('lentil')) {
      return 'Protein';
    }

    if (desc.includes('broccoli') || desc.includes('spinach') || desc.includes('carrot') ||
        desc.includes('pepper') || desc.includes('tomato') || desc.includes('onion') ||
        desc.includes('lettuce') || desc.includes('cabbage')) {
      return 'Vegetable';
    }

    if (desc.includes('apple') || desc.includes('banana') || desc.includes('orange') ||
        desc.includes('berry') || desc.includes('grape') || desc.includes('avocado') ||
        desc.includes('lemon') || desc.includes('lime')) {
      return 'Fruit';
    }

    if (desc.includes('rice') || desc.includes('bread') || desc.includes('pasta') ||
        desc.includes('quinoa') || desc.includes('oat') || desc.includes('wheat') ||
        desc.includes('barley') || desc.includes('cereal')) {
      return 'Grain';
    }

    if (desc.includes('milk') || desc.includes('cheese') || desc.includes('yogurt') ||
        desc.includes('butter') || desc.includes('cream')) {
      return 'Dairy';
    }

    if (desc.includes('oil') || desc.includes('fat')) {
      return 'Oil';
    }

    if (desc.includes('salt') || desc.includes('pepper') || desc.includes('spice') ||
        desc.includes('herb') || desc.includes('garlic') || desc.includes('ginger')) {
      return 'Seasoning';
    }

    return 'Other';
  },

  // Format calorie display
  formatCalories: (calories?: number): string => {
    if (calories === undefined || calories === null) return 'N/A';
    return `${Math.round(calories)} cal/100g`;
  },

  // Get calorie category for color coding
  getCalorieCategory: (calories?: number): 'low' | 'medium' | 'high' | 'unknown' => {
    if (calories === undefined || calories === null) return 'unknown';
    if (calories < 100) return 'low';
    if (calories < 300) return 'medium';
    return 'high';
  },
};

export default api;

// Recommendations API
export const recommendationsApi = {
  getPersonalized: (params?: {
    user_id?: string;
    max_prep_time?: number;
    max_cook_time?: number;
    dietary_restrictions?: string[];
    allergies?: string[];
    cooking_skill_level?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.user_id) searchParams.append('user_id', params.user_id);
    if (params?.max_prep_time) searchParams.append('max_prep_time', params.max_prep_time.toString());
    if (params?.max_cook_time) searchParams.append('max_cook_time', params.max_cook_time.toString());
    if (params?.dietary_restrictions) searchParams.append('dietary_restrictions', params.dietary_restrictions.join(','));
    if (params?.allergies) searchParams.append('allergies', params.allergies.join(','));
    if (params?.cooking_skill_level) searchParams.append('cooking_skill_level', params.cooking_skill_level);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    
    return api.get<{
      recommendations: Array<{
        recipe: {
          id: number;
          title: string;
          description: string;
          instructions: string;
          prep_time: string;
          cook_time: string;
          servings: string;
          source_url: string;
          source_site: string;
          scraped_at: string;
          created_at: string;
        };
        recommendation_score: number;
        match_reason: string;
      }>;
      total: number;
      filters: any;
    }>(`/recommendations?${searchParams.toString()}`);
  },
  
  getStats: () => api.get<{
    total_recipes: number;
    by_source: Record<string, number>;
    recent_additions: number;
  }>('/recommendations/stats'),
};

// Scraped Recipes API  
export const scrapedRecipesApi = {
  getAll: (params?: {
    max_prep_time?: number;
    max_cook_time?: number;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.max_prep_time) searchParams.append('max_prep_time', params.max_prep_time.toString());
    if (params?.max_cook_time) searchParams.append('max_cook_time', params.max_cook_time.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    
    return api.get<{
      recipes: Array<{
        id: number;
        title: string;
        description: string;
        instructions: string;
        prep_time: string;
        cook_time: string;
        servings: string;
        source_url: string;
        source_site: string;
        scraped_at: string;
        created_at: string;
      }>;
      total: number;
      filters: any;
    }>(`/scraped-recipes?${searchParams.toString()}`);
  },
  
  getById: (id: number) => api.get<{
    id: number;
    title: string;
    description: string;
    instructions: string;
    prep_time: string;
    cook_time: string;
    servings: string;
    source_url: string;
    source_site: string;
    scraped_at: string;
    created_at: string;
  }>(`/scraped-recipes/${id}`),
};
