import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface IngredientNutrition {
  name: string;
  quantity_grams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sodium: number;
}

export interface RecipeNutrition {
  total_calories: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  total_fiber: number;
  total_sodium: number;
  servings: number;
  calories_per_serving: number;
  protein_per_serving: number;
  fat_per_serving: number;
  carbs_per_serving: number;
  fiber_per_serving: number;
  sodium_per_serving: number;
  ingredients: IngredientNutrition[];
}

export interface NutritionSummary {
  calories_per_serving: number;
  protein_per_serving: number;
  fat_per_serving: number;
  carbs_per_serving: number;
  macro_balance: string;
  health_score: number;
}

export interface UnitConversionRequest {
  ingredient_name: string;
  quantity: number;
  from_unit: string;
  to_unit: string;
}

export interface UnitConversionResult {
  ingredient: string;
  original_quantity: number;
  original_unit: string;
  converted_quantity: number;
  converted_unit: string;
}

// Volume to weight conversion lookup table for frontend calculations
export const volumeToWeight: Record<string, Record<string, number>> = {
  "olive oil": { 
    "1 tbsp": 13.5, 
    "1 tsp": 4.5, 
    "1 cup": 216,
    "tbsp": 13.5,
    "tsp": 4.5,
    "cup": 216,
  },
  "parmesan cheese": { 
    "1 tbsp": 5, 
    "1 cup": 100,
    "tbsp": 5,
    "cup": 100,
  },
  "cherry tomatoes": { 
    "1 cup": 150, 
    "1 medium": 17,
    "cup": 150,
    "medium": 17,
  },
  "garlic": {
    "1 clove": 3,
    "1 tbsp": 8,
    "1 tsp": 3,
    "clove": 3,
    "tbsp": 8,
    "tsp": 3,
  },
  "onion": {
    "1 medium": 110,
    "1 large": 150,
    "1 small": 70,
    "1 cup": 160,
    "medium": 110,
    "large": 150,
    "small": 70,
    "cup": 160,
  },
  "butter": {
    "1 tbsp": 14,
    "1 tsp": 5,
    "1 cup": 227,
    "1 stick": 113,
    "tbsp": 14,
    "tsp": 5,
    "cup": 227,
    "stick": 113,
  },
  // Default conversions
  "default": {
    "1 tbsp": 15,
    "1 tsp": 5,
    "1 cup": 240,
    "1 oz": 28.35,
    "1 lb": 454,
    "tbsp": 15,
    "tsp": 5,
    "cup": 240,
    "oz": 28.35,
    "lb": 454,
    "g": 1,
    "gram": 1,
    "grams": 1,
  }
};

/**
 * Calculate calories for a list of ingredients
 */
export function calculateCalories(ingredients: {
  name: string;
  quantity_grams: number;
  calories_per_100g: number;
}[]): number {
  return ingredients.reduce((total, ing) => {
    return total + (ing.quantity_grams / 100) * ing.calories_per_100g;
  }, 0);
}

/**
 * Convert ingredient quantity to grams (frontend fallback)
 */
export function convertToGrams(ingredientName: string, quantity: number, unit: string): number {
  const normalizedName = ingredientName.toLowerCase().trim();
  const normalizedUnit = unit.toLowerCase().trim();
  
  // If already in grams, return as-is
  if (normalizedUnit === 'g' || normalizedUnit === 'gram' || normalizedUnit === 'grams') {
    return quantity;
  }
  
  // Try ingredient-specific conversion
  const ingredientConversions = volumeToWeight[normalizedName];
  if (ingredientConversions && ingredientConversions[normalizedUnit]) {
    return quantity * ingredientConversions[normalizedUnit];
  }
  
  // Fall back to default conversions
  const defaultConversions = volumeToWeight["default"];
  if (defaultConversions[normalizedUnit]) {
    return quantity * defaultConversions[normalizedUnit];
  }
  
  // If no conversion found, assume grams
  console.warn(`No conversion found for ${unit} of ${ingredientName}, assuming grams`);
  return quantity;
}

/**
 * Calculate nutrition for a single ingredient
 */
export async function calculateIngredientNutrition(
  ingredientId: string,
  quantity: number,
  unit: string
): Promise<{ ingredient: string; nutrition: IngredientNutrition }> {
  const response = await api.post('/nutrition/calculate-ingredient', {
    ingredient_id: ingredientId,
    quantity,
    unit,
  });
  return response.data;
}

/**
 * Get supported units for an ingredient
 */
export async function getSupportedUnits(ingredientName: string): Promise<string[]> {
  const encodedName = encodeURIComponent(ingredientName);
  const response = await api.get(`/nutrition/units/${encodedName}`);
  return response.data.supported_units;
}

/**
 * Convert between units using the backend API
 */
export async function convertUnits(request: UnitConversionRequest): Promise<UnitConversionResult> {
  const response = await api.post('/nutrition/convert-units', request);
  return response.data;
}

/**
 * Get detailed nutrition analysis for a recipe
 */
export async function getRecipeNutritionAnalysis(recipeId: string): Promise<{
  recipe_id: string;
  recipe_title: string;
  nutrition: RecipeNutrition;
  summary: NutritionSummary;
}> {
  const response = await api.get(`/recipes/${recipeId}/nutrition-analysis`);
  return response.data;
}

/**
 * Calculate and update recipe nutrition
 */
export async function calculateRecipeNutrition(recipeId: string): Promise<{
  message: string;
  nutrition: RecipeNutrition;
}> {
  const response = await api.post(`/recipes/${recipeId}/calculate-nutrition`);
  return response.data;
}

/**
 * Format nutrition value for display
 */
export function formatNutritionValue(value: number, unit: string = 'g', decimals: number = 1): string {
  if (value === 0) return `0${unit}`;
  return `${value.toFixed(decimals)}${unit}`;
}

/**
 * Format calories for display
 */
export function formatCalories(calories: number): string {
  return `${Math.round(calories)} cal`;
}

/**
 * Get nutrition color based on health score
 */
export function getNutritionColor(healthScore: number): string {
  if (healthScore >= 8) return '#4caf50'; // Green
  if (healthScore >= 6) return '#ff9800'; // Orange
  if (healthScore >= 4) return '#ff5722'; // Red-orange
  return '#f44336'; // Red
}

/**
 * Get macro balance description
 */
export function getMacroBalanceDescription(macroBalance: string): string {
  const descriptions: Record<string, string> = {
    'High Protein': 'Rich in protein, great for muscle building',
    'High Fat': 'High in healthy fats, good for satiety',
    'High Carb': 'High in carbohydrates, good for energy',
    'Balanced': 'Well-balanced macronutrients',
    'Unknown': 'Nutritional balance not determined',
  };
  
  return descriptions[macroBalance] || 'Nutritional information not available';
}

/**
 * Calculate macro percentages from nutrition data
 */
export function calculateMacroPercentages(nutrition: RecipeNutrition | IngredientNutrition): {
  protein: number;
  fat: number;
  carbs: number;
} {
  const calories = 'calories_per_serving' in nutrition ? nutrition.calories_per_serving : nutrition.calories;
  const protein = 'protein_per_serving' in nutrition ? nutrition.protein_per_serving : nutrition.protein;
  const fat = 'fat_per_serving' in nutrition ? nutrition.fat_per_serving : nutrition.fat;
  const carbs = 'carbs_per_serving' in nutrition ? nutrition.carbs_per_serving : nutrition.carbs;
  
  if (calories === 0) return { protein: 0, fat: 0, carbs: 0 };
  
  const proteinCals = protein * 4; // 4 cal/g protein
  const fatCals = fat * 9;         // 9 cal/g fat
  const carbCals = carbs * 4;      // 4 cal/g carbs
  
  return {
    protein: (proteinCals / calories) * 100,
    fat: (fatCals / calories) * 100,
    carbs: (carbCals / calories) * 100,
  };
}

/**
 * Check if an ingredient has sufficient nutrition data
 */
export function hasCompleteNutritionData(nutrition: IngredientNutrition): boolean {
  return nutrition.calories > 0 || nutrition.protein > 0 || nutrition.fat > 0 || nutrition.carbs > 0;
}

/**
 * Estimate cooking weight loss for different ingredients
 */
export function estimateCookedWeight(rawWeight: number, ingredientName: string, cookingMethod: string = 'general'): number {
  const lossFactors: Record<string, Record<string, number>> = {
    'chicken': { 'grilled': 0.75, 'baked': 0.80, 'boiled': 0.85, 'general': 0.75 },
    'beef': { 'grilled': 0.70, 'baked': 0.75, 'boiled': 0.80, 'general': 0.70 },
    'pork': { 'grilled': 0.72, 'baked': 0.78, 'boiled': 0.82, 'general': 0.72 },
    'fish': { 'grilled': 0.85, 'baked': 0.88, 'boiled': 0.90, 'general': 0.85 },
    'vegetables': { 'steamed': 0.95, 'boiled': 0.90, 'sauteed': 0.85, 'general': 0.90 },
  };
  
  const normalizedName = ingredientName.toLowerCase();
  
  // Find matching category
  for (const [category, methods] of Object.entries(lossFactors)) {
    if (normalizedName.includes(category)) {
      return rawWeight * (methods[cookingMethod] || methods['general']);
    }
  }
  
  // Default: minimal weight loss
  return rawWeight * 0.95;
} 