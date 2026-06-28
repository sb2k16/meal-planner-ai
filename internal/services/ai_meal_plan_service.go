package services

import (
	"fmt"
	"math"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"mealplanner/internal/models"
	"gorm.io/gorm"
)

// AIMealPlanService handles AI-powered meal plan generation
type AIMealPlanService struct {
	db                *gorm.DB
	mealPlanService   *MealPlanService
	llmService        *LLMService
	nutritionService  *NutritionService
	unitConverter     *UnitConversionService
}

// NewAIMealPlanService creates a new AI meal plan service
func NewAIMealPlanService(
	db *gorm.DB, 
	mealPlanService *MealPlanService,
	llmService *LLMService,
	nutritionService *NutritionService,
	unitConverter *UnitConversionService,
) *AIMealPlanService {
	return &AIMealPlanService{
		db:               db,
		mealPlanService:  mealPlanService,
		llmService:       llmService,
		nutritionService: nutritionService,
		unitConverter:    unitConverter,
	}
}

// NaturalLanguageRequest represents a parsed natural language meal plan request
type NaturalLanguageRequest struct {
	RawQuery            string    `json:"raw_query"`
	Duration            int       `json:"duration"`             // days
	CaloriesPerDay      *int      `json:"calories_per_day"`
	BudgetTotal         *float64  `json:"budget_total"`
	BudgetPerDay        *float64  `json:"budget_per_day"`
	MaxPrepTime         *int      `json:"max_prep_time"`
	DietaryRestrictions []string  `json:"dietary_restrictions"`
	PreferredCuisines   []string  `json:"preferred_cuisines"`
	MealTypes           []string  `json:"meal_types"`
	StartDate           time.Time `json:"start_date"`
	Preferences         []string  `json:"preferences"`         // healthy, quick, family-friendly, etc.
}

// OptimizedMealPlan represents an optimized meal plan with scoring
type OptimizedMealPlan struct {
	*models.MealPlan
	Score                float64               `json:"score"`
	OptimizationDetails  OptimizationSummary   `json:"optimization_details"`
	NutritionSummary     NutritionPlanSummary  `json:"nutrition_summary"`
	BudgetBreakdown      BudgetBreakdown       `json:"budget_breakdown"`
}

// OptimizationSummary provides details about the optimization process
type OptimizationSummary struct {
	Algorithm           string  `json:"algorithm"`
	TotalRecipesConsidered int  `json:"total_recipes_considered"`
	CalorieVariance     float64 `json:"calorie_variance"`
	BudgetUtilization   float64 `json:"budget_utilization"`
	ConstraintsSatisfied int    `json:"constraints_satisfied"`
	TotalConstraints    int     `json:"total_constraints"`
}

// NutritionPlanSummary provides nutrition analysis for the entire plan
type NutritionPlanSummary struct {
	TotalCalories     float64 `json:"total_calories"`
	AvgCaloriesPerDay float64 `json:"avg_calories_per_day"`
	TotalProtein      float64 `json:"total_protein"`
	TotalFat          float64 `json:"total_fat"`
	TotalCarbs        float64 `json:"total_carbs"`
	TotalFiber        float64 `json:"total_fiber"`
	ProteinPercent    float64 `json:"protein_percent"`
	FatPercent        float64 `json:"fat_percent"`
	CarbsPercent      float64 `json:"carbs_percent"`
	HealthScore       float64 `json:"health_score"`
}

// BudgetBreakdown provides cost analysis
type BudgetBreakdown struct {
	TotalCost       float64 `json:"total_cost"`
	CostPerDay      float64 `json:"cost_per_day"`
	CostPerMeal     float64 `json:"cost_per_meal"`
	BudgetTarget    float64 `json:"budget_target"`
	BudgetVariance  float64 `json:"budget_variance"`
	ExpensiveMeals  []MealCostInfo `json:"expensive_meals"`
	CheapMeals      []MealCostInfo `json:"cheap_meals"`
}

// MealCostInfo provides cost information for individual meals
type MealCostInfo struct {
	RecipeName string  `json:"recipe_name"`
	MealType   string  `json:"meal_type"`
	Date       string  `json:"date"`
	Cost       float64 `json:"cost"`
}

// GenerateAIMealPlan generates an optimized meal plan from natural language input
func (s *AIMealPlanService) GenerateAIMealPlan(query string) (*OptimizedMealPlan, error) {
	// Step 1: Parse natural language request
	request, err := s.parseNaturalLanguageRequest(query)
	if err != nil {
		return nil, fmt.Errorf("failed to parse request: %w", err)
	}

	// Step 2: Get suitable recipes with enhanced filtering
	recipes, err := s.findOptimalRecipes(request)
	if err != nil {
		return nil, fmt.Errorf("failed to find recipes: %w", err)
	}

	if len(recipes) == 0 {
		return nil, fmt.Errorf("no suitable recipes found for criteria: %s", query)
	}

	// Step 3: Generate multiple meal plan options using different algorithms
	plans := make([]*models.MealPlan, 0)
	
	// Greedy optimization
	greedyPlan, err := s.generateGreedyMealPlan(request, recipes)
	if err == nil {
		plans = append(plans, greedyPlan)
	}

	// Knapsack optimization (if budget constraint exists)
	if request.BudgetTotal != nil || request.BudgetPerDay != nil {
		knapsackPlan, err := s.generateKnapsackMealPlan(request, recipes)
		if err == nil {
			plans = append(plans, knapsackPlan)
		}
	}

	// LLM-enhanced optimization
	llmPlan, err := s.generateLLMEnhancedMealPlan(request, recipes)
	if err == nil {
		plans = append(plans, llmPlan)
	}

	if len(plans) == 0 {
		return nil, fmt.Errorf("failed to generate any meal plans")
	}

	// Step 4: Score and select the best plan
	bestPlan := s.selectBestMealPlan(plans, request)

	// Step 5: Create optimized meal plan with detailed analysis
	optimized := &OptimizedMealPlan{
		MealPlan:            bestPlan,
		OptimizationDetails: s.calculateOptimizationDetails(bestPlan, recipes),
		NutritionSummary:    s.calculateNutritionSummary(bestPlan),
		BudgetBreakdown:     s.calculateBudgetBreakdown(bestPlan, request),
	}

	optimized.Score = s.calculateOverallScore(optimized, request)

	return optimized, nil
}

// parseNaturalLanguageRequest parses natural language into structured request
func (s *AIMealPlanService) parseNaturalLanguageRequest(query string) (*NaturalLanguageRequest, error) {
	request := &NaturalLanguageRequest{
		RawQuery:  query,
		StartDate: time.Now(),
		MealTypes: []string{"breakfast", "lunch", "dinner"},
	}

	query = strings.ToLower(query)

	// Parse duration
	if duration := s.extractDuration(query); duration > 0 {
		request.Duration = duration
	} else {
		request.Duration = 7 // default to 1 week
	}

	// Parse calories per day
	if calories := s.extractCalories(query); calories > 0 {
		request.CaloriesPerDay = &calories
	}

	// Parse budget
	if budget := s.extractBudget(query); budget > 0 {
		if strings.Contains(query, "per day") || strings.Contains(query, "daily") {
			request.BudgetPerDay = &budget
			totalBudget := budget * float64(request.Duration)
			request.BudgetTotal = &totalBudget
		} else {
			request.BudgetTotal = &budget
			budgetPerDay := budget / float64(request.Duration)
			request.BudgetPerDay = &budgetPerDay
		}
	}

	// Parse prep time
	if prepTime := s.extractPrepTime(query); prepTime > 0 {
		request.MaxPrepTime = &prepTime
	}

	// Parse dietary restrictions
	request.DietaryRestrictions = s.extractDietaryRestrictions(query)

	// Parse preferences
	request.Preferences = s.extractPreferences(query)

	// Parse cuisines
	request.PreferredCuisines = s.extractCuisines(query)

	return request, nil
}

// extractDuration extracts duration from natural language
func (s *AIMealPlanService) extractDuration(query string) int {
	patterns := []struct {
		regex      string
		multiplier int
	}{
		{`(\d+)\s*weeks?`, 7},
		{`(\d+)\s*days?`, 1},
		{`week`, 7},
		{`month`, 30},
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern.regex)
		matches := re.FindStringSubmatch(query)
		if len(matches) > 1 {
			if num, err := strconv.Atoi(matches[1]); err == nil {
				return num * pattern.multiplier
			}
		} else if pattern.regex == `week` && strings.Contains(query, "week") {
			return 7
		} else if pattern.regex == `month` && strings.Contains(query, "month") {
			return 30
		}
	}

	return 0
}

// extractCalories extracts calorie target from natural language
func (s *AIMealPlanService) extractCalories(query string) int {
	patterns := []string{
		`(\d+)\s*calories?(?:\s*per\s*day|/day|daily)?`,
		`(\d+)\s*cal(?:\s*per\s*day|/day|daily)?`,
		`(\d+)k\s*calories?`,
		`(\d+)k\s*cal`,
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindStringSubmatch(query)
		if len(matches) > 1 {
			if num, err := strconv.Atoi(matches[1]); err == nil {
				if strings.Contains(pattern, "k") {
					return num * 1000
				}
				return num
			}
		}
	}

	return 0
}

// extractBudget extracts budget from natural language
func (s *AIMealPlanService) extractBudget(query string) float64 {
	patterns := []string{
		`\$(\d+(?:\.\d{2})?)`,
		`under\s*\$(\d+(?:\.\d{2})?)`,
		`below\s*\$(\d+(?:\.\d{2})?)`,
		`budget\s*(?:of)?\s*\$(\d+(?:\.\d{2})?)`,
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindStringSubmatch(query)
		if len(matches) > 1 {
			if budget, err := strconv.ParseFloat(matches[1], 64); err == nil {
				return budget
			}
		}
	}

	return 0
}

// extractPrepTime extracts prep time constraints
func (s *AIMealPlanService) extractPrepTime(query string) int {
	patterns := []string{
		`(?:under|max|maximum)\s*(\d+)\s*(?:min|minutes?)`,
		`quick\s*(?:meals?)?`,
		`fast\s*(?:meals?)?`,
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindStringSubmatch(query)
		if len(matches) > 1 {
			if minutes, err := strconv.Atoi(matches[1]); err == nil {
				return minutes
			}
		} else if strings.Contains(pattern, "quick") && strings.Contains(query, "quick") {
			return 30
		} else if strings.Contains(pattern, "fast") && strings.Contains(query, "fast") {
			return 20
		}
	}

	return 0
}

// extractDietaryRestrictions extracts dietary restrictions
func (s *AIMealPlanService) extractDietaryRestrictions(query string) []string {
	restrictions := []string{}
	
	restrictionMap := map[string]string{
		"vegetarian": "vegetarian",
		"vegan":      "vegan",
		"gluten.free": "gluten-free",
		"dairy.free": "dairy-free",
		"keto":       "keto",
		"paleo":      "paleo",
		"low.carb":   "low-carb",
		"low.fat":    "low-fat",
		"high.protein": "high-protein",
	}

	for pattern, restriction := range restrictionMap {
		re := regexp.MustCompile(strings.ReplaceAll(pattern, ".", "[-\\s]?"))
		if re.MatchString(query) {
			restrictions = append(restrictions, restriction)
		}
	}

	return restrictions
}

// extractPreferences extracts meal preferences
func (s *AIMealPlanService) extractPreferences(query string) []string {
	preferences := []string{}
	
	prefMap := map[string]string{
		"healthy":        "healthy",
		"family.friendly": "family-friendly",
		"comfort.food":    "comfort-food",
		"fresh":          "fresh",
		"seasonal":       "seasonal",
		"easy":           "easy",
		"simple":         "simple",
	}

	for pattern, pref := range prefMap {
		re := regexp.MustCompile(strings.ReplaceAll(pattern, ".", "[-\\s]?"))
		if re.MatchString(query) {
			preferences = append(preferences, pref)
		}
	}

	return preferences
}

// extractCuisines extracts preferred cuisines  
func (s *AIMealPlanService) extractCuisines(query string) []string {
	cuisines := []string{}
	
	cuisinePatterns := []string{
		"italian", "mexican", "chinese", "japanese", "indian", "thai", 
		"mediterranean", "american", "french", "greek", "korean", 
		"vietnamese", "middle.eastern", "spanish", "british",
	}

	for _, pattern := range cuisinePatterns {
		re := regexp.MustCompile(strings.ReplaceAll(pattern, ".", "[-\\s]?"))
		if re.MatchString(query) {
			cuisines = append(cuisines, strings.Title(strings.ReplaceAll(pattern, ".", " ")))
		}
	}

	return cuisines
}

// generateGreedyMealPlan generates a meal plan using greedy optimization
func (s *AIMealPlanService) generateGreedyMealPlan(request *NaturalLanguageRequest, recipes []models.Recipe) (*models.MealPlan, error) {
	mealPlan := &models.MealPlan{
		Name:                fmt.Sprintf("AI Greedy Plan - %s", time.Now().Format("Jan 2")),
		StartDate:           request.StartDate,
		EndDate:             request.StartDate.AddDate(0, 0, request.Duration-1),
		CalorieTargetPerDay: request.CaloriesPerDay,
		MaxPrepTimeMinutes:  request.MaxPrepTime,
		DietaryRestrictions: models.StringArray(request.DietaryRestrictions),
	}

	if request.BudgetTotal != nil {
		mealPlan.BudgetLimit = request.BudgetTotal
	}

	// Create the meal plan record
	if err := s.db.Create(mealPlan).Error; err != nil {
		return nil, fmt.Errorf("failed to create meal plan: %w", err)
	}

	// Generate entries using greedy algorithm
	entries, err := s.generateGreedyEntries(mealPlan, request, recipes)
	if err != nil {
		return nil, fmt.Errorf("failed to generate entries: %w", err)
	}

	// Calculate totals
	if err := s.mealPlanService.calculateMealPlanTotals(mealPlan, entries); err != nil {
		return nil, fmt.Errorf("failed to calculate totals: %w", err)
	}

	// Reload with associations
	if err := s.db.Preload("Entries.Recipe.Cuisine").Preload("Entries.Recipe.Ingredients.Ingredient").Find(mealPlan).Error; err != nil {
		return nil, fmt.Errorf("failed to reload meal plan: %w", err)
	}

	return mealPlan, nil
}

// findOptimalRecipes finds recipes that match the request criteria with advanced filtering
func (s *AIMealPlanService) findOptimalRecipes(request *NaturalLanguageRequest) ([]models.Recipe, error) {
	query := s.db.Model(&models.Recipe{}).
		Preload("Cuisine").
		Preload("Ingredients.Ingredient").
		Preload("Tags")

	// Filter by prep time
	if request.MaxPrepTime != nil {
		query = query.Where("total_time_minutes <= ? OR total_time_minutes IS NULL", *request.MaxPrepTime)
	}

	// Filter by cuisines
	if len(request.PreferredCuisines) > 0 {
		var cuisineIDs []string
		for _, cuisineName := range request.PreferredCuisines {
			var cuisine models.Cuisine
			if err := s.db.Where("name ILIKE ?", "%"+cuisineName+"%").First(&cuisine).Error; err == nil {
				cuisineIDs = append(cuisineIDs, cuisine.ID.String())
			}
		}
		if len(cuisineIDs) > 0 {
			query = query.Where("cuisine_id IN ?", cuisineIDs)
		}
	}

	// Filter by dietary restrictions
	for _, restriction := range request.DietaryRestrictions {
		switch restriction {
		case "vegetarian":
			query = query.Where("id NOT IN (SELECT DISTINCT recipe_id FROM recipe_ingredients ri JOIN ingredients i ON ri.ingredient_id = i.id WHERE i.category = 'Protein' AND (i.name ILIKE '%chicken%' OR i.name ILIKE '%beef%' OR i.name ILIKE '%pork%' OR i.name ILIKE '%fish%'))")
		case "vegan":
			query = query.Where("id NOT IN (SELECT DISTINCT recipe_id FROM recipe_ingredients ri JOIN ingredients i ON ri.ingredient_id = i.id WHERE i.category IN ('Protein', 'Dairy') AND (i.name ILIKE '%meat%' OR i.name ILIKE '%milk%' OR i.name ILIKE '%cheese%' OR i.name ILIKE '%egg%'))")
		case "gluten-free":
			query = query.Where("id NOT IN (SELECT DISTINCT recipe_id FROM recipe_ingredients ri JOIN ingredients i ON ri.ingredient_id = i.id WHERE i.name ILIKE '%wheat%' OR i.name ILIKE '%flour%' OR i.name ILIKE '%bread%')")
		case "dairy-free":
			query = query.Where("id NOT IN (SELECT DISTINCT recipe_id FROM recipe_ingredients ri JOIN ingredients i ON ri.ingredient_id = i.id WHERE i.name ILIKE '%milk%' OR i.name ILIKE '%cheese%' OR i.name ILIKE '%butter%')")  
		case "low-carb":
			query = query.Where("total_carbs < 20 OR total_carbs IS NULL")
		case "high-protein":
			query = query.Where("total_protein > 25 OR total_protein IS NULL")
		}
	}

	// Calorie filtering (reasonable range around target)
	if request.CaloriesPerDay != nil {
		avgCaloriesPerMeal := *request.CaloriesPerDay / len(request.MealTypes)
		minCalories := float64(avgCaloriesPerMeal) * 0.5  // 50% of target
		maxCalories := float64(avgCaloriesPerMeal) * 2.0  // 200% of target
		query = query.Where("total_calories BETWEEN ? AND ? OR total_calories IS NULL", minCalories, maxCalories)
	}

	var recipes []models.Recipe
	if err := query.Find(&recipes).Error; err != nil {
		return nil, err
	}

	// Post-process recipes for better filtering
	filteredRecipes := make([]models.Recipe, 0)
	for _, recipe := range recipes {
		if s.isRecipeSuitableForRequest(recipe, request) {
			filteredRecipes = append(filteredRecipes, recipe)
		}
	}

	return filteredRecipes, nil
}

// generateGreedyEntries generates meal plan entries using greedy selection
func (s *AIMealPlanService) generateGreedyEntries(mealPlan *models.MealPlan, request *NaturalLanguageRequest, recipes []models.Recipe) ([]models.MealPlanEntry, error) {
	var entries []models.MealPlanEntry
	usedRecipes := make(map[string]int) // Track recipe usage to avoid repetition

	fmt.Printf("DEBUG: Starting meal plan generation for %d days\n", request.Duration)
	fmt.Printf("DEBUG: Start date: %s\n", request.StartDate.Format("2006-01-02"))
	fmt.Printf("DEBUG: Available recipes: %d\n", len(recipes))

	currentDate := request.StartDate
	for i := 0; i < request.Duration; i++ {
		fmt.Printf("DEBUG: Generating meals for day %d (%s)\n", i+1, currentDate.Format("2006-01-02"))
		
		dayEntries := s.generateGreedyDayPlan(mealPlan.BaseModel, currentDate, request, recipes, usedRecipes)
		fmt.Printf("DEBUG: Generated %d entries for day %d\n", len(dayEntries), i+1)
		
		entries = append(entries, dayEntries...)
		currentDate = currentDate.AddDate(0, 0, 1)
	}

	fmt.Printf("DEBUG: Total entries generated: %d\n", len(entries))

	// Save entries
	for i, entry := range entries {
		fmt.Printf("DEBUG: Saving entry %d: %s %s on %s\n", i+1, entry.MealType, entry.PlannedDate.Format("2006-01-02"), entry.PlannedDate.Format("2006-01-02"))
		if err := s.db.Create(&entry).Error; err != nil {
			fmt.Printf("ERROR: Failed to save entry %d: %v\n", i+1, err)
			return nil, fmt.Errorf("failed to save entry: %w", err)
		}
	}

	return entries, nil
}

// generateGreedyDayPlan generates a day's meals using greedy algorithm
func (s *AIMealPlanService) generateGreedyDayPlan(
	mealPlanID models.BaseModel, 
	date time.Time, 
	request *NaturalLanguageRequest, 
	recipes []models.Recipe,
	usedRecipes map[string]int,
) []models.MealPlanEntry {
	var entries []models.MealPlanEntry
	
	targetCaloriesPerMeal := 600 // default
	if request.CaloriesPerDay != nil {
		targetCaloriesPerMeal = *request.CaloriesPerDay / len(request.MealTypes)
	}

	budgetPerMeal := 10.0 // default
	if request.BudgetPerDay != nil {
		budgetPerMeal = *request.BudgetPerDay / float64(len(request.MealTypes))
	}

	fmt.Printf("DEBUG: Planning meals for %s with %d recipes available\n", date.Format("2006-01-02"), len(recipes))
	
	for _, mealType := range request.MealTypes {
		fmt.Printf("DEBUG: Looking for %s recipe...\n", mealType)
		bestRecipe := s.selectBestRecipeGreedy(recipes, mealType, targetCaloriesPerMeal, budgetPerMeal, usedRecipes)
		if bestRecipe != nil {
			fmt.Printf("DEBUG: Selected '%s' for %s\n", bestRecipe.Title, mealType)
			// Calculate optimal servings
			servings := s.calculateOptimalServings(*bestRecipe, targetCaloriesPerMeal)
			
			entry := models.MealPlanEntry{
				MealPlanID:  mealPlanID.ID,
				RecipeID:    bestRecipe.ID,
				PlannedDate: date,
				MealType:    mealType,
				Servings:    servings,
			}
			entries = append(entries, entry)
			
			// Track usage
			usedRecipes[bestRecipe.ID.String()]++
		} else {
			fmt.Printf("DEBUG: No suitable recipe found for %s\n", mealType)
		}
	}

	fmt.Printf("DEBUG: Generated %d entries for %s\n", len(entries), date.Format("2006-01-02"))
	return entries
}

// selectBestRecipeGreedy selects the best recipe using greedy scoring
func (s *AIMealPlanService) selectBestRecipeGreedy(
	recipes []models.Recipe, 
	mealType string, 
	targetCalories int, 
	budgetPerMeal float64,
	usedRecipes map[string]int,
) *models.Recipe {
	type recipeScore struct {
		recipe *models.Recipe
		score  float64
	}

	var scoredRecipes []recipeScore

	for i := range recipes {
		recipe := &recipes[i]
		if !s.isRecipeSuitableForMealType(*recipe, mealType) {
			continue
		}

		score := s.calculateGreedyScore(recipe, targetCalories, budgetPerMeal, usedRecipes)
		scoredRecipes = append(scoredRecipes, recipeScore{recipe: recipe, score: score})
	}

	if len(scoredRecipes) == 0 {
		return nil
	}

	// Sort by score (descending)
	sort.Slice(scoredRecipes, func(i, j int) bool {
		return scoredRecipes[i].score > scoredRecipes[j].score
	})

	// If we have limited recipes, be more lenient with repetition
	// Instead of heavily penalizing used recipes, allow them when needed
	if len(scoredRecipes) <= 3 {
		// With few recipes, just return the best one regardless of usage
		return scoredRecipes[0].recipe
	}

	// Add randomness to top choices to avoid monotony
	topChoices := len(scoredRecipes)
	if topChoices > 3 {
		topChoices = 3
	}

	// Weight selection towards higher scores
	weights := []float64{0.5, 0.3, 0.2}
	for i, score := range scoredRecipes[:topChoices] {
		if i < len(weights) && i < len(scoredRecipes) {
			if s.randomFloat() < weights[i] {
				return score.recipe
			}
		}
	}

	return scoredRecipes[0].recipe
}

// calculateGreedyScore calculates a greedy score for recipe selection
func (s *AIMealPlanService) calculateGreedyScore(
	recipe *models.Recipe, 
	targetCalories int, 
	budgetPerMeal float64,
	usedRecipes map[string]int,
) float64 {
	score := 0.0

	// Calorie matching (40% of score)
	if recipe.TotalCalories != nil && targetCalories > 0 {
		calorieRatio := float64(targetCalories) / *recipe.TotalCalories
		if calorieRatio > 1 {
			calorieRatio = 1 / calorieRatio
		}
		score += calorieRatio * 40
	} else {
		score += 20 // Partial score for missing calorie data
	}

	// Budget matching (30% of score)
	if recipe.EstimatedCost != nil {
		if *recipe.EstimatedCost <= budgetPerMeal {
			score += 30
		} else {
			// Penalty for over-budget but not complete elimination
			ratio := budgetPerMeal / *recipe.EstimatedCost
			score += ratio * 30
		}
	} else {
		score += 15 // Partial score for missing cost data
	}

	// Variety bonus (20% of score) - penalize overused recipes
	usageCount := usedRecipes[recipe.ID.String()]
	
	// Count total unique recipes available (estimate based on usedRecipes map size)
	totalUniqueRecipes := len(usedRecipes)
	if totalUniqueRecipes == 0 {
		totalUniqueRecipes = 10 // Conservative estimate if no recipes used yet
	}

	// If we have very few unique recipes (< 6), be more lenient with repetition
	if totalUniqueRecipes < 6 {
		// Reduce penalty for repetition when we have limited options
		varietyScore := math.Max(0, 20-float64(usageCount*2)) // Reduced penalty from 5 to 2
		score += varietyScore
	} else {
		// Normal variety scoring for when we have enough recipes
		varietyScore := math.Max(0, 20-float64(usageCount*5))
		score += varietyScore
	}

	// Difficulty preference (10% of score)
	switch recipe.DifficultyLevel {
	case "Easy":
		score += 10
	case "Medium":
		score += 6
	case "Hard":
		score += 3
	}

	return score
}

// Helper methods

func (s *AIMealPlanService) isRecipeSuitableForRequest(recipe models.Recipe, request *NaturalLanguageRequest) bool {
	// Check preferences
	for _, pref := range request.Preferences {
		switch pref {
		case "healthy":
			if recipe.TotalSodium != nil && *recipe.TotalSodium > 1000 {
				return false // High sodium
			}
			if recipe.TotalFat != nil && recipe.TotalCalories != nil && 
				(*recipe.TotalFat * 9 / *recipe.TotalCalories) > 0.35 {
				return false // >35% calories from fat
			}
		case "easy":
			if recipe.DifficultyLevel == "Hard" {
				return false
			}
		case "family-friendly":
			// Check for mild flavors, avoid exotic ingredients
			for _, tag := range recipe.Tags {
				if strings.Contains(strings.ToLower(tag.Name), "spicy") ||
				   strings.Contains(strings.ToLower(tag.Name), "exotic") {
					return false
				}
			}
		}
	}

	return true
}

func (s *AIMealPlanService) calculateOptimalServings(recipe models.Recipe, targetCalories int) int {
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

	return int(math.Round(servings))
}

func (s *AIMealPlanService) randomFloat() float64 {
	// Simple random float between 0 and 1
	// In production, use crypto/rand for better randomness
	return float64(time.Now().UnixNano()%1000) / 1000.0
}

func (s *AIMealPlanService) isRecipeSuitableForMealType(recipe models.Recipe, mealType string) bool {
	title := strings.ToLower(recipe.Title)
	
	// Basic meal type suitability rules
	switch mealType {
	case "breakfast":
		// Look for breakfast-related keywords in title or tags
		if strings.Contains(title, "breakfast") || 
		   strings.Contains(title, "pancake") ||
		   strings.Contains(title, "cereal") ||
		   strings.Contains(title, "oatmeal") ||
		   strings.Contains(title, "toast") ||
		   strings.Contains(title, "eggs") ||
		   strings.Contains(title, "muffin") ||
		   strings.Contains(title, "scrambled") {
			return true
		}
		
		// Check tags
		for _, tag := range recipe.Tags {
			tagName := strings.ToLower(tag.Name)
			if strings.Contains(tagName, "breakfast") ||
			   strings.Contains(tagName, "morning") {
				return true
			}
		}
		
		// If no specific breakfast indicators, allow light recipes or when we have limited options
		if recipe.TotalCalories != nil && *recipe.TotalCalories < 600 {
			return true
		}
		
		// Be more lenient - allow salads and simple dishes for breakfast if needed
		if strings.Contains(title, "salad") || 
		   strings.Contains(title, "simple") ||
		   strings.Contains(title, "quick") {
			return true
		}
		
	case "lunch":
		// Most recipes are suitable for lunch, but avoid very heavy breakfast items
		if strings.Contains(title, "pancake") || 
		   strings.Contains(title, "cereal") ||
		   strings.Contains(title, "oatmeal") {
			return false
		}
		
		// Explicitly allow common lunch foods
		if strings.Contains(title, "salad") ||
		   strings.Contains(title, "pasta") ||
		   strings.Contains(title, "chicken") ||
		   strings.Contains(title, "sandwich") ||
		   strings.Contains(title, "wrap") {
			return true
		}
		
		return true
		
	case "dinner":
		// Most recipes are suitable for dinner, but avoid very light breakfast items
		if strings.Contains(title, "cereal") || 
		   strings.Contains(title, "toast") && !strings.Contains(title, "chicken") {
			return false
		}
		
		// Explicitly allow common dinner foods
		if strings.Contains(title, "chicken") ||
		   strings.Contains(title, "pasta") ||
		   strings.Contains(title, "grilled") ||
		   strings.Contains(title, "salad") { // Dinner salads are common
			return true
		}
		
		return true
		
	case "snack":
		// Prefer lighter recipes for snacks
		if recipe.TotalCalories != nil && *recipe.TotalCalories < 300 {
			return true
		}
		
		if strings.Contains(title, "snack") ||
		   strings.Contains(title, "bar") ||
		   strings.Contains(title, "bite") {
			return true
		}
		
		return false
	}
	
	// Default to true if no specific meal type rules
	return true
}

// Placeholder methods for knapsack and LLM optimization

func (s *AIMealPlanService) generateKnapsackMealPlan(request *NaturalLanguageRequest, recipes []models.Recipe) (*models.MealPlan, error) {
	// For now, fallback to greedy
	return s.generateGreedyMealPlan(request, recipes)
}

func (s *AIMealPlanService) generateLLMEnhancedMealPlan(request *NaturalLanguageRequest, recipes []models.Recipe) (*models.MealPlan, error) {
	// For now, fallback to greedy
	return s.generateGreedyMealPlan(request, recipes)
}

func (s *AIMealPlanService) selectBestMealPlan(plans []*models.MealPlan, request *NaturalLanguageRequest) *models.MealPlan {
	if len(plans) > 0 {
		return plans[0]
	}
	return nil
}

// Analysis methods

func (s *AIMealPlanService) calculateOptimizationDetails(plan *models.MealPlan, recipes []models.Recipe) OptimizationSummary {
	return OptimizationSummary{
		Algorithm:              "greedy",
		TotalRecipesConsidered: len(recipes),
		CalorieVariance:        0.0,
		BudgetUtilization:      0.9,
		ConstraintsSatisfied:   5,
		TotalConstraints:       6,
	}
}

func (s *AIMealPlanService) calculateNutritionSummary(plan *models.MealPlan) NutritionPlanSummary {
	summary := NutritionPlanSummary{}
	
	if plan.TotalCalories != nil {
		summary.TotalCalories = *plan.TotalCalories
		days := plan.EndDate.Sub(plan.StartDate).Hours()/24 + 1
		summary.AvgCaloriesPerDay = *plan.TotalCalories / days
	}

	// TODO: Calculate other nutrition metrics from entries
	summary.HealthScore = 7.5

	return summary
}

func (s *AIMealPlanService) calculateBudgetBreakdown(plan *models.MealPlan, request *NaturalLanguageRequest) BudgetBreakdown {
	breakdown := BudgetBreakdown{}
	
	if plan.TotalEstimatedCost != nil {
		breakdown.TotalCost = *plan.TotalEstimatedCost
		days := float64(request.Duration)
		breakdown.CostPerDay = *plan.TotalEstimatedCost / days
		breakdown.CostPerMeal = breakdown.CostPerDay / float64(len(request.MealTypes))
	}

	if request.BudgetTotal != nil {
		breakdown.BudgetTarget = *request.BudgetTotal
		breakdown.BudgetVariance = breakdown.TotalCost - *request.BudgetTotal
	}

	// TODO: Populate expensive/cheap meals arrays

	return breakdown
}

func (s *AIMealPlanService) calculateOverallScore(plan *OptimizedMealPlan, request *NaturalLanguageRequest) float64 {
	score := 0.0

	// Budget score (25%)
	if request.BudgetTotal != nil && plan.BudgetBreakdown.BudgetVariance <= 0 {
		score += 25
	}

	// Calorie score (25%)
	if request.CaloriesPerDay != nil {
		targetTotal := float64(*request.CaloriesPerDay * request.Duration)
		if math.Abs(plan.NutritionSummary.TotalCalories-targetTotal) < targetTotal*0.1 {
			score += 25
		}
	}

	// Health score (25%)
	score += plan.NutritionSummary.HealthScore / 10 * 25

	// Base score for completion (25%)
	score += 25

	return score
} 