import { USDAFood } from '../types';

export function convertToIngredientPreview(usdaFood: USDAFood) {
  // Extract calories from nutrients (nutrient ID 1008 is calories)
  const calorieNutrient = usdaFood.foodNutrients?.find(n => n.nutrientId === 1008);
  const calories_per_100g = calorieNutrient?.value || 0;

  // Extract protein (nutrient ID 1003)
  const proteinNutrient = usdaFood.foodNutrients?.find(n => n.nutrientId === 1003);
  const protein_per_100g = proteinNutrient?.value || 0;

  // Extract fat (nutrient ID 1004)
  const fatNutrient = usdaFood.foodNutrients?.find(n => n.nutrientId === 1004);
  const fat_per_100g = fatNutrient?.value || 0;

  // Extract carbs (nutrient ID 1005)
  const carbsNutrient = usdaFood.foodNutrients?.find(n => n.nutrientId === 1005);
  const carbs_per_100g = carbsNutrient?.value || 0;

  // Extract fiber (nutrient ID 1079)
  const fiberNutrient = usdaFood.foodNutrients?.find(n => n.nutrientId === 1079);
  const fiber_per_100g = fiberNutrient?.value || 0;

  // Extract sodium (nutrient ID 1093)
  const sodiumNutrient = usdaFood.foodNutrients?.find(n => n.nutrientId === 1093);
  const sodium_per_100g = sodiumNutrient?.value || 0;

  // Determine category based on description
  const category = categorizeFood(usdaFood.description);

  return {
    name: usdaFood.description,
    category,
    calories_per_100g,
    protein_per_100g,
    fat_per_100g,
    carbs_per_100g,
    fiber_per_100g,
    sodium_per_100g,
    fdcId: usdaFood.fdcId,
    brandOwner: usdaFood.brandOwner,
    dataType: usdaFood.dataType
  };
}

export function categorizeFood(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('chicken') || desc.includes('beef') || desc.includes('pork') || 
      desc.includes('fish') || desc.includes('salmon') || desc.includes('tuna') ||
      desc.includes('egg') || desc.includes('protein') || desc.includes('meat')) {
    return 'Protein';
  }
  
  if (desc.includes('broccoli') || desc.includes('spinach') || desc.includes('carrot') ||
      desc.includes('pepper') || desc.includes('tomato') || desc.includes('lettuce') ||
      desc.includes('vegetable') || desc.includes('green')) {
    return 'Vegetable';
  }
  
  if (desc.includes('apple') || desc.includes('banana') || desc.includes('orange') ||
      desc.includes('berry') || desc.includes('fruit') || desc.includes('grape')) {
    return 'Fruit';
  }
  
  if (desc.includes('rice') || desc.includes('bread') || desc.includes('pasta') ||
      desc.includes('wheat') || desc.includes('oat') || desc.includes('grain') ||
      desc.includes('cereal') || desc.includes('flour')) {
    return 'Grain';
  }
  
  if (desc.includes('milk') || desc.includes('cheese') || desc.includes('yogurt') ||
      desc.includes('dairy') || desc.includes('cream') || desc.includes('butter')) {
    return 'Dairy';
  }
  
  if (desc.includes('oil') || desc.includes('fat') || desc.includes('olive')) {
    return 'Oil';
  }
  
  if (desc.includes('salt') || desc.includes('pepper') || desc.includes('spice') ||
      desc.includes('herb') || desc.includes('seasoning')) {
    return 'Seasoning';
  }
  
  return 'Other';
}

export function getCalorieCategory(calories: number): string {
  if (calories < 100) return 'low';
  if (calories < 300) return 'medium';
  return 'high';
} 