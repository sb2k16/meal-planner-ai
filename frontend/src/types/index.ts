// Base types
export interface BaseModel {
  id: string;
  created_at: string;
  updated_at: string;
}

// Cuisine types
export interface Cuisine extends BaseModel {
  name: string;
  description: string;
  recipes?: Recipe[];
}

// Ingredient types
export interface Ingredient extends BaseModel {
  name: string;
  fdc_id?: number;
  description: string;
  category: string;
  calories_per_100g?: number;
  protein_per_100g?: number;
  fat_per_100g?: number;
  carbs_per_100g?: number;
  fiber_per_100g?: number;
  sodium_per_100g?: number;
  avg_cost_per_unit?: number;
  unit_type: string;
}

// Recipe types
export interface Recipe extends BaseModel {
  title: string;
  description: string;
  cuisine_id?: string;
  cuisine?: Cuisine;
  instructions: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  total_time_minutes?: number;
  servings: number;
  difficulty_level: 'easy' | 'medium' | 'hard';
  total_calories?: number;
  total_protein?: number;
  total_fat?: number;
  total_carbs?: number;
  total_fiber?: number;
  total_sodium?: number;
  estimated_cost?: number;
  source_url?: string;
  scraped_at?: string;
  ingredients?: RecipeIngredient[];
  tags?: RecipeTag[];
}

export interface RecipeIngredient extends BaseModel {
  recipe_id: string;
  ingredient_id: string;
  ingredient?: Ingredient;
  quantity: number;
  unit: string;
  notes: string;
}

export interface RecipeTag extends BaseModel {
  name: string;
  color: string;
  recipes?: Recipe[];
}

// Meal plan types
export interface MealPlan extends BaseModel {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  budget_limit?: number;
  calorie_target_per_day?: number;
  max_prep_time_minutes?: number;
  dietary_restrictions: string[];
  total_estimated_cost?: number;
  total_calories?: number;
  entries?: MealPlanEntry[];
  shopping_lists?: ShoppingList[];
}

export interface MealPlanEntry extends BaseModel {
  meal_plan_id: string;
  recipe_id: string;
  recipe?: Recipe;
  planned_date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servings: number;
  notes: string;
}

export interface MealPlanGenerationRequest {
  name: string;
  start_date: string;
  end_date: string;
  budget_limit?: number;
  calorie_target_per_day?: number;
  max_prep_time_minutes?: number;
  dietary_restrictions: string[];
  preferred_cuisines: string[];
  meal_types: string[];
}

// Shopping list types
export interface ShoppingList extends BaseModel {
  meal_plan_id: string;
  name: string;
  status: 'pending' | 'shopping' | 'completed';
  total_estimated_cost?: number;
  items?: ShoppingListItem[];
}

export interface ShoppingListItem extends BaseModel {
  shopping_list_id: string;
  ingredient_id: string;
  ingredient?: Ingredient;
  quantity: number;
  unit: string;
  estimated_cost?: number;
  purchased: boolean;
  actual_cost?: number;
  notes: string;
}

// User preferences types
export interface UserPreferences extends BaseModel {
  dietary_restrictions: string[];
  favorite_cuisines: string[];
  disliked_ingredients: string[];
  default_budget?: number;
  default_calorie_target?: number;
  max_prep_time?: number;
  preferred_meal_types: string[];
}

// Enhanced User Preferences System
export interface UserPreferencesEnhanced {
  id: string;
  user_id: string;
  
  // Explicit Dietary Preferences
  dietary_restrictions: string[];
  allergies: string[];
  favorite_cuisines: CuisineScores;
  avoided_ingredients: string[];
  favorite_ingredients: string[];
  
  // Cooking Preferences
  cooking_skill_level: 'beginner' | 'intermediate' | 'advanced';
  max_prep_time_minutes: number;
  max_cook_time_minutes: number;
  preferred_meal_times: string[];
  
  // Health & Nutrition Goals
  daily_calorie_goal?: number;
  daily_protein_goal?: number;
  daily_carb_goal?: number;
  daily_fat_goal?: number;
  weekly_budget_limit?: number;
  
  // Kitchen Setup
  available_equipment: string[];
  kitchen_size: 'small' | 'medium' | 'large';
  
  // Lifestyle Preferences
  meal_prep_style: 'batch_cook' | 'fresh_daily' | 'leftovers_friendly';
  family_size: number;
  preferred_shopping_frequency: 'daily' | 'weekly' | 'biweekly';
  
  // Personalization Settings
  recommendation_style: 'adventurous' | 'balanced' | 'conservative';
  onboarding_completed: boolean;
  preferences_last_updated: string;
  
  created_at: string;
  updated_at: string;
}

export interface CuisineScores {
  [cuisine: string]: number; // 0.0 to 1.0
}

// User Behavior Tracking
export interface UserBehaviorEvent {
  id: string;
  user_id: string;
  event_type: string;
  recipe_id?: string;
  ingredient_id?: string;
  cuisine_type?: string;
  meal_type?: string;
  event_data: BehaviorEventData;
  session_id: string;
  timestamp: string;
  device_type: string;
  source: string;
}

export interface BehaviorEventData {
  duration?: number;
  rating?: number;
  search_query?: string;
  scroll_depth?: number;
  time_of_day?: string;
  was_recommended?: boolean;
  time_on_page?: number;
  timestamp?: string;
  modifications_made?: string;
  would_cook_again?: boolean;
  results_count?: number;
  filters_applied?: number;
  recommendation_reasons?: string[];
  position_in_list?: number;
  feature_name?: string;
  context?: any;
  generation_success?: boolean;
  processing_time_ms?: number;
  page_name?: string;
  referrer?: string;
  onboarding_step?: string;
  completed?: boolean;
  time_spent_ms?: number;
}

// User Preference Scores
export interface UserPreferenceScore {
  id: string;
  user_id: string;
  preference_type: string;
  preference_value: string;
  explicit_score: number;
  implicit_score: number;
  combined_score: number;
  confidence: number;
  interaction_count: number;
  last_interaction?: string;
  created_at: string;
  updated_at: string;
}

// Recipe Recommendations
export interface UserRecipeRecommendation {
  id: string;
  user_id: string;
  recipe_id: string;
  relevance_score: number;
  diversity_boost: number;
  freshness_score: number;
  final_score: number;
  recommendation_reason: string[];
  meal_type: string;
  recommended_for_date?: string;
  shown_to_user: boolean;
  user_action: string;
  user_feedback?: number;
  created_at: string;
  expires_at: string;
}

// Recipe Feedback
export interface UserRecipeFeedback {
  id: string;
  user_id: string;
  recipe_id: string;
  rating?: number;
  would_cook_again?: boolean;
  difficulty_actual?: string;
  time_taken_minutes?: number;
  liked_aspects: string[];
  disliked_aspects: string[];
  modifications_made: string;
  notes: string;
  cooked_for_meal_type: string;
  cooked_for_people: number;
  cooking_date?: string;
  created_at: string;
}

// Onboarding Progress
export interface UserOnboardingProgress {
  id: string;
  user_id: string;
  basic_info_completed: boolean;
  dietary_preferences_completed: boolean;
  cooking_preferences_completed: boolean;
  kitchen_setup_completed: boolean;
  goal_setting_completed: boolean;
  first_recipe_interaction: boolean;
  completion_percentage: number;
  current_step: string;
  onboarding_started_at: string;
  onboarding_completed_at?: string;
  onboarding_version: string;
  skip_advanced_features: boolean;
  created_at: string;
  updated_at: string;
}

// Request/Response Types
export interface UpdatePreferencesRequest {
  dietary_restrictions?: string[];
  allergies?: string[];
  favorite_cuisines?: CuisineScores;
  avoided_ingredients?: string[];
  favorite_ingredients?: string[];
  cooking_skill_level?: 'beginner' | 'intermediate' | 'advanced';
  max_prep_time_minutes?: number;
  max_cook_time_minutes?: number;
  preferred_meal_times?: string[];
  daily_calorie_goal?: number;
  nutrition_goals?: NutritionGoals;
  available_equipment?: string[];
  kitchen_size?: 'small' | 'medium' | 'large';
  meal_prep_style?: 'batch_cook' | 'fresh_daily' | 'leftovers_friendly';
  family_size?: number;
  preferred_shopping_frequency?: 'daily' | 'weekly' | 'biweekly';
  recommendation_style?: 'adventurous' | 'balanced' | 'conservative';
}

export interface NutritionGoals {
  daily_protein_goal?: number;
  daily_carb_goal?: number;
  daily_fat_goal?: number;
  weekly_budget_limit?: number;
}

export interface RecommendationRequest {
  user_id: string;
  meal_type?: string;
  max_results: number;
  include_diversity: boolean;
  for_date?: string;
  exclude_recipe_ids?: string[];
  min_relevance_score?: number;
}

export interface PersonalizedRecommendationResponse {
  recommendations: RecommendationWithReason[];
  user_profile: UserPreferenceProfile;
  total_count: number;
  generated_at: string;
}

export interface RecommendationWithReason {
  recipe: Recipe;
  score: number;
  relevance_score: number;
  diversity_boost: number;
  reasons: string[];
  meal_type: string;
  confidence_level: 'high' | 'medium' | 'low';
}

export interface UserPreferenceProfile {
  user_id: string;
  top_cuisines: CuisinePreference[];
  dietary_restrictions: string[];
  allergies: string[];
  cooking_skill_level: string;
  preferred_cooking_time: string;
  recommendation_style: string;
  onboarding_completed: boolean;
  profile_completeness: number;
  last_activity_date?: string;
}

export interface CuisinePreference {
  name: string;
  score: number;
  confidence: number;
}

export interface BehaviorTrackingRequest {
  user_id: string;
  event_type: string;
  recipe_id?: string;
  event_data?: BehaviorEventData;
  session_id: string;
  device_type: string;
  source: string;
}

export interface FeedbackRequest {
  user_id: string;
  recipe_id: string;
  rating?: number;
  would_cook_again?: boolean;
  difficulty_actual?: string;
  time_taken_minutes?: number;
  liked_aspects?: string[];
  disliked_aspects?: string[];
  modifications_made?: string;
  notes?: string;
  cooked_for_meal_type: string;
  cooked_for_people: number;
  cooking_date?: string;
}

// Scraped recipe types
export interface ScrapedRecipe {
  title: string;
  description: string;
  instructions: string;
  prep_time?: number;
  cook_time?: number;
  servings: number;
  ingredients: ScrapedIngredient[];
  source_url: string;
}

export interface ScrapedIngredient {
  name: string;
  quantity: number;
  unit: string;
  notes: string;
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  error: string;
}

// Form types
export interface RecipeFormData {
  title: string;
  description: string;
  cuisine_id?: string;
  instructions: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings: number;
  difficulty_level: 'easy' | 'medium' | 'hard';
  ingredients: {
    ingredient_id: string;
    quantity: number;
    unit: string;
    notes: string;
  }[];
  tags: string[];
}

export interface IngredientFormData {
  name: string;
  description: string;
  category: string;
  calories_per_100g?: number;
  protein_per_100g?: number;
  fat_per_100g?: number;
  carbs_per_100g?: number;
  fiber_per_100g?: number;
  sodium_per_100g?: number;
  avg_cost_per_unit?: number;
  unit_type: string;
}

// Filter types
export interface RecipeFilters {
  search?: string;
  cuisine_id?: string;
  max_time?: number;
  max_calories?: number;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface IngredientFilters {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
}

// Chart data types
export interface NutritionalChartData {
  name: string;
  value: number;
  color: string;
}

export interface CalorieChartData {
  date: string;
  calories: number;
  target: number;
}

export interface CostChartData {
  date: string;
  cost: number;
  budget: number;
}

// Request Types for API Operations
export interface CreateIngredientRequest {
  name: string;
  description?: string;
  category: string;
  unit: string;
  cost_per_unit?: number;
  calories_per_100g?: number;
  protein_per_100g?: number;
  fat_per_100g?: number;
  carbs_per_100g?: number;
  fiber_per_100g?: number;
  sodium_per_100g?: number;
  fdc_id?: number;
}

export interface UpdateIngredientRequest extends Partial<CreateIngredientRequest> {}

export interface CreateRecipeRequest {
  title: string;
  description?: string;
  instructions: string[];
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  cuisine_id?: string;
  ingredients: Array<{
    ingredient_id: string;
    quantity: number;
    unit: string;
  }>;
  tags?: string[];
}

export interface UpdateRecipeRequest extends Partial<CreateRecipeRequest> {}

export interface CreateMealPlanRequest {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  total_budget?: number;
  target_calories_per_day?: number;
}

export interface GenerateMealPlanRequest {
  name: string;
  start_date: string;
  end_date: string;
  budget_limit?: number;
  calories_per_day?: number;
  max_cooking_time?: number;
  dietary_restrictions?: string[];
  preferred_cuisines?: string[];
}

export interface CreateShoppingListRequest {
  name: string;
  description?: string;
  meal_plan_id?: string;
}

export interface UpdateShoppingListRequest extends Partial<CreateShoppingListRequest> {}

export interface CreateUserPreferencesRequest {
  dietary_restrictions: string[];
  favorite_cuisines: string[];
  disliked_ingredients: string[];
  default_servings: number;
  budget_per_week?: number;
  calories_per_day?: number;
  max_cooking_time?: number;
}

export interface UpdateUserPreferencesRequest extends Partial<CreateUserPreferencesRequest> {}

// USDA API Response Types
export interface USDAFoodSearchResponse {
  foods: USDAFood[];
  total_hits: number;
  current_page: number;
  total_pages: number;
}

export interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  publicationDate?: string;
  brandOwner?: string;
  foodNutrients?: USDANutrient[];
}

export interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  unitName: string;
  value: number;
}

export interface USDAFoodDetailsResponse {
  fdc_id: number;
  description: string;
  data_type: string;
  publication_date: string;
  brand_owner?: string;
  nutrients: USDAFoodDetailsNutrient[];
}

export interface USDAFoodDetailsNutrient {
  nutrient: {
    id: number;
    name: string;
    unit_name: string;
  };
  amount: number;
}

// Enhanced Ingredient Types with USDA Integration
export interface IngredientWithCalories extends Ingredient {
  calorie_category: 'low' | 'medium' | 'high' | 'unknown';
  is_from_usda: boolean;
}

export interface CalorieFilterParams {
  search?: string;
  category?: string;
  min_calories?: number;
  max_calories?: number;
  calorie_category?: 'low' | 'medium' | 'high';
  page?: number;
  limit?: number;
}

export interface USDASearchFilters {
  query: string;
  limit?: number;
  data_type?: string;
  brand_owner?: string;
}

// Shopping Cart Types
export interface ShoppingCart extends BaseModel {
  user_id: string;
  name: string;
  status: 'active' | 'checked_out' | 'abandoned';
  total_estimated_cost?: number;
  items?: ShoppingCartItem[];
}

export interface ShoppingCartItem extends BaseModel {
  shopping_cart_id: string;
  ingredient_id: string;
  ingredient?: Ingredient;
  quantity: number;
  unit: string;
  estimated_cost?: number;
  notes: string;
}

export interface AddToCartRequest {
  ingredient_id: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface UpdateCartItemRequest {
  quantity: number;
  notes?: string;
}

export interface GroceryStore {
  id: string;
  name: string;
  description: string;
  logo: string;
  available: boolean;
}

export interface CheckoutSession {
  checkout_url: string;
  session_id: string;
  store: string;
  store_name: string;
  total_cost: number;
  expires_at: string;
  shopping_list: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
    estimated_cost?: number;
  }>;
  instructions: string;
  item_count: number;
  auto_redirect: boolean;
}

export interface StoreProduct {
  id: string;
  name: string;
  brand: string;
  size: string;
  price: number;
  unit: string;
  image_url: string;
  in_stock: boolean;
  rating?: number;
  review_count?: number;
  description?: string;
}

export interface CartItemProducts {
  cart_item_id: string;
  ingredient_name: string;
  requested_qty: number;
  requested_unit: string;
  products: StoreProduct[];
  search_query: string;
}

export interface CheckoutPaneData {
  session_id: string;
  store: string;
  store_name: string;
  cart_id: string;
  items: CartItemProducts[];
  shopping_list: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  estimated_total: number;
  item_count: number;
  expires_at: string;
  checkout_type: string;
  instructions: string;
}

// AI Recipe Generation types
export interface RecipeGenerationRequest {
  prompt: string;
  servings?: number;
  max_prep_time?: number;
  max_cook_time?: number;
  dietary_restrictions?: string[];
  cuisine_preference?: string;
  difficulty_level?: 'easy' | 'medium' | 'hard';
  include_nutrition?: boolean;
  include_cost_estimate?: boolean;
  
  // New personalization fields
  voice_style?: 'chef_pro' | 'food_blogger' | 'home_cook' | 'funny_friend' | 'grandma_voice';
  user_preferences?: UserPreferencesForRecipe;
  include_chef_notes?: boolean;
  include_variations?: boolean;
  occasion?: 'weeknight' | 'date_night' | 'family_dinner' | 'meal_prep';
}

// User preferences specific to recipe generation
export interface UserPreferencesForRecipe {
  cooking_level?: 'beginner' | 'intermediate' | 'advanced';
  avoided_ingredients?: string[];
  favorite_ingredients?: string[];
  meal_prep_style?: 'batch_cook' | 'fresh_daily' | 'leftovers_friendly';
  kitchen_equipment?: string[];
  time_of_day?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  family_size?: number;
}

export interface AIGeneratedRecipe {
  title: string;
  description: string;
  cuisine?: string;
  difficulty_level: 'easy' | 'medium' | 'hard';
  prep_time_minutes: number;
  cook_time_minutes: number;
  total_time_minutes: number;
  servings: number;
  ingredients: AIGeneratedIngredient[];
  instructions: string[];
  tags: string[];
  nutrition_summary?: {
    calories_per_serving: number;
    protein_per_serving: number;
    fat_per_serving: number;
    carbs_per_serving: number;
    fiber_per_serving: number;
    sodium_per_serving: number;
  };
  cost_estimate?: {
    total_cost: number;
    cost_per_serving: number;
    currency: string;
  };
  generated_at: string;
  confidence_score: number;
  source: 'ai_generated';
  
  // New personalization fields
  chef_notes?: string;
  variations?: RecipeVariation[];
  personal_tips?: string[];
  storage_advice?: string;
}

export interface RecipeVariation {
  type: 'ingredient_swap' | 'cooking_method' | 'dietary_adaptation';
  title: string;
  description: string;
}

export interface AIGeneratedIngredient {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
  fdc_id?: number;
  category?: string;
  nutrition_per_100g?: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
    sodium: number;
  };
}

export interface RecipeGenerationResponse {
  success: boolean;
  recipe?: AIGeneratedRecipe;
  error?: string;
  processing_time_ms: number;
  tokens_used?: number;
}

// Voice Input types
export interface VoiceInputConfig {
  enabled: boolean;
  language: string;
  continuous: boolean;
  interim_results: boolean;
}

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  is_final: boolean;
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
}

// Nutrition summary types
export interface NutritionSummary {
  total_ingredients: number;
  ingredients_with_calories: number;
  avg_calories: number;
  min_calories: number;
  max_calories: number;
  calorie_distribution?: {
    low: number;    // 0-100 calories per 100g
    medium: number; // 100-300 calories per 100g
    high: number;   // 300+ calories per 100g
  };
  average_nutrition_per_100g?: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
    sodium: number;
  };
  top_categories?: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
}

// Recipe Management Service types
export interface RecipeSearchRequest {
  query: string;
  ingredients?: string[];
  cuisine_type?: string;
  dietary_restrictions?: string[];
  max_prep_time?: number;
  difficulty_level?: string;
  servings?: number;
  enable_llm_fallback?: boolean;
  voice_style?: string;
  occasion?: string;
}

export interface CentralizedScrapedRecipe {
  id: string;
  title: string;
  description: string;
  source_url: string;
  source_site: string;
  image_url?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  total_time_minutes?: number;
  servings: number;
  difficulty_level: string;
  cuisine_type?: string;
  calories_per_serving?: number;
  protein_per_serving?: number;
  fat_per_serving?: number;
  carbs_per_serving?: number;
  fiber_per_serving?: number;
  sodium_per_serving?: number;
  structured_ingredients: any;
  structured_instructions: any;
  dietary_tags: string[];
  processing_status: string;
  quality_score: number;
  created_at: string;
  updated_at: string;
}

export interface EnhancedRecipeResponse {
  scraped_recipes: CentralizedScrapedRecipe[];
  generated_recipe?: AIGeneratedRecipe;
  search_query: string;
  results_found: number;
  search_time: string;
  source: 'database' | 'llm_generated' | 'mixed';
  suggestions?: string[];
}

// Scraping service types
export interface ScrapeUrlRequest {
  url: string;
}

export interface ScrapeUrlResponse {
  success: boolean;
  recipe?: CentralizedScrapedRecipe;
  error?: string;
} 