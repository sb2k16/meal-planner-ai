package api

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"mealplanner/app/models"
	"mealplanner/app/services"
)

type Handlers struct {
	db               *gorm.DB
	usdaService      *services.USDAService
	scraperService   *services.ScraperService
	mealPlanService  *services.MealPlanService
	aiMealPlanService *services.AIMealPlanService
	llmService       *services.LLMService
	nutritionService *services.NutritionService
	unitConverter    *services.UnitConversionService
	scrapedRecipeService *services.ScrapedRecipeService
}

func NewHandlers(db *gorm.DB, usdaService *services.USDAService, scraperService *services.ScraperService, mealPlanService *services.MealPlanService, aiMealPlanService *services.AIMealPlanService, llmService *services.LLMService, nutritionService *services.NutritionService, unitConverter *services.UnitConversionService, scrapedRecipeService *services.ScrapedRecipeService) *Handlers {
	return &Handlers{
		db:              db,
		usdaService:     usdaService,
		scraperService:  scraperService,
		mealPlanService: mealPlanService,
		aiMealPlanService: aiMealPlanService,
		llmService:      llmService,
		nutritionService: nutritionService,
		unitConverter:   unitConverter,
		scrapedRecipeService: scrapedRecipeService,
	}
}

// SetupRoutes sets up all API routes
func (h *Handlers) SetupRoutes(router *gin.Engine) {
	api := router.Group("/api")
	{
		// Cuisines
		cuisines := api.Group("/cuisines")
		{
			cuisines.GET("", h.GetCuisines)
			cuisines.POST("", h.CreateCuisine)
			cuisines.GET("/:id", h.GetCuisine)
			cuisines.PUT("/:id", h.UpdateCuisine)
			cuisines.DELETE("/:id", h.DeleteCuisine)
		}

		// Ingredients
		ingredients := api.Group("/ingredients")
		{
			ingredients.GET("", h.GetIngredients)
			ingredients.POST("", h.CreateIngredient)
			// Specific routes must come before parameterized routes
			ingredients.GET("/search", h.SearchUSDAIngredients)
			ingredients.POST("/import-usda", h.ImportUSDAIngredient)
			ingredients.GET("/calorie-ranges", h.GetIngredientsByCalorieRanges)
			ingredients.GET("/nutrition-summary", h.GetIngredientNutritionSummary)
			// Parameterized routes come last
			ingredients.GET("/:id", h.GetIngredient)
			ingredients.PUT("/:id", h.UpdateIngredient)
			ingredients.DELETE("/:id", h.DeleteIngredient)
		}

		// Recipes
		recipes := api.Group("/recipes")
		{
			recipes.GET("", h.GetRecipes)
			recipes.POST("", h.CreateRecipe)
			recipes.GET("/:id", h.GetRecipe)
			recipes.PUT("/:id", h.UpdateRecipe)
			recipes.DELETE("/:id", h.DeleteRecipe)
			recipes.POST("/:id/calculate-nutrition", h.CalculateRecipeNutrition)
			recipes.GET("/:id/nutrition-analysis", h.GetRecipeNutritionAnalysis)
		}

		// AI Recipe Generation
		api.POST("/generate-recipe", h.GenerateRecipe)

		// Nutrition and Unit Conversion
		nutrition := api.Group("/nutrition")
		{
			nutrition.POST("/calculate-ingredient", h.CalculateIngredientNutrition)
			nutrition.GET("/units/:ingredient", h.GetSupportedUnits)
			nutrition.POST("/convert-units", h.ConvertUnits)
		}

		// Recipe Tags
		tags := api.Group("/tags")
		{
			tags.GET("", h.GetRecipeTags)
			tags.POST("", h.CreateRecipeTag)
			tags.PUT("/:id", h.UpdateRecipeTag)
			tags.DELETE("/:id", h.DeleteRecipeTag)
		}

		// Meal Plans
		mealPlans := api.Group("/meal-plans")
		{
			mealPlans.GET("", h.GetMealPlans)
			mealPlans.POST("", h.CreateMealPlan)
			mealPlans.GET("/:id", h.GetMealPlan)
			mealPlans.PUT("/:id", h.UpdateMealPlan)
			mealPlans.DELETE("/:id", h.DeleteMealPlan)
			mealPlans.POST("/generate", h.GenerateMealPlan)
			mealPlans.POST("/ai-generate", h.GenerateAIMealPlan)
		}

		// Shopping Lists
		shoppingLists := api.Group("/shopping-lists")
		{
			shoppingLists.GET("", h.GetShoppingLists)
			shoppingLists.POST("", h.CreateShoppingList)
			shoppingLists.GET("/:id", h.GetShoppingList)
			shoppingLists.PUT("/:id", h.UpdateShoppingList)
			shoppingLists.DELETE("/:id", h.DeleteShoppingList)
		}

		// Shopping Cart
		cart := api.Group("/cart")
		{
			cart.GET("", h.GetShoppingCart)
			cart.POST("/items", h.AddToCart)
			cart.PUT("/items/:id", h.UpdateCartItem)
			cart.DELETE("/items/:id", h.RemoveFromCart)
			cart.DELETE("", h.ClearCart)
			cart.POST("/checkout/:store", h.CheckoutWithStore)
			cart.GET("/stores", h.GetAvailableStores)
			cart.GET("/store-products/:store", h.GetStoreProductsForCart)
			cart.POST("/checkout-pane/:store", h.CheckoutWithStorePane)
		}

		// Web Scraping
		api.POST("/scrape", h.ScrapeRecipe)

		// User Preferences
		preferences := api.Group("/preferences")
		{
			preferences.GET("", h.GetUserPreferences)
			preferences.POST("", h.CreateUserPreferences)
			preferences.PUT("/:id", h.UpdateUserPreferences)
		}

		// Scraped Recipes and Recommendations
		recommendations := api.Group("/recommendations")
		{
			recommendations.GET("", h.GetPersonalizedRecommendations)
			recommendations.GET("/stats", h.GetRecommendationStats)
		}

		scrapedRecipes := api.Group("/scraped-recipes")
		{
			scrapedRecipes.GET("", h.GetScrapedRecipes)
			scrapedRecipes.GET("/:id", h.GetScrapedRecipeByID)
		}
	}
}

// Cuisine Handlers
func (h *Handlers) GetCuisines(c *gin.Context) {
	var cuisines []models.Cuisine
	if err := h.db.Find(&cuisines).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, cuisines)
}

func (h *Handlers) CreateCuisine(c *gin.Context) {
	var cuisine models.Cuisine
	if err := c.ShouldBindJSON(&cuisine); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Create(&cuisine).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, cuisine)
}

func (h *Handlers) GetCuisine(c *gin.Context) {
	id := c.Param("id")
	var cuisine models.Cuisine
	if err := h.db.Preload("Recipes").First(&cuisine, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Cuisine not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, cuisine)
}

func (h *Handlers) UpdateCuisine(c *gin.Context) {
	id := c.Param("id")
	var cuisine models.Cuisine
	if err := h.db.First(&cuisine, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Cuisine not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := c.ShouldBindJSON(&cuisine); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Save(&cuisine).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, cuisine)
}

func (h *Handlers) DeleteCuisine(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Delete(&models.Cuisine{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Cuisine deleted successfully"})
}

// Ingredient Handlers
func (h *Handlers) GetIngredients(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	category := c.Query("category")
	search := c.Query("search")
	minCalories := c.Query("min_calories")
	maxCalories := c.Query("max_calories")

	offset := (page - 1) * limit

	query := h.db.Model(&models.Ingredient{})

	if category != "" {
		query = query.Where("category = ?", category)
	}

	if search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}

	// Enhanced calorie filtering
	if minCalories != "" {
		if minCal, err := strconv.ParseFloat(minCalories, 64); err == nil {
			query = query.Where("calories_per_100g >= ?", minCal)
		}
	}

	if maxCalories != "" {
		if maxCal, err := strconv.ParseFloat(maxCalories, 64); err == nil {
			query = query.Where("calories_per_100g <= ?", maxCal)
		}
	}

	var ingredients []models.Ingredient
	var total int64

	query.Count(&total)
	if err := query.Offset(offset).Limit(limit).Find(&ingredients).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ingredients": ingredients,
		"total":       total,
		"page":        page,
		"limit":       limit,
	})
}

func (h *Handlers) CreateIngredient(c *gin.Context) {
	var ingredient models.Ingredient
	if err := c.ShouldBindJSON(&ingredient); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Create(&ingredient).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, ingredient)
}

func (h *Handlers) GetIngredient(c *gin.Context) {
	id := c.Param("id")
	var ingredient models.Ingredient
	if err := h.db.First(&ingredient, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ingredient not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, ingredient)
}

func (h *Handlers) UpdateIngredient(c *gin.Context) {
	id := c.Param("id")
	var ingredient models.Ingredient
	if err := h.db.First(&ingredient, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ingredient not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := c.ShouldBindJSON(&ingredient); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Save(&ingredient).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ingredient)
}

func (h *Handlers) DeleteIngredient(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Delete(&models.Ingredient{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Ingredient deleted successfully"})
}

func (h *Handlers) SearchUSDAIngredients(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	foods, err := h.usdaService.SearchFood(query, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, foods)
}

func (h *Handlers) ImportUSDAIngredient(c *gin.Context) {
	var request struct {
		FDCID int `json:"fdc_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format: " + err.Error()})
		return
	}

	// Check if ingredient with this FDC ID already exists
	var existingIngredient models.Ingredient
	if err := h.db.First(&existingIngredient, "fdc_id = ?", request.FDCID).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Ingredient with this FDC ID already exists",
			"existing_ingredient": existingIngredient,
		})
		return
	}

	// Get food details from USDA
	usdaFood, err := h.usdaService.GetFoodDetails(request.FDCID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch food details from USDA: " + err.Error()})
		return
	}

	// Convert to ingredient using the Food Details conversion method
	ingredient := h.usdaService.ConvertUSDAFoodDetailsToIngredient(usdaFood)

	// Validate required fields
	if ingredient.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ingredient: name is required"})
		return
	}

	// Save to database
	if err := h.db.Create(ingredient).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save ingredient to database: " + err.Error()})
		return
	}

	// Return the created ingredient (reload from DB to ensure proper serialization)
	var savedIngredient models.Ingredient
	if err := h.db.First(&savedIngredient, "id = ?", ingredient.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve saved ingredient: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, savedIngredient)
}



// Recipe Handlers
func (h *Handlers) GetRecipes(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	cuisineID := c.Query("cuisine_id")
	search := c.Query("search")
	maxTime, _ := strconv.Atoi(c.Query("max_time"))
	maxCalories, _ := strconv.Atoi(c.Query("max_calories"))

	offset := (page - 1) * limit

	query := h.db.Model(&models.Recipe{}).
		Preload("Cuisine").
		Preload("Ingredients.Ingredient").
		Preload("Tags")

	if cuisineID != "" {
		query = query.Where("cuisine_id = ?", cuisineID)
	}

	if search != "" {
		query = query.Where("title ILIKE ? OR description ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if maxTime > 0 {
		query = query.Where("total_time_minutes <= ?", maxTime)
	}

	if maxCalories > 0 {
		query = query.Where("total_calories <= ?", maxCalories)
	}

	var recipes []models.Recipe
	var total int64

	query.Count(&total)
	if err := query.Offset(offset).Limit(limit).Find(&recipes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"recipes": recipes,
		"total":   total,
		"page":    page,
		"limit":   limit,
	})
}

func (h *Handlers) CreateRecipe(c *gin.Context) {
	var req struct {
		Title            string `json:"title" binding:"required"`
		Description      string `json:"description"`
		CuisineID        *uuid.UUID `json:"cuisine_id"`
		Instructions     []string `json:"instructions" binding:"required"`
		PrepTimeMinutes  *int `json:"prep_time_minutes"`
		CookTimeMinutes  *int `json:"cook_time_minutes"`
		Servings         int `json:"servings" binding:"required"`
		DifficultyLevel  string `json:"difficulty" binding:"required"`
		Ingredients      []struct {
			IngredientID string `json:"ingredient_id" binding:"required"`
			Quantity     float64 `json:"quantity" binding:"required"`
			Unit         string `json:"unit" binding:"required"`
			Notes        string `json:"notes"`
		} `json:"ingredients" binding:"required"`
		Tags             []string `json:"tags"`
	} 

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Begin transaction
	tx := h.db.Begin()

	// Create recipe
	recipe := models.Recipe{
		Title:           req.Title,
		Description:     req.Description,
		CuisineID:       req.CuisineID,
		Instructions:    strings.Join(req.Instructions, "\n"), // Join instructions array into a single string
		PrepTimeMinutes: req.PrepTimeMinutes,
		CookTimeMinutes: req.CookTimeMinutes,
		Servings:        req.Servings,
		DifficultyLevel: req.DifficultyLevel,
	}

	if err := tx.Create(&recipe).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create RecipeIngredients
	for _, ing := range req.Ingredients {
		ingredientID, err := uuid.Parse(ing.IngredientID)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ingredient ID"})
			return
		}
		recipeIngredient := models.RecipeIngredient{
			RecipeID:     recipe.ID,
			IngredientID: ingredientID,
			Quantity:     ing.Quantity,
			Unit:         ing.Unit,
			Notes:        ing.Notes,
		}
		if err := tx.Create(&recipeIngredient).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	// Create RecipeTags associations
	for _, tagID := range req.Tags {
		parsedTagID, err := uuid.Parse(tagID)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tag ID"})
			return
		}
		// Check if tag exists
		var tag models.RecipeTag
		if err := tx.First(&tag, "id = ?", parsedTagID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Tag with ID %s not found", tagID)})
			return
		}
		// Create association
		recipeTagAssociation := models.RecipeTagAssociation{
			RecipeID: recipe.ID,
			TagID:    parsedTagID,
		}
		if err := tx.Create(&recipeTagAssociation).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	// Calculate nutrition if ingredients are provided
	if len(req.Ingredients) > 0 {
		// Reload recipe with ingredients to get the data for nutrition calculation
		var recipeWithIngredients models.Recipe
		if err := tx.Preload("Ingredients.Ingredient").First(&recipeWithIngredients, "id = ?", recipe.ID).Error; err == nil {
			// Calculate nutrition using the nutrition service
			var ingredients []models.Ingredient
			for _, recipeIng := range recipeWithIngredients.Ingredients {
				if recipeIng.Ingredient != nil {
					ingredients = append(ingredients, *recipeIng.Ingredient)
				}
			}
			
			if nutrition, err := h.nutritionService.CalculateRecipeNutrition(recipeWithIngredients.Ingredients, ingredients, recipeWithIngredients.Servings); err == nil {
				// Update recipe with calculated nutrition
				h.nutritionService.UpdateRecipeNutrition(&recipe, nutrition)
				
				// Save nutrition data back to the database within the transaction
				if err := tx.Save(&recipe).Error; err != nil {
					fmt.Printf("Error saving nutrition data for recipe %s: %v\n", recipe.ID.String(), err)
				}
			} else {
				fmt.Printf("Error calculating nutrition for recipe %s: %v\n", recipe.ID.String(), err)
			}
		}
	}

	tx.Commit()

	// Reload with associations
	h.db.Preload("Cuisine").Preload("Ingredients.Ingredient").Preload("Tags").First(&recipe, recipe.ID)

	c.JSON(http.StatusCreated, recipe)
}

func (h *Handlers) GetRecipe(c *gin.Context) {
	id := c.Param("id")
	var recipe models.Recipe
	if err := h.db.Preload("Cuisine").Preload("Ingredients.Ingredient").Preload("Tags").First(&recipe, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Recipe not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, recipe)
}

func (h *Handlers) UpdateRecipe(c *gin.Context) {
	id := c.Param("id")
	var recipe models.Recipe
	if err := h.db.First(&recipe, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Recipe not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := c.ShouldBindJSON(&recipe); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Save(&recipe).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, recipe)
}

func (h *Handlers) DeleteRecipe(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Delete(&models.Recipe{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Recipe deleted successfully"})
}

func (h *Handlers) CalculateRecipeNutrition(c *gin.Context) {
	id := c.Param("id")
	
	// Get recipe with ingredients
	var recipe models.Recipe
	if err := h.db.Preload("Ingredients.Ingredient").First(&recipe, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Recipe not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get all ingredients for lookup
	var ingredients []models.Ingredient
	for _, recipeIng := range recipe.Ingredients {
		ingredients = append(ingredients, *recipeIng.Ingredient)
	}

	// Calculate nutrition using the new service
	nutrition, err := h.nutritionService.CalculateRecipeNutrition(recipe.Ingredients, ingredients, recipe.Servings)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to calculate nutrition: %v", err)})
		return
	}

	// Update recipe with calculated nutrition
	h.nutritionService.UpdateRecipeNutrition(&recipe, nutrition)
	
	// Save updated recipe
	if err := h.db.Save(&recipe).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to save nutrition data: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Recipe nutrition calculated successfully",
		"nutrition": nutrition,
	})
}

// GenerateRecipe handles AI-powered recipe generation from natural language input
func (h *Handlers) GenerateRecipe(c *gin.Context) {
	var request services.RecipeGenerationRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate recipe using LLM
	generatedRecipe, err := h.llmService.GenerateRecipe(request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to generate recipe: %v", err)})
		return
	}

	// Convert generated recipe to database format for preview
	previewRecipe := h.convertGeneratedRecipeToModel(generatedRecipe)
	
	// Return the generated recipe for preview/editing
	response := gin.H{
		"success":             true,
		"recipe":              generatedRecipe,
		"processing_time_ms":  0,
		"generated_recipe":    generatedRecipe,
		"preview_recipe":      previewRecipe,
		"message":            "Recipe generated successfully. Review and save if desired.",
	}
	
	c.JSON(http.StatusOK, response)
}

// convertGeneratedRecipeToModel converts LLM output to database model format
func (h *Handlers) convertGeneratedRecipeToModel(generated *services.RecipeGenerationResponse) models.Recipe {
	// Join instructions into a single string
	instructions := strings.Join(generated.Instructions, "\n")
	
	// Convert difficulty level
	difficulty := strings.ToLower(generated.DifficultyLevel)
	
	recipe := models.Recipe{
		Title:            generated.Title,
		Description:      generated.Description,
		Instructions:     instructions,
		PrepTimeMinutes:  &generated.PrepTime,
		CookTimeMinutes:  &generated.CookTime,
		Servings:         generated.Servings,
		DifficultyLevel:  difficulty,
		TotalCalories:    generated.Nutrition.TotalCalories,
		TotalProtein:     generated.Nutrition.TotalProtein,
		TotalFat:         generated.Nutrition.TotalFat,
		TotalCarbs:       generated.Nutrition.TotalCarbs,
		TotalFiber:       generated.Nutrition.TotalFiber,
		TotalSodium:      generated.Nutrition.TotalSodium,
	}
	
	// Convert ingredients
	for _, genIngredient := range generated.Ingredients {
		recipeIngredient := models.RecipeIngredient{
			Quantity: genIngredient.Quantity,
			Unit:     genIngredient.Unit,
			Notes:    genIngredient.Notes,
		}
		
		// If we have USDA data, try to find or create the ingredient
		if genIngredient.FDCID != nil {
			ingredient, err := h.findOrCreateIngredient(genIngredient.Name, *genIngredient.FDCID)
			if err == nil {
				recipeIngredient.IngredientID = ingredient.ID
				recipeIngredient.Ingredient = ingredient
			}
		}
		
		recipe.Ingredients = append(recipe.Ingredients, recipeIngredient)
	}
	
	return recipe
}

// findOrCreateIngredient finds an existing ingredient or creates a new one from USDA data
func (h *Handlers) findOrCreateIngredient(name string, fdcID int) (*models.Ingredient, error) {
	// First check if ingredient already exists
	var existing models.Ingredient
	if err := h.db.Where("fdc_id = ?", fdcID).First(&existing).Error; err == nil {
		return &existing, nil
	}
	
	// If not found, get details from USDA and create new ingredient
	foodDetails, err := h.usdaService.GetFoodDetails(fdcID)
	if err != nil {
		return nil, err
	}
	
	// Convert USDA response to ingredient
	details := h.usdaService.ConvertUSDAFoodDetailsToIngredient(foodDetails)
	
	ingredient := models.Ingredient{
		Name:            name,
		FDCID:           &fdcID,
		Description:     details.Description,
		CaloriesPer100g: details.CaloriesPer100g,
		ProteinPer100g:  details.ProteinPer100g,
		FatPer100g:      details.FatPer100g,
		CarbsPer100g:    details.CarbsPer100g,
		FiberPer100g:    details.FiberPer100g,
		SodiumPer100g:   details.SodiumPer100g,
		UnitType:        "gram",
	}
	
	// Set category based on ingredient name (simple heuristic)
	ingredient.Category = h.categorizeIngredient(name)
	
	if err := h.db.Create(&ingredient).Error; err != nil {
		return nil, err
	}
	
	return &ingredient, nil
}

// categorizeIngredient provides basic categorization for ingredients
func (h *Handlers) categorizeIngredient(name string) string {
	name = strings.ToLower(name)
	
	if strings.Contains(name, "meat") || strings.Contains(name, "chicken") || strings.Contains(name, "beef") || 
	   strings.Contains(name, "pork") || strings.Contains(name, "fish") || strings.Contains(name, "egg") ||
	   strings.Contains(name, "chickpea") || strings.Contains(name, "lentil") || strings.Contains(name, "bean") {
		return "Protein"
	}
	
	if strings.Contains(name, "rice") || strings.Contains(name, "bread") || strings.Contains(name, "pasta") ||
	   strings.Contains(name, "flour") || strings.Contains(name, "oat") || strings.Contains(name, "quinoa") {
		return "Grain"
	}
	
	if strings.Contains(name, "milk") || strings.Contains(name, "cheese") || strings.Contains(name, "yogurt") ||
	   strings.Contains(name, "butter") || strings.Contains(name, "cream") {
		return "Dairy"
	}
	
	if strings.Contains(name, "tomato") || strings.Contains(name, "onion") || strings.Contains(name, "pepper") ||
	   strings.Contains(name, "carrot") || strings.Contains(name, "spinach") || strings.Contains(name, "lettuce") {
		return "Vegetable"
	}
	
	if strings.Contains(name, "apple") || strings.Contains(name, "banana") || strings.Contains(name, "orange") ||
	   strings.Contains(name, "berry") || strings.Contains(name, "grape") {
		return "Fruit"
	}
	
	if strings.Contains(name, "oil") || strings.Contains(name, "avocado") || strings.Contains(name, "nut") ||
	   strings.Contains(name, "seed") {
		return "Fat"
	}
	
	if strings.Contains(name, "salt") || strings.Contains(name, "pepper") || strings.Contains(name, "spice") ||
	   strings.Contains(name, "herb") || strings.Contains(name, "curry") || strings.Contains(name, "garlic") ||
	   strings.Contains(name, "ginger") || strings.Contains(name, "turmeric") {
		return "Seasoning"
	}
	
	return "Other"
}

// Recipe Tag Handlers
func (h *Handlers) GetRecipeTags(c *gin.Context) {
	var tags []models.RecipeTag
	if err := h.db.Find(&tags).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tags)
}

func (h *Handlers) CreateRecipeTag(c *gin.Context) {
	var tag models.RecipeTag
	if err := c.ShouldBindJSON(&tag); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Create(&tag).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, tag)
}

func (h *Handlers) UpdateRecipeTag(c *gin.Context) {
	id := c.Param("id")
	var tag models.RecipeTag
	if err := h.db.First(&tag, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := c.ShouldBindJSON(&tag); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Save(&tag).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tag)
}

func (h *Handlers) DeleteRecipeTag(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Delete(&models.RecipeTag{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Tag deleted successfully"})
}

// Meal Plan Handlers
func (h *Handlers) GetMealPlans(c *gin.Context) {
	var mealPlans []models.MealPlan
	if err := h.db.Preload("Entries.Recipe").Find(&mealPlans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, mealPlans)
}

func (h *Handlers) CreateMealPlan(c *gin.Context) {
	var mealPlan models.MealPlan
	if err := c.ShouldBindJSON(&mealPlan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Create(&mealPlan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, mealPlan)
}

func (h *Handlers) GetMealPlan(c *gin.Context) {
	id := c.Param("id")
	var mealPlan models.MealPlan
	if err := h.db.Preload("Entries.Recipe.Cuisine").Preload("Entries.Recipe.Ingredients.Ingredient").First(&mealPlan, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Meal plan not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, mealPlan)
}

func (h *Handlers) UpdateMealPlan(c *gin.Context) {
	id := c.Param("id")
	var mealPlan models.MealPlan
	if err := h.db.First(&mealPlan, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Meal plan not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := c.ShouldBindJSON(&mealPlan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Save(&mealPlan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, mealPlan)
}

func (h *Handlers) DeleteMealPlan(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Delete(&models.MealPlan{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Meal plan deleted successfully"})
}

func (h *Handlers) GenerateMealPlan(c *gin.Context) {
	var request models.MealPlanGenerationRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	mealPlan, err := h.mealPlanService.GenerateMealPlan(&request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, mealPlan)
}

// GenerateAIMealPlan generates an optimized meal plan from natural language input
func (h *Handlers) GenerateAIMealPlan(c *gin.Context) {
	var request struct {
		Query string `json:"query" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query is required"})
		return
	}

	// Validate query length
	if len(strings.TrimSpace(request.Query)) < 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query must be at least 10 characters long"})
		return
	}

	// Generate optimized meal plan
	optimizedPlan, err := h.aiMealPlanService.GenerateAIMealPlan(request.Query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to generate AI meal plan: %v", err),
			"query": request.Query,
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "AI meal plan generated successfully",
		"data": optimizedPlan,
		"query": request.Query,
	})
}

// Shopping List Handlers
func (h *Handlers) GetShoppingLists(c *gin.Context) {
	var shoppingLists []models.ShoppingList
	if err := h.db.Preload("Items.Ingredient").Find(&shoppingLists).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, shoppingLists)
}

func (h *Handlers) CreateShoppingList(c *gin.Context) {
	var shoppingList models.ShoppingList
	if err := c.ShouldBindJSON(&shoppingList); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Create(&shoppingList).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, shoppingList)
}

func (h *Handlers) GetShoppingList(c *gin.Context) {
	id := c.Param("id")
	var shoppingList models.ShoppingList
	if err := h.db.Preload("Items.Ingredient").First(&shoppingList, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Shopping list not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, shoppingList)
}

func (h *Handlers) UpdateShoppingList(c *gin.Context) {
	id := c.Param("id")
	var shoppingList models.ShoppingList
	if err := h.db.First(&shoppingList, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Shopping list not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := c.ShouldBindJSON(&shoppingList); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Save(&shoppingList).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, shoppingList)
}

func (h *Handlers) DeleteShoppingList(c *gin.Context) {
	id := c.Param("id")
	if err := h.db.Delete(&models.ShoppingList{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Shopping list deleted successfully"})
}

// Web Scraping Handler
func (h *Handlers) ScrapeRecipe(c *gin.Context) {
	var request struct {
		URL string `json:"url" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	scrapedRecipe, err := h.scraperService.ScrapeRecipe(request.URL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Convert scraped recipe to our recipe model
	recipe := &models.Recipe{
		Title:           scrapedRecipe.Title,
		Description:     scrapedRecipe.Description,
		Instructions:    scrapedRecipe.Instructions,
		PrepTimeMinutes: scrapedRecipe.PrepTime,
		CookTimeMinutes: scrapedRecipe.CookTime,
		Servings:        scrapedRecipe.Servings,
		SourceURL:       scrapedRecipe.SourceURL,
		ScrapedAt:       &[]time.Time{time.Now()}[0],
	}

	c.JSON(http.StatusOK, gin.H{
		"scraped_recipe": scrapedRecipe,
		"suggested_recipe": recipe,
	})
}

// User Preferences Handlers
func (h *Handlers) GetUserPreferences(c *gin.Context) {
	var preferences []models.UserPreferences
	if err := h.db.Find(&preferences).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, preferences)
}

func (h *Handlers) CreateUserPreferences(c *gin.Context) {
	var preferences models.UserPreferences
	if err := c.ShouldBindJSON(&preferences); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Create(&preferences).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, preferences)
}

func (h *Handlers) UpdateUserPreferences(c *gin.Context) {
	id := c.Param("id")
	var preferences models.UserPreferences
	if err := h.db.First(&preferences, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "User preferences not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := c.ShouldBindJSON(&preferences); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.Save(&preferences).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, preferences)
}

// GetIngredientsByCalorieRanges returns ingredients grouped by calorie ranges
func (h *Handlers) GetIngredientsByCalorieRanges(c *gin.Context) {
	var lowCalorie, mediumCalorie, highCalorie []models.Ingredient

	// Low calorie: 0-100 calories per 100g
	if err := h.db.Where("calories_per_100g IS NOT NULL AND calories_per_100g < ?", 100).
		Order("calories_per_100g ASC").Limit(20).Find(&lowCalorie).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Medium calorie: 100-300 calories per 100g
	if err := h.db.Where("calories_per_100g >= ? AND calories_per_100g < ?", 100, 300).
		Order("calories_per_100g ASC").Limit(20).Find(&mediumCalorie).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// High calorie: 300+ calories per 100g
	if err := h.db.Where("calories_per_100g >= ?", 300).
		Order("calories_per_100g ASC").Limit(20).Find(&highCalorie).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"low":    lowCalorie,
		"medium": mediumCalorie,
		"high":   highCalorie,
	})
}

// GetIngredientNutritionSummary returns nutrition statistics for ingredients
func (h *Handlers) GetIngredientNutritionSummary(c *gin.Context) {
	var stats struct {
		TotalIngredients        int64   `json:"total_ingredients"`
		IngredientsWithCalories int64   `json:"ingredients_with_calories"`
		AvgCalories            float64 `json:"avg_calories"`
		MinCalories            float64 `json:"min_calories"`
		MaxCalories            float64 `json:"max_calories"`
	}

	// Get total ingredients count
	h.db.Model(&models.Ingredient{}).Count(&stats.TotalIngredients)

	// Get ingredients with calorie data count
	h.db.Model(&models.Ingredient{}).Where("calories_per_100g IS NOT NULL").Count(&stats.IngredientsWithCalories)

	// Get calorie statistics
	var result struct {
		Avg float64
		Min float64
		Max float64
	}

	if err := h.db.Model(&models.Ingredient{}).
		Select("AVG(calories_per_100g) as avg, MIN(calories_per_100g) as min, MAX(calories_per_100g) as max").
		Where("calories_per_100g IS NOT NULL").
		Scan(&result).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	stats.AvgCalories = result.Avg
	stats.MinCalories = result.Min
	stats.MaxCalories = result.Max

	c.JSON(http.StatusOK, stats)
}

// Shopping Cart Handlers

// GetShoppingCart gets the user's active shopping cart
func (h *Handlers) GetShoppingCart(c *gin.Context) {
	userID := c.GetHeader("X-User-ID") // In a real app, get from JWT token
	if userID == "" {
		userID = "default-user" // For demo purposes
	}

	var cart models.ShoppingCart
	err := h.db.Preload("Items.Ingredient").
		Where("user_id = ? AND status = ?", userID, "active").
		First(&cart).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create a new cart if none exists
			cart = models.ShoppingCart{
				UserID: userID,
				Name:   "My Cart",
				Status: "active",
			}
			if err := h.db.Create(&cart).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	// Calculate total cost
	var totalCost float64
	for _, item := range cart.Items {
		if item.EstimatedCost != nil {
			totalCost += *item.EstimatedCost * item.Quantity
		}
	}
	cart.TotalEstimatedCost = &totalCost

	c.JSON(http.StatusOK, cart)
}

// AddToCart adds an ingredient to the shopping cart
func (h *Handlers) AddToCart(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		userID = "default-user"
	}

	var request struct {
		IngredientID string  `json:"ingredient_id" binding:"required"`
		Quantity     float64 `json:"quantity" binding:"required"`
		Unit         string  `json:"unit" binding:"required"`
		Notes        string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get or create cart
	var cart models.ShoppingCart
	err := h.db.Where("user_id = ? AND status = ?", userID, "active").First(&cart).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			cart = models.ShoppingCart{
				UserID: userID,
				Name:   "My Cart",
				Status: "active",
			}
			if err := h.db.Create(&cart).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	// Get ingredient details for cost estimation
	var ingredient models.Ingredient
	if err := h.db.First(&ingredient, "id = ?", request.IngredientID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ingredient not found"})
		return
	}

	// Calculate estimated cost
	var estimatedCost *float64
	if ingredient.AvgCostPerUnit != nil {
		cost := *ingredient.AvgCostPerUnit * request.Quantity
		estimatedCost = &cost
	}

	// Check if item already exists in cart
	var existingItem models.ShoppingCartItem
	err = h.db.Where("shopping_cart_id = ? AND ingredient_id = ?", cart.ID, request.IngredientID).First(&existingItem).Error
	
	if err == nil {
		// Update existing item
		existingItem.Quantity += request.Quantity
		if estimatedCost != nil {
			existingItem.EstimatedCost = estimatedCost
		}
		if request.Notes != "" {
			existingItem.Notes = request.Notes
		}
		if err := h.db.Save(&existingItem).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, existingItem)
	} else if err == gorm.ErrRecordNotFound {
		// Create new item
		cartItem := models.ShoppingCartItem{
			ShoppingCartID: cart.ID,
			IngredientID:   uuid.MustParse(request.IngredientID),
			Quantity:       request.Quantity,
			Unit:           request.Unit,
			EstimatedCost:  estimatedCost,
			Notes:          request.Notes,
		}

		if err := h.db.Create(&cartItem).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Load ingredient details for response
		h.db.Preload("Ingredient").First(&cartItem, cartItem.ID)
		c.JSON(http.StatusCreated, cartItem)
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
}

// UpdateCartItem updates a cart item quantity
func (h *Handlers) UpdateCartItem(c *gin.Context) {
	id := c.Param("id")
	
	var request struct {
		Quantity float64 `json:"quantity" binding:"required"`
		Notes    string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var cartItem models.ShoppingCartItem
	if err := h.db.First(&cartItem, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cart item not found"})
		return
	}

	cartItem.Quantity = request.Quantity
	cartItem.Notes = request.Notes

	// Recalculate cost if ingredient has pricing
	var ingredient models.Ingredient
	if err := h.db.First(&ingredient, "id = ?", cartItem.IngredientID).Error; err == nil {
		if ingredient.AvgCostPerUnit != nil {
			cost := *ingredient.AvgCostPerUnit * request.Quantity
			cartItem.EstimatedCost = &cost
		}
	}

	if err := h.db.Save(&cartItem).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.db.Preload("Ingredient").First(&cartItem, cartItem.ID)
	c.JSON(http.StatusOK, cartItem)
}

// RemoveFromCart removes an item from the cart
func (h *Handlers) RemoveFromCart(c *gin.Context) {
	id := c.Param("id")
	
	if err := h.db.Delete(&models.ShoppingCartItem{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item removed from cart"})
}

// ClearCart removes all items from the cart
func (h *Handlers) ClearCart(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		userID = "default-user"
	}

	var cart models.ShoppingCart
	if err := h.db.Where("user_id = ? AND status = ?", userID, "active").First(&cart).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cart not found"})
		return
	}

	if err := h.db.Delete(&models.ShoppingCartItem{}, "shopping_cart_id = ?", cart.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Cart cleared"})
}

// GetAvailableStores returns available grocery stores for checkout
func (h *Handlers) GetAvailableStores(c *gin.Context) {
	stores := []gin.H{
		{
			"id":          "amazon_fresh",
			"name":        "Amazon Fresh",
			"description": "Same-day grocery delivery from Amazon",
			"logo":        "https://images-na.ssl-images-amazon.com/images/G/01/amazonfresh/logo.png",
			"available":   true,
		},
		{
			"id":          "walmart_grocery",
			"name":        "Walmart Grocery",
			"description": "Pickup and delivery from Walmart",
			"logo":        "https://corporate.walmart.com/content/dam/corporate/logos/walmart-spark.svg",
			"available":   true,
		},
		{
			"id":          "instacart",
			"name":        "Instacart",
			"description": "Delivery from multiple local stores",
			"logo":        "https://www.instacart.com/assets/beetstrap/brand/instacart-logo-color.svg",
			"available":   true,
		},
		{
			"id":          "kroger",
			"name":        "Kroger",
			"description": "Pickup and delivery from Kroger stores",
			"logo":        "https://www.kroger.com/content/v2/binary/image/kroger-logo.svg",
			"available":   true,
		},
	}

	c.JSON(http.StatusOK, gin.H{"stores": stores})
}

// CheckoutWithStore initiates checkout with an external grocery store
func (h *Handlers) CheckoutWithStore(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		userID = "default-user"
	}
	
	store := c.Param("store")

	// Get user's cart
	var cart models.ShoppingCart
	if err := h.db.Preload("Items.Ingredient").Where("user_id = ? AND status = ?", userID, "active").First(&cart).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cart not found"})
		return
	}

	if len(cart.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cart is empty"})
		return
	}

	// Create external cart session
	session := models.ExternalCartSession{
		ShoppingCartID: cart.ID,
		GroceryStore:   store,
		Status:         "pending",
	}

	// Generate checkout URL based on store
	var checkoutURL string
	var totalCost float64

	for _, item := range cart.Items {
		if item.EstimatedCost != nil {
			totalCost += *item.EstimatedCost * item.Quantity
		}
	}

	switch store {
	case "amazon_fresh":
		checkoutURL = h.generateAmazonFreshURL(cart.Items)
	case "walmart_grocery":
		checkoutURL = h.generateWalmartURL(cart.Items)
	case "instacart":
		checkoutURL = h.generateInstacartURL(cart.Items)
	case "kroger":
		checkoutURL = h.generateKrogerURL(cart.Items)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported store"})
		return
	}

	session.CheckoutURL = checkoutURL
	session.TotalCost = &totalCost
	expiresAt := time.Now().Add(24 * time.Hour)
	session.ExpiresAt = &expiresAt

	if err := h.db.Create(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Keep cart active to allow multiple checkouts with different stores
	// The ExternalCartSession table tracks each checkout attempt

	// Prepare shopping list for frontend guidance
	var shoppingList []gin.H
	for _, item := range cart.Items {
		listItem := gin.H{
			"name":     item.Ingredient.Name,
			"quantity": item.Quantity,
			"unit":     item.Unit,
		}
		if item.Notes != "" {
			listItem["notes"] = item.Notes
		}
		if item.EstimatedCost != nil {
			listItem["estimated_cost"] = *item.EstimatedCost
		}
		shoppingList = append(shoppingList, listItem)
	}

	// Store-specific instructions
	var instructions string
	
	switch store {
	case "amazon_fresh":
		if len(cart.Items) == 1 {
			instructions = "You will be redirected to Amazon Fresh with an optimized search for your item. Add it to your cart and checkout."
		} else {
			instructions = "You will be redirected to Amazon Fresh grocery section. Search for each item from your list and add them to your cart."
		}
	case "walmart_grocery":
		if len(cart.Items) == 1 {
			instructions = "You will be redirected to Walmart with an optimized search for your item. Add it to your cart and checkout."
		} else {
			instructions = "You will be redirected to Walmart's grocery section. Search for each item from your list and add them to your cart."
		}
	case "instacart":
		instructions = "You will be redirected to Instacart. First select your preferred local store, then search for each item and add them to your cart."
	case "kroger":
		if len(cart.Items) == 1 {
			instructions = "You will be redirected to Kroger with an optimized search for your item. Add it to your cart and choose pickup or delivery."
		} else {
			instructions = "You will be redirected to Kroger's grocery section. Search for each item from your list and add them to your cart."
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"checkout_url":   checkoutURL,
		"session_id":     session.ID,
		"store":          store,
		"store_name":     h.getStoreName(store),
		"total_cost":     totalCost,
		"expires_at":     expiresAt,
		"shopping_list":  shoppingList,
		"instructions":   instructions,
		"item_count":     len(cart.Items),
		"auto_redirect":  true, // Signal frontend to auto-redirect
	})
}

// getStoreName returns the display name for a store
func (h *Handlers) getStoreName(storeID string) string {
	storeNames := map[string]string{
		"amazon_fresh":    "Amazon Fresh",
		"walmart_grocery": "Walmart Grocery",
		"instacart":       "Instacart",
		"kroger":          "Kroger",
	}
	
	if name, exists := storeNames[storeID]; exists {
		return name
	}
	return storeID
}

// Helper functions to generate store-specific URLs
func (h *Handlers) generateAmazonFreshURL(items []models.ShoppingCartItem) string {
	// Enhanced Amazon Fresh URL generation with multiple strategies:
	// 1. For single items: Direct product search with optimized terms
	// 2. For multiple items: Create a shopping list link
	// 3. Use Amazon Fresh specific parameters for better targeting
	
	if len(items) == 0 {
		return "https://www.amazon.com/amazonFresh/landing?ref=nav_cs_fresh"
	}
	
	// Amazon Fresh specific base URLs
	baseURL := "https://www.amazon.com/s"
	
	// Create optimized search parameters
	params := url.Values{}
	params.Add("i", "amazonfresh")  // Target Amazon Fresh specifically
	params.Add("ref", "sr_nr_i_0") // Reference parameter
	
	if len(items) == 1 {
		// Single item: Create highly targeted search
		item := items[0]
		if item.Ingredient != nil {
			searchTerm := h.optimizeSearchTerm(item.Ingredient.Name)
			params.Add("k", searchTerm)
			params.Add("rh", "n:16310101") // Fresh category node
		}
	} else {
		// Multiple items: Direct to Amazon Fresh grocery section
		// Combining multiple items in one search doesn't work well
		// Better to start from the grocery homepage
		return "https://www.amazon.com/alm/storefront?almBrandId=VUZHIFdob2xlIEZvb2Rz&node=16310101"
	}
	
	return fmt.Sprintf("%s?%s", baseURL, params.Encode())
}

// optimizeSearchTerm enhances ingredient names for better search results
func (h *Handlers) optimizeSearchTerm(ingredientName string) string {
	// Map common ingredient names to better search terms
	searchMappings := map[string]string{
		"chicken breast": "chicken breast fresh",
		"ground beef":    "ground beef fresh 80/20",
		"salmon":         "fresh salmon fillet",
		"eggs":           "large eggs dozen",
		"milk":           "whole milk gallon",
		"bread":          "white bread loaf",
		"rice":           "white rice long grain",
		"pasta":          "pasta spaghetti",
		"tomatoes":       "fresh tomatoes",
		"onions":         "yellow onions",
		"potatoes":       "russet potatoes",
		"carrots":        "fresh carrots",
		"cheese":         "cheddar cheese block",
	}
	
	lowerName := strings.ToLower(ingredientName)
	if optimized, exists := searchMappings[lowerName]; exists {
		return optimized
	}
	
	// Add "fresh" prefix for produce items
	produceItems := []string{"tomato", "lettuce", "spinach", "broccoli", "cucumber", 
		"bell pepper", "carrot", "onion", "garlic", "potato", "apple", "banana", 
		"orange", "lemon", "lime", "avocado", "mushroom"}
	
	for _, produce := range produceItems {
		if strings.Contains(lowerName, produce) {
			return "fresh " + ingredientName
		}
	}
	
	return ingredientName
}

func (h *Handlers) generateWalmartURL(items []models.ShoppingCartItem) string {
	if len(items) == 0 {
		return "https://www.walmart.com/grocery"
	}
	
	// Walmart Grocery has better search when items are more specific
	baseURL := "https://www.walmart.com/search"
	params := url.Values{}
	
	if len(items) == 1 {
		item := items[0]
		if item.Ingredient != nil {
			searchTerm := h.optimizeSearchTerm(item.Ingredient.Name)
			params.Add("query", searchTerm)
			params.Add("cat_id", "976759") // Grocery category
		}
	} else {
		// Multiple items: Direct to Walmart Grocery homepage
		// Better user experience than combining searches
		return "https://www.walmart.com/cp/food/976759"
	}
	
	return fmt.Sprintf("%s?%s", baseURL, params.Encode())
}

func (h *Handlers) generateInstacartURL(items []models.ShoppingCartItem) string {
	// Instacart requires store selection, but we can provide a better landing experience
	if len(items) == 0 {
		return "https://www.instacart.com"
	}
	
	// Try to create a search URL that will work across stores
	baseURL := "https://www.instacart.com/store/search"
	params := url.Values{}
	
	if len(items) == 1 {
		item := items[0]
		if item.Ingredient != nil {
			searchTerm := h.optimizeSearchTerm(item.Ingredient.Name)
			params.Add("q", searchTerm)
		}
	} else {
		// Multiple items: Direct to Instacart store selection
		// Let users choose their preferred store first
		return "https://www.instacart.com"
	}
	
	return fmt.Sprintf("%s?%s", baseURL, params.Encode())
}

func (h *Handlers) generateKrogerURL(items []models.ShoppingCartItem) string {
	if len(items) == 0 {
		return "https://www.kroger.com"
	}
	
	baseURL := "https://www.kroger.com/search"
	params := url.Values{}
	
	if len(items) == 1 {
		item := items[0]
		if item.Ingredient != nil {
			searchTerm := h.optimizeSearchTerm(item.Ingredient.Name)
			params.Add("query", searchTerm)
			params.Add("fulfillment", "all") // Include pickup and delivery
		}
	} else {
		// Multiple items: Direct to Kroger grocery homepage
		// Better experience than combined search
		return "https://www.kroger.com/shopping/groceries"
	}
	
	return fmt.Sprintf("%s?%s", baseURL, params.Encode())
}

// StoreProduct represents a product from a grocery store
type StoreProduct struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Brand       string  `json:"brand"`
	Size        string  `json:"size"`
	Price       float64 `json:"price"`
	Unit        string  `json:"unit"`
	ImageURL    string  `json:"image_url"`
	InStock     bool    `json:"in_stock"`
	Rating      float64 `json:"rating,omitempty"`
	ReviewCount int     `json:"review_count,omitempty"`
	Description string  `json:"description,omitempty"`
}

// CartItemProducts represents search results for a cart item
type CartItemProducts struct {
	CartItemID   string         `json:"cart_item_id"`
	IngredientName string       `json:"ingredient_name"`
	RequestedQty   float64      `json:"requested_qty"`
	RequestedUnit  string       `json:"requested_unit"`
	Products       []StoreProduct `json:"products"`
	SearchQuery    string       `json:"search_query"`
}

// GetStoreProductsForCart returns product search results for each item in the cart
func (h *Handlers) GetStoreProductsForCart(c *gin.Context) {
	store := c.Param("store")
	
	// Get the user's active cart
	userID := "default-user" // In a real app, this would come from authentication
	var cart models.ShoppingCart
	err := h.db.Preload("Items.Ingredient").Where("user_id = ? AND status = ?", userID, "active").First(&cart).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "No active cart found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Generate product search results for each cart item
	var results []CartItemProducts
	
	for _, item := range cart.Items {
		if item.Ingredient == nil {
			continue
		}

		// Generate search query for this ingredient
		searchQuery := h.optimizeSearchTerm(item.Ingredient.Name)
		
		// Mock product search results (in production, this would call actual store APIs)
		products := h.mockStoreProductSearch(store, searchQuery, item.Ingredient.Name)
		
		results = append(results, CartItemProducts{
			CartItemID:     item.ID.String(),
			IngredientName: item.Ingredient.Name,
			RequestedQty:   item.Quantity,
			RequestedUnit:  item.Unit,
			Products:       products,
			SearchQuery:    searchQuery,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"store":      store,
		"store_name": h.getStoreName(store),
		"cart_id":    cart.ID,
		"items":      results,
		"total_items": len(results),
	})
}

// mockStoreProductSearch generates realistic mock product data
// In production, this would make API calls to actual grocery store APIs
func (h *Handlers) mockStoreProductSearch(store, searchQuery, ingredientName string) []StoreProduct {
	// Generate realistic mock data based on the ingredient type
	products := []StoreProduct{}
	
	// Normalize ingredient name for matching
	lowerName := strings.ToLower(ingredientName)
	
	switch {
	case strings.Contains(lowerName, "egg"):
		products = []StoreProduct{
			{
				ID:          "amzn-eggs-001",
				Name:        "Happy Egg Co. Free Range Large Eggs",
				Brand:       "Happy Egg Co.",
				Size:        "12 count",
				Price:       4.99,
				Unit:        "dozen",
				ImageURL:    "https://m.media-amazon.com/images/I/71G+ZXZX9IL._SL1500_.jpg",
				InStock:     true,
				Rating:      4.5,
				ReviewCount: 1234,
				Description: "Free range large brown eggs",
			},
			{
				ID:          "amzn-eggs-002", 
				Name:        "Eggland's Best Large Eggs",
				Brand:       "Eggland's Best",
				Size:        "18 count",
				Price:       6.49,
				Unit:        "18 count",
				ImageURL:    "https://m.media-amazon.com/images/I/81WqJX+ZXZL._SL1500_.jpg",
				InStock:     true,
				Rating:      4.3,
				ReviewCount: 892,
				Description: "Farm fresh large white eggs",
			},
			{
				ID:          "amzn-eggs-003",
				Name:        "365 by Whole Foods Market Large Eggs",
				Brand:       "365 by Whole Foods",
				Size:        "12 count",
				Price:       3.99,
				Unit:        "dozen",
				ImageURL:    "https://m.media-amazon.com/images/I/71ABC123IL._SL1500_.jpg",
				InStock:     true,
				Rating:      4.2,
				ReviewCount: 567,
				Description: "Organic large brown eggs",
			},
		}
	case strings.Contains(lowerName, "chicken"):
		products = []StoreProduct{
			{
				ID:          "amzn-chicken-001",
				Name:        "Fresh Boneless Skinless Chicken Breast",
				Brand:       "Perdue",
				Size:        "1 lb",
				Price:       8.99,
				Unit:        "lb",
				ImageURL:    "https://m.media-amazon.com/images/I/71CHK123IL._SL1500_.jpg",
				InStock:     true,
				Rating:      4.4,
				ReviewCount: 432,
				Description: "Fresh, never frozen chicken breast",
			},
			{
				ID:          "amzn-chicken-002",
				Name:        "Bell & Evans Air Chilled Chicken Breast",
				Brand:       "Bell & Evans",
				Size:        "1.5 lb",
				Price:       12.99,
				Unit:        "lb",
				ImageURL:    "https://m.media-amazon.com/images/I/81CHK456IL._SL1500_.jpg",
				InStock:     true,
				Rating:      4.6,
				ReviewCount: 321,
				Description: "Air chilled, no antibiotics ever",
			},
		}
	case strings.Contains(lowerName, "beef"):
		products = []StoreProduct{
			{
				ID:          "amzn-beef-001",
				Name:        "Ground Beef 80/20",
				Brand:       "Fresh Brand",
				Size:        "1 lb",
				Price:       6.99,
				Unit:        "lb",
				ImageURL:    "https://m.media-amazon.com/images/I/71BEF123IL._SL1500_.jpg",
				InStock:     true,
				Rating:      4.2,
				ReviewCount: 654,
				Description: "Fresh ground beef, 80% lean",
			},
		}
	default:
		// Generic product for other ingredients
		products = []StoreProduct{
			{
				ID:          fmt.Sprintf("amzn-generic-%d", len(ingredientName)),
				Name:        fmt.Sprintf("Fresh %s", ingredientName),
				Brand:       "Fresh Brand",
				Size:        "1 unit",
				Price:       3.99,
				Unit:        "each",
				ImageURL:    "https://m.media-amazon.com/images/I/71GEN123IL._SL1500_.jpg",
				InStock:     true,
				Rating:      4.0,
				ReviewCount: 100,
				Description: fmt.Sprintf("Fresh %s", ingredientName),
			},
		}
	}

	// Adjust store-specific details
	switch store {
	case "walmart_grocery":
		for i := range products {
			products[i].ID = strings.Replace(products[i].ID, "amzn-", "wmt-", 1)
			products[i].Price = products[i].Price * 0.85 // Walmart typically cheaper
		}
	case "kroger":
		for i := range products {
			products[i].ID = strings.Replace(products[i].ID, "amzn-", "krog-", 1)
			products[i].Price = products[i].Price * 0.90
		}
	case "instacart":
		for i := range products {
			products[i].ID = strings.Replace(products[i].ID, "amzn-", "inst-", 1)
			products[i].Price = products[i].Price * 1.15 // Instacart markup
		}
	}

	return products
}

// CheckoutWithStorePane returns data for the in-app checkout experience
func (h *Handlers) CheckoutWithStorePane(c *gin.Context) {
	store := c.Param("store")

	// Get the user's active cart
	userID := "default-user" // In a real app, this would come from authentication
	var cart models.ShoppingCart
	err := h.db.Preload("Items.Ingredient").Where("user_id = ? AND status = ?", userID, "active").First(&cart).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "No active cart found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if len(cart.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cart is empty"})
		return
	}

	// Calculate estimated total cost based on cheapest options
	var totalCost float64
	itemCount := 0
	
	// Get product results for each cart item
	var results []CartItemProducts
	for _, item := range cart.Items {
		if item.Ingredient == nil {
			continue
		}

		searchQuery := h.optimizeSearchTerm(item.Ingredient.Name)
		products := h.mockStoreProductSearch(store, searchQuery, item.Ingredient.Name)
		
		// Calculate cost based on cheapest product
		if len(products) > 0 {
			cheapestPrice := products[0].Price
			for _, product := range products {
				if product.Price < cheapestPrice {
					cheapestPrice = product.Price
				}
			}
			totalCost += cheapestPrice * item.Quantity
		}
		
		results = append(results, CartItemProducts{
			CartItemID:     item.ID.String(),
			IngredientName: item.Ingredient.Name,
			RequestedQty:   item.Quantity,
			RequestedUnit:  item.Unit,
			Products:       products,
			SearchQuery:    searchQuery,
		})
		itemCount++
	}

	// Create checkout session for tracking
	expiresAt := time.Now().Add(24 * time.Hour)
	session := models.ExternalCartSession{
		ShoppingCartID: cart.ID,
		GroceryStore:   store,
		TotalCost:      &totalCost,
		ExpiresAt:      &expiresAt,
		Status:         "pending",
	}

	if err := h.db.Create(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Prepare shopping list for display
	var shoppingList []gin.H
	for _, item := range cart.Items {
		listItem := gin.H{
			"id":       item.ID,
			"name":     item.Ingredient.Name,
			"quantity": item.Quantity,
			"unit":     item.Unit,
		}
		if item.Notes != "" {
			listItem["notes"] = item.Notes
		}
		shoppingList = append(shoppingList, listItem)
	}

	c.JSON(http.StatusOK, gin.H{
		"session_id":     session.ID,
		"store":          store,
		"store_name":     h.getStoreName(store),
		"cart_id":        cart.ID,
		"items":          results,
		"shopping_list":  shoppingList,
		"estimated_total": totalCost,
		"item_count":     itemCount,
		"expires_at":     session.ExpiresAt,
		"checkout_type":  "in_app_pane",
		"instructions":   fmt.Sprintf("Browse products below and add items to your %s cart. Click 'Add to Cart' next to each product you want to purchase.", h.getStoreName(store)),
	})
}

// GetRecipeNutritionAnalysis provides detailed nutrition analysis for a recipe
func (h *Handlers) GetRecipeNutritionAnalysis(c *gin.Context) {
	id := c.Param("id")
	
	// Get recipe with ingredients
	var recipe models.Recipe
	if err := h.db.Preload("Ingredients.Ingredient").First(&recipe, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Recipe not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get all ingredients for lookup
	var ingredients []models.Ingredient
	for _, recipeIng := range recipe.Ingredients {
		ingredients = append(ingredients, *recipeIng.Ingredient)
	}

	// Calculate nutrition
	nutrition, err := h.nutritionService.CalculateRecipeNutrition(recipe.Ingredients, ingredients, recipe.Servings)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to calculate nutrition: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"recipe_id": id,
		"recipe_title": recipe.Title,
		"nutrition": nutrition,
	})
}

// CalculateIngredientNutrition calculates nutrition for a single ingredient
func (h *Handlers) CalculateIngredientNutrition(c *gin.Context) {
	var request struct {
		IngredientID string  `json:"ingredient_id" binding:"required"`
		Quantity     float64 `json:"quantity" binding:"required"`
		Unit         string  `json:"unit" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get ingredient
	var ingredient models.Ingredient
	if err := h.db.First(&ingredient, "id = ?", request.IngredientID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Ingredient not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Calculate nutrition
	nutrition, err := h.nutritionService.CalculateIngredientNutrition(ingredient, request.Quantity, request.Unit)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to calculate nutrition: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ingredient": ingredient.Name,
		"nutrition": nutrition,
	})
}

// GetSupportedUnits returns supported units for an ingredient
func (h *Handlers) GetSupportedUnits(c *gin.Context) {
	ingredientName := c.Param("ingredient")
	if ingredientName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ingredient name is required"})
		return
	}

	// Decode URL-encoded ingredient name
	decodedName, err := url.QueryUnescape(ingredientName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ingredient name"})
		return
	}

	units := h.unitConverter.GetSupportedUnits(decodedName)
	
	c.JSON(http.StatusOK, gin.H{
		"ingredient": decodedName,
		"supported_units": units,
	})
}

// ConvertUnits converts between different units for an ingredient
func (h *Handlers) ConvertUnits(c *gin.Context) {
	var request struct {
		IngredientName string  `json:"ingredient_name" binding:"required"`
		Quantity       float64 `json:"quantity" binding:"required"`
		FromUnit       string  `json:"from_unit" binding:"required"`
		ToUnit         string  `json:"to_unit" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert from original unit to grams
	grams, err := h.unitConverter.ConvertToGrams(request.IngredientName, request.Quantity, request.FromUnit)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to convert from %s: %v", request.FromUnit, err)})
		return
	}

	// If target unit is grams, return directly
	if strings.ToLower(strings.TrimSpace(request.ToUnit)) == "g" || 
	   strings.ToLower(strings.TrimSpace(request.ToUnit)) == "gram" || 
	   strings.ToLower(strings.TrimSpace(request.ToUnit)) == "grams" {
		c.JSON(http.StatusOK, gin.H{
			"ingredient": request.IngredientName,
			"original_quantity": request.Quantity,
			"original_unit": request.FromUnit,
			"converted_quantity": grams,
			"converted_unit": "grams",
		})
		return
	}

	// For other units, we'd need reverse conversion (not implemented yet)
	c.JSON(http.StatusBadRequest, gin.H{
		"error": "Conversion to non-gram units not yet supported. Convert to grams first.",
		"grams_equivalent": grams,
	})
}

// Scraped Recipe Recommendation Handlers

func (h *Handlers) GetPersonalizedRecommendations(c *gin.Context) {
	userID := c.DefaultQuery("user_id", "default")

	// Parse filters from query parameters
	filters := models.RecommendationFilters{
		Limit: 10, // Default limit
	}

	if maxPrepStr := c.Query("max_prep_time"); maxPrepStr != "" {
		if maxPrep, err := strconv.Atoi(maxPrepStr); err == nil {
			filters.MaxPrepTimeMinutes = maxPrep
		}
	}

	if maxCookStr := c.Query("max_cook_time"); maxCookStr != "" {
		if maxCook, err := strconv.Atoi(maxCookStr); err == nil {
			filters.MaxCookTimeMinutes = maxCook
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filters.Limit = limit
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			filters.Offset = offset
		}
	}

	// Parse dietary restrictions and allergies
	if restrictions := c.Query("dietary_restrictions"); restrictions != "" {
		filters.DietaryRestrictions = strings.Split(restrictions, ",")
	}

	if allergies := c.Query("allergies"); allergies != "" {
		filters.Allergies = strings.Split(allergies, ",")
	}

	if skillLevel := c.Query("cooking_skill_level"); skillLevel != "" {
		filters.CookingSkillLevel = skillLevel
	}

	recommendations, err := h.scrapedRecipeService.GetPersonalizedRecommendations(userID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"recommendations": recommendations,
		"total":           len(recommendations),
		"filters":         filters,
	})
}

func (h *Handlers) GetScrapedRecipes(c *gin.Context) {
	// Parse filters from query parameters
	filters := models.RecommendationFilters{
		Limit: 20, // Default limit
	}

	if maxPrepStr := c.Query("max_prep_time"); maxPrepStr != "" {
		if maxPrep, err := strconv.Atoi(maxPrepStr); err == nil {
			filters.MaxPrepTimeMinutes = maxPrep
		}
	}

	if maxCookStr := c.Query("max_cook_time"); maxCookStr != "" {
		if maxCook, err := strconv.Atoi(maxCookStr); err == nil {
			filters.MaxCookTimeMinutes = maxCook
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			filters.Limit = limit
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			filters.Offset = offset
		}
	}

	recipes, err := h.scrapedRecipeService.GetScrapedRecipes(filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"recipes": recipes,
		"total":   len(recipes),
		"filters": filters,
	})
}

func (h *Handlers) GetScrapedRecipeByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid recipe ID"})
		return
	}

	recipe, err := h.scrapedRecipeService.GetScrapedRecipeByID(id)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Recipe not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, recipe)
}

func (h *Handlers) GetRecommendationStats(c *gin.Context) {
	stats, err := h.scrapedRecipeService.GetRecommendationStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
} 