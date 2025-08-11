package services

import (
	"fmt"
	"mealplanner/internal/models"
)

// NutritionService handles nutritional calculations for recipes
type NutritionService struct {
	unitConverter *UnitConversionService
}

// NewNutritionService creates a new nutrition service
func NewNutritionService(unitConverter *UnitConversionService) *NutritionService {
	return &NutritionService{
		unitConverter: unitConverter,
	}
}

// IngredientNutrition represents nutrition data for an ingredient
type IngredientNutrition struct {
	Name           string  `json:"name"`
	QuantityGrams  float64 `json:"quantity_grams"`
	Calories       float64 `json:"calories"`
	Protein        float64 `json:"protein"`
	Fat            float64 `json:"fat"`
	Carbs          float64 `json:"carbs"`
	Fiber          float64 `json:"fiber"`
	Sodium         float64 `json:"sodium"`
}

// RecipeNutrition represents total nutrition data for a recipe
type RecipeNutrition struct {
	TotalCalories    float64               `json:"total_calories"`
	TotalProtein     float64               `json:"total_protein"`
	TotalFat         float64               `json:"total_fat"`
	TotalCarbs       float64               `json:"total_carbs"`
	TotalFiber       float64               `json:"total_fiber"`
	TotalSodium      float64               `json:"total_sodium"`
	Servings         int                   `json:"servings"`
	CaloriesPerServing float64             `json:"calories_per_serving"`
	ProteinPerServing  float64             `json:"protein_per_serving"`
	FatPerServing      float64             `json:"fat_per_serving"`
	CarbsPerServing    float64             `json:"carbs_per_serving"`
	FiberPerServing    float64             `json:"fiber_per_serving"`
	SodiumPerServing   float64             `json:"sodium_per_serving"`
	Ingredients      []IngredientNutrition `json:"ingredients"`
}

// CalculateRecipeNutrition calculates nutrition for a complete recipe
func (s *NutritionService) CalculateRecipeNutrition(recipeIngredients []models.RecipeIngredient, ingredients []models.Ingredient, servings int) (*RecipeNutrition, error) {
	var ingredientNutritions []IngredientNutrition
	var totalCalories, totalProtein, totalFat, totalCarbs, totalFiber, totalSodium float64

	// Create a lookup map for ingredients
	ingredientMap := make(map[string]models.Ingredient)
	for _, ing := range ingredients {
		ingredientMap[ing.ID.String()] = ing
	}

	// Calculate nutrition for each ingredient
	for _, recipeIng := range recipeIngredients {
		ingredient, exists := ingredientMap[recipeIng.IngredientID.String()]
		if !exists {
			continue // Skip if ingredient not found
		}

		// Convert quantity to grams
		quantityGrams, err := s.unitConverter.ConvertToGrams(ingredient.Name, recipeIng.Quantity, recipeIng.Unit)
		if err != nil {
			// If conversion fails, assume the quantity is already in grams
			quantityGrams = recipeIng.Quantity
		}

		// Calculate nutrition values based on per-100g values
		multiplier := quantityGrams / 100.0

		ingNutrition := IngredientNutrition{
			Name:          ingredient.Name,
			QuantityGrams: quantityGrams,
			Calories:      getFloatValue(ingredient.CaloriesPer100g) * multiplier,
			Protein:       getFloatValue(ingredient.ProteinPer100g) * multiplier,
			Fat:           getFloatValue(ingredient.FatPer100g) * multiplier,
			Carbs:         getFloatValue(ingredient.CarbsPer100g) * multiplier,
			Fiber:         getFloatValue(ingredient.FiberPer100g) * multiplier,
			Sodium:        getFloatValue(ingredient.SodiumPer100g) * multiplier,
		}

		ingredientNutritions = append(ingredientNutritions, ingNutrition)

		// Add to totals
		totalCalories += ingNutrition.Calories
		totalProtein += ingNutrition.Protein
		totalFat += ingNutrition.Fat
		totalCarbs += ingNutrition.Carbs
		totalFiber += ingNutrition.Fiber
		totalSodium += ingNutrition.Sodium
	}

	// Calculate per-serving values
	servingsFloat := float64(servings)
	if servingsFloat == 0 {
		servingsFloat = 1
	}

	nutrition := &RecipeNutrition{
		TotalCalories:      totalCalories,
		TotalProtein:       totalProtein,
		TotalFat:           totalFat,
		TotalCarbs:         totalCarbs,
		TotalFiber:         totalFiber,
		TotalSodium:        totalSodium,
		Servings:           servings,
		CaloriesPerServing: totalCalories / servingsFloat,
		ProteinPerServing:  totalProtein / servingsFloat,
		FatPerServing:      totalFat / servingsFloat,
		CarbsPerServing:    totalCarbs / servingsFloat,
		FiberPerServing:    totalFiber / servingsFloat,
		SodiumPerServing:   totalSodium / servingsFloat,
		Ingredients:        ingredientNutritions,
	}

	return nutrition, nil
}

// CalculateIngredientNutrition calculates nutrition for a single ingredient
func (s *NutritionService) CalculateIngredientNutrition(ingredient models.Ingredient, quantity float64, unit string) (*IngredientNutrition, error) {
	// Convert quantity to grams
	quantityGrams, err := s.unitConverter.ConvertToGrams(ingredient.Name, quantity, unit)
	if err != nil {
		return nil, fmt.Errorf("failed to convert units: %w", err)
	}

	// Calculate nutrition values based on per-100g values
	multiplier := quantityGrams / 100.0

	nutrition := &IngredientNutrition{
		Name:          ingredient.Name,
		QuantityGrams: quantityGrams,
		Calories:      getFloatValue(ingredient.CaloriesPer100g) * multiplier,
		Protein:       getFloatValue(ingredient.ProteinPer100g) * multiplier,
		Fat:           getFloatValue(ingredient.FatPer100g) * multiplier,
		Carbs:         getFloatValue(ingredient.CarbsPer100g) * multiplier,
		Fiber:         getFloatValue(ingredient.FiberPer100g) * multiplier,
		Sodium:        getFloatValue(ingredient.SodiumPer100g) * multiplier,
	}

	return nutrition, nil
}

// UpdateRecipeNutrition updates a recipe with calculated nutrition data
func (s *NutritionService) UpdateRecipeNutrition(recipe *models.Recipe, nutrition *RecipeNutrition) {
	recipe.TotalCalories = &nutrition.TotalCalories
	recipe.TotalProtein = &nutrition.TotalProtein
	recipe.TotalFat = &nutrition.TotalFat
	recipe.TotalCarbs = &nutrition.TotalCarbs
	recipe.TotalSodium = &nutrition.TotalSodium
}

// getFloatValue safely extracts float64 from a *float64 pointer
func getFloatValue(ptr *float64) float64 {
	if ptr == nil {
		return 0
	}
	return *ptr
} 