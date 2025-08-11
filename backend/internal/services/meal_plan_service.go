package services

import (
	"fmt"
	"math/rand"
	"strings"
	"time"

	"mealplanner/internal/models"
	"gorm.io/gorm"
)

type MealPlanService struct {
	db *gorm.DB
}

func NewMealPlanService(db *gorm.DB) *MealPlanService {
	return &MealPlanService{
		db: db,
	}
}

// GenerateMealPlan creates a meal plan based on the provided criteria
func (s *MealPlanService) GenerateMealPlan(req *models.MealPlanGenerationRequest) (*models.MealPlan, error) {
	// Create meal plan record
	mealPlan := &models.MealPlan{
		Name:                req.Name,
		StartDate:           req.StartDate,
		EndDate:             req.EndDate,
		BudgetLimit:         req.BudgetLimit,
		CalorieTargetPerDay: req.CalorieTargetPerDay,
		MaxPrepTimeMinutes:  req.MaxPrepTimeMinutes,
		DietaryRestrictions: req.DietaryRestrictions,
	}

	if err := s.db.Create(mealPlan).Error; err != nil {
		return nil, fmt.Errorf("failed to create meal plan: %w", err)
	}

	// Generate meal plan entries
	entries, err := s.generateMealPlanEntries(mealPlan, req)
	if err != nil {
		return nil, fmt.Errorf("failed to generate meal plan entries: %w", err)
	}

	// Calculate totals
	if err := s.calculateMealPlanTotals(mealPlan, entries); err != nil {
		return nil, fmt.Errorf("failed to calculate meal plan totals: %w", err)
	}

	// Load the complete meal plan with entries
	if err := s.db.Preload("Entries.Recipe.Cuisine").Preload("Entries.Recipe.Ingredients.Ingredient").Find(mealPlan).Error; err != nil {
		return nil, fmt.Errorf("failed to load meal plan: %w", err)
	}

	return mealPlan, nil
}

// generateMealPlanEntries generates individual meal entries for the plan
func (s *MealPlanService) generateMealPlanEntries(mealPlan *models.MealPlan, req *models.MealPlanGenerationRequest) ([]models.MealPlanEntry, error) {
	var entries []models.MealPlanEntry
	
	// Get suitable recipes based on criteria
	recipes, err := s.findSuitableRecipes(req)
	if err != nil {
		return nil, fmt.Errorf("failed to find suitable recipes: %w", err)
	}

	if len(recipes) == 0 {
		return nil, fmt.Errorf("no suitable recipes found for the given criteria")
	}

	// Seed random number generator
	rand.Seed(time.Now().UnixNano())

	        // Generate entries for each day
        currentDate := req.StartDate
        for currentDate.Before(req.EndDate) || currentDate.Equal(req.EndDate) {
                dayEntries := s.generateDayMealPlan(mealPlan.BaseModel, currentDate, recipes, req)
                entries = append(entries, dayEntries...)
                currentDate = currentDate.AddDate(0, 0, 1)
        }

	// Save entries to database
	for _, entry := range entries {
		if err := s.db.Create(&entry).Error; err != nil {
			return nil, fmt.Errorf("failed to save meal plan entry: %w", err)
		}
	}

	return entries, nil
}

// generateDayMealPlan generates meal plan for a single day
func (s *MealPlanService) generateDayMealPlan(mealPlanID models.BaseModel, date time.Time, recipes []models.Recipe, req *models.MealPlanGenerationRequest) []models.MealPlanEntry {
	var entries []models.MealPlanEntry
	
	mealTypes := []string{"breakfast", "lunch", "dinner"}
	if len(req.MealTypes) > 0 {
		mealTypes = req.MealTypes
	}

	caloriePerMeal := 600 // default
	if req.CalorieTargetPerDay != nil && *req.CalorieTargetPerDay > 0 {
		caloriePerMeal = *req.CalorieTargetPerDay / len(mealTypes)
	}

	for _, mealType := range mealTypes {
		// Filter recipes suitable for this meal type
		suitableRecipes := s.filterRecipesByMealType(recipes, mealType)
		if len(suitableRecipes) == 0 {
			suitableRecipes = recipes // fallback to all recipes
		}

		// Select recipe based on criteria
		recipe := s.selectRecipeForMeal(suitableRecipes, caloriePerMeal, req)
		if recipe != nil {
			entry := models.MealPlanEntry{
				MealPlanID:  mealPlanID.ID,
				RecipeID:    recipe.ID,
				PlannedDate: date,
				MealType:    mealType,
				Servings:    s.calculateOptimalServings(*recipe, caloriePerMeal),
			}
			entries = append(entries, entry)
		}
	}

	return entries
}

// findSuitableRecipes finds recipes that match the meal plan criteria
func (s *MealPlanService) findSuitableRecipes(req *models.MealPlanGenerationRequest) ([]models.Recipe, error) {
	query := s.db.Model(&models.Recipe{}).
		Preload("Cuisine").
		Preload("Ingredients.Ingredient").
		Preload("Tags")

	// Filter by prep time if specified
	if req.MaxPrepTimeMinutes != nil {
		query = query.Where("total_time_minutes <= ?", *req.MaxPrepTimeMinutes)
	}

	// Filter by preferred cuisines if specified
	if len(req.PreferredCuisines) > 0 {
		query = query.Where("cuisine_id IN ?", req.PreferredCuisines)
	}

	// Filter by dietary restrictions
	if len(req.DietaryRestrictions) > 0 {
		for _, restriction := range req.DietaryRestrictions {
			switch restriction {
			case "vegetarian":
				// Find recipes that don't contain meat ingredients
				query = query.Where("id NOT IN (SELECT DISTINCT recipe_id FROM recipe_ingredients ri JOIN ingredients i ON ri.ingredient_id = i.id WHERE i.category = 'Protein' AND (i.name ILIKE '%chicken%' OR i.name ILIKE '%beef%' OR i.name ILIKE '%pork%' OR i.name ILIKE '%fish%' OR i.name ILIKE '%salmon%'))")
			case "vegan":
				// Find recipes that don't contain any animal products
				query = query.Where("id NOT IN (SELECT DISTINCT recipe_id FROM recipe_ingredients ri JOIN ingredients i ON ri.ingredient_id = i.id WHERE i.category IN ('Protein', 'Dairy') AND (i.name ILIKE '%chicken%' OR i.name ILIKE '%beef%' OR i.name ILIKE '%pork%' OR i.name ILIKE '%fish%' OR i.name ILIKE '%salmon%' OR i.name ILIKE '%milk%' OR i.name ILIKE '%cheese%' OR i.name ILIKE '%egg%'))")
			case "gluten-free":
				// Find recipes that don't contain gluten
				query = query.Where("id NOT IN (SELECT DISTINCT recipe_id FROM recipe_ingredients ri JOIN ingredients i ON ri.ingredient_id = i.id WHERE i.name ILIKE '%wheat%' OR i.name ILIKE '%flour%' OR i.name ILIKE '%bread%' OR i.name ILIKE '%pasta%')")
			}
		}
	}

	var recipes []models.Recipe
	if err := query.Find(&recipes).Error; err != nil {
		return nil, err
	}

	return recipes, nil
}

// filterRecipesByMealType filters recipes suitable for a specific meal type
func (s *MealPlanService) filterRecipesByMealType(recipes []models.Recipe, mealType string) []models.Recipe {
	var suitable []models.Recipe

	for _, recipe := range recipes {
		if s.isRecipeSuitableForMealType(recipe, mealType) {
			suitable = append(suitable, recipe)
		}
	}

	return suitable
}

// isRecipeSuitableForMealType determines if a recipe is suitable for a meal type
func (s *MealPlanService) isRecipeSuitableForMealType(recipe models.Recipe, mealType string) bool {
	// Check recipe tags for meal type suitability
	for _, tag := range recipe.Tags {
		switch mealType {
		case "breakfast":
			if tag.Name == "Breakfast" || tag.Name == "Quick" {
				return true
			}
		case "lunch":
			if tag.Name == "Lunch" || tag.Name == "Quick" || tag.Name == "Light" {
				return true
			}
		case "dinner":
			// Most recipes are suitable for dinner
			return true
		}
	}

	// Default rules based on cooking time and complexity
	switch mealType {
	case "breakfast":
		return recipe.TotalTimeMinutes == nil || *recipe.TotalTimeMinutes <= 30
	case "lunch":
		return recipe.TotalTimeMinutes == nil || *recipe.TotalTimeMinutes <= 45
	case "dinner":
		return true // Any recipe works for dinner
	}

	return true
}

// selectRecipeForMeal selects the best recipe for a meal based on criteria
func (s *MealPlanService) selectRecipeForMeal(recipes []models.Recipe, targetCalories int, req *models.MealPlanGenerationRequest) *models.Recipe {
	if len(recipes) == 0 {
		return nil
	}

	// Score recipes based on multiple criteria
	type recipeScore struct {
		recipe *models.Recipe
		score  float64
	}

	var scoredRecipes []recipeScore

	for i := range recipes {
		recipe := &recipes[i]
		score := s.calculateRecipeScore(recipe, targetCalories, req)
		scoredRecipes = append(scoredRecipes, recipeScore{recipe: recipe, score: score})
	}

	// Sort by score (higher is better)
	for i := 0; i < len(scoredRecipes)-1; i++ {
		for j := i + 1; j < len(scoredRecipes); j++ {
			if scoredRecipes[j].score > scoredRecipes[i].score {
				scoredRecipes[i], scoredRecipes[j] = scoredRecipes[j], scoredRecipes[i]
			}
		}
	}

	// Add some randomness to avoid always picking the same recipes
	topCount := len(scoredRecipes)
	if topCount > 5 {
		topCount = 5
	}

	selectedIndex := rand.Intn(topCount)
	return scoredRecipes[selectedIndex].recipe
}

// calculateRecipeScore calculates a score for a recipe based on various factors
func (s *MealPlanService) calculateRecipeScore(recipe *models.Recipe, targetCalories int, req *models.MealPlanGenerationRequest) float64 {
	score := 0.0

	// Calorie matching (higher score for closer match)
	if recipe.TotalCalories != nil && targetCalories > 0 {
		calorieRatio := float64(targetCalories) / *recipe.TotalCalories
		if calorieRatio > 1 {
			calorieRatio = 1 / calorieRatio
		}
		score += calorieRatio * 30 // Max 30 points for calorie matching
	}

	// Budget consideration
	if req.BudgetLimit != nil && recipe.EstimatedCost != nil {
		budgetPerMeal := *req.BudgetLimit / float64(s.calculateDays(req.StartDate, req.EndDate)) / 3 // 3 meals per day
		if *recipe.EstimatedCost <= budgetPerMeal {
			score += 20 // 20 points for being within budget
		}
	}

	// Time consideration
	if req.MaxPrepTimeMinutes != nil && recipe.TotalTimeMinutes != nil {
		if *recipe.TotalTimeMinutes <= *req.MaxPrepTimeMinutes {
			timeRatio := 1.0 - (float64(*recipe.TotalTimeMinutes) / float64(*req.MaxPrepTimeMinutes))
			score += timeRatio * 20 // Max 20 points for shorter cooking time
		}
	}

	// Difficulty preference (easier recipes get higher scores)
	switch recipe.DifficultyLevel {
	case "easy":
		score += 10
	case "medium":
		score += 5
	case "hard":
		score += 2
	}

	// Nutritional balance (bonus for balanced nutrition)
	if recipe.TotalProtein != nil && recipe.TotalCarbs != nil && recipe.TotalFat != nil {
		// Simple heuristic for nutritional balance
		if *recipe.TotalProtein > 15 && *recipe.TotalCarbs > 10 && *recipe.TotalFat < 30 {
			score += 10
		}
	}

	// Add some randomness to prevent monotony
	score += rand.Float64() * 5

	return score
}

// calculateOptimalServings calculates optimal servings for target calories
func (s *MealPlanService) calculateOptimalServings(recipe models.Recipe, targetCalories int) int {
	if recipe.TotalCalories == nil || *recipe.TotalCalories <= 0 {
		return 1
	}

	servings := float64(targetCalories) / *recipe.TotalCalories
	if servings < 0.5 {
		return 1
	}
	if servings > 4 {
		return 4
	}

	return int(servings + 0.5) // Round to nearest integer
}

// calculateDays calculates the number of days between two dates
func (s *MealPlanService) calculateDays(start, end time.Time) int {
	return int(end.Sub(start).Hours() / 24) + 1
}

// calculateMealPlanTotals calculates and updates the total cost and calories for a meal plan
func (s *MealPlanService) calculateMealPlanTotals(mealPlan *models.MealPlan, entries []models.MealPlanEntry) error {
	var totalCost float64
	var totalCalories float64

	for _, entry := range entries {
		var recipe models.Recipe
		if err := s.db.Preload("Ingredients.Ingredient").First(&recipe, entry.RecipeID).Error; err != nil {
			continue
		}

		if recipe.EstimatedCost != nil {
			totalCost += *recipe.EstimatedCost * float64(entry.Servings)
		}

		if recipe.TotalCalories != nil {
			totalCalories += *recipe.TotalCalories * float64(entry.Servings)
		}
	}

	// Update meal plan with calculated totals
	mealPlan.TotalEstimatedCost = &totalCost
	mealPlan.TotalCalories = &totalCalories

	return s.db.Save(mealPlan).Error
}

// CalculateRecipeNutrition calculates nutritional information for a recipe based on its ingredients
func (s *MealPlanService) CalculateRecipeNutrition(recipeID string) error {
	var recipe models.Recipe
	if err := s.db.Preload("Ingredients.Ingredient").First(&recipe, "id = ?", recipeID).Error; err != nil {
		return fmt.Errorf("recipe not found: %w", err)
	}

	var totalCalories, totalProtein, totalFat, totalCarbs, totalFiber, totalSodium, totalCost float64

	for _, recipeIngredient := range recipe.Ingredients {
		ingredient := recipeIngredient.Ingredient
		if ingredient == nil {
			continue
		}

		// Convert quantity to grams for calculation
		quantityInGrams := s.convertToGrams(recipeIngredient.Quantity, recipeIngredient.Unit)

		// Calculate nutritional values (nutrients are per 100g)
		multiplier := quantityInGrams / 100.0

		if ingredient.CaloriesPer100g != nil {
			totalCalories += *ingredient.CaloriesPer100g * multiplier
		}
		if ingredient.ProteinPer100g != nil {
			totalProtein += *ingredient.ProteinPer100g * multiplier
		}
		if ingredient.FatPer100g != nil {
			totalFat += *ingredient.FatPer100g * multiplier
		}
		if ingredient.CarbsPer100g != nil {
			totalCarbs += *ingredient.CarbsPer100g * multiplier
		}
		if ingredient.FiberPer100g != nil {
			totalFiber += *ingredient.FiberPer100g * multiplier
		}
		if ingredient.SodiumPer100g != nil {
			totalSodium += *ingredient.SodiumPer100g * multiplier
		}

		// Calculate cost
		if ingredient.AvgCostPerUnit != nil {
			costMultiplier := s.convertToCostUnits(recipeIngredient.Quantity, recipeIngredient.Unit, ingredient.UnitType)
			totalCost += *ingredient.AvgCostPerUnit * costMultiplier
		}
	}

	// Update recipe with calculated values
	recipe.TotalCalories = &totalCalories
	recipe.TotalProtein = &totalProtein
	recipe.TotalFat = &totalFat
	recipe.TotalCarbs = &totalCarbs
	recipe.TotalFiber = &totalFiber
	recipe.TotalSodium = &totalSodium
	recipe.EstimatedCost = &totalCost

	return s.db.Save(&recipe).Error
}

// convertToGrams converts various units to grams for nutritional calculation
func (s *MealPlanService) convertToGrams(quantity float64, unit string) float64 {
	// Simplified conversion table
	conversions := map[string]float64{
		"gram":       1,
		"grams":      1,
		"kg":         1000,
		"kilogram":   1000,
		"ounce":      28.35,
		"ounces":     28.35,
		"oz":         28.35,
		"pound":      453.59,
		"pounds":     453.59,
		"lb":         453.59,
		"cup":        240, // approximate for water/milk
		"tablespoon": 15,
		"tbsp":       15,
		"teaspoon":   5,
		"tsp":        5,
		"piece":      100, // default assumption
		"pieces":     100,
		"clove":      3,   // garlic clove
		"cloves":     3,
	}

	if multiplier, exists := conversions[strings.ToLower(unit)]; exists {
		return quantity * multiplier
	}

	return quantity * 100 // default assumption
}

// convertToCostUnits converts recipe units to cost units for pricing
func (s *MealPlanService) convertToCostUnits(quantity float64, recipeUnit, costUnit string) float64 {
	// Convert recipe unit to grams first
	grams := s.convertToGrams(quantity, recipeUnit)
	
	// Convert grams to cost unit
	switch strings.ToLower(costUnit) {
	case "pound", "lb":
		return grams / 453.59
	case "kilogram", "kg":
		return grams / 1000
	case "ounce", "oz":
		return grams / 28.35
	case "gram", "grams":
		return grams
	case "piece", "pieces":
		return quantity // assume 1:1 conversion for pieces
	case "cup":
		return grams / 240
	case "bottle", "container", "can":
		return 1 // assume whole unit
	default:
		return grams // Default to grams if cost unit is unknown or not handled
	}
} 