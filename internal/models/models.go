package models

import (
	"time"
	"database/sql/driver"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// StringArray is a custom type for PostgreSQL array columns
type StringArray []string

func (sa StringArray) Value() (driver.Value, error) {
	if len(sa) == 0 {
		return nil, nil
	}
	return json.Marshal(sa)
}

func (sa *StringArray) Scan(value interface{}) error {
	if value == nil {
		*sa = StringArray{}
		return nil
	}
	b, ok := value.([]byte)
	if !ok {
		return errors.New("cannot scan StringArray")
	}
	return json.Unmarshal(b, sa)
}

// UUIDArray is a custom type for PostgreSQL UUID array columns
type UUIDArray []uuid.UUID

func (ua UUIDArray) Value() (driver.Value, error) {
	if len(ua) == 0 {
		return nil, nil
	}
	return json.Marshal(ua)
}

func (ua *UUIDArray) Scan(value interface{}) error {
	if value == nil {
		*ua = UUIDArray{}
		return nil
	}
	b, ok := value.([]byte)
	if !ok {
		return errors.New("cannot scan UUIDArray")
	}
	return json.Unmarshal(b, ua)
}

// Base model with common fields
type BaseModel struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Cuisine represents a cuisine type
type Cuisine struct {
	BaseModel
	Name        string `gorm:"size:100;not null;unique" json:"name"`
	Description string `gorm:"type:text" json:"description"`
	Recipes     []Recipe `gorm:"foreignKey:CuisineID" json:"recipes,omitempty"`
}

// Ingredient represents a food ingredient
type Ingredient struct {
	BaseModel
	Name           string  `gorm:"size:200;not null" json:"name"`
	FDCID          *int    `gorm:"column:fdc_id" json:"fdc_id"`
	Description    string  `gorm:"type:text" json:"description"`
	Category       string  `gorm:"size:100" json:"category"`
	CaloriesPer100g *float64 `gorm:"column:calories_per_100g;type:decimal(8,2)" json:"calories_per_100g"`
	ProteinPer100g  *float64 `gorm:"column:protein_per_100g;type:decimal(8,2)" json:"protein_per_100g"`
	FatPer100g      *float64 `gorm:"column:fat_per_100g;type:decimal(8,2)" json:"fat_per_100g"`
	CarbsPer100g    *float64 `gorm:"column:carbs_per_100g;type:decimal(8,2)" json:"carbs_per_100g"`
	FiberPer100g    *float64 `gorm:"column:fiber_per_100g;type:decimal(8,2)" json:"fiber_per_100g"`
	SodiumPer100g   *float64 `gorm:"column:sodium_per_100g;type:decimal(8,2)" json:"sodium_per_100g"`
	AvgCostPerUnit  *float64 `gorm:"column:avg_cost_per_unit;type:decimal(10,2)" json:"avg_cost_per_unit"`
	UnitType        string   `gorm:"size:50;default:gram" json:"unit_type"`
}

// Recipe represents a cooking recipe
type Recipe struct {
	BaseModel
	Title            string           `gorm:"size:200;not null" json:"title"`
	Description      string           `gorm:"type:text" json:"description"`
	CuisineID        *uuid.UUID       `gorm:"type:uuid" json:"cuisine_id"`
	Cuisine          *Cuisine         `gorm:"foreignKey:CuisineID" json:"cuisine,omitempty"`
	Instructions     string           `gorm:"type:text;not null" json:"instructions"`
	PrepTimeMinutes  *int             `gorm:"column:prep_time_minutes;type:integer" json:"prep_time_minutes"`
	CookTimeMinutes  *int             `gorm:"column:cook_time_minutes;type:integer" json:"cook_time_minutes"`
	TotalTimeMinutes *int             `gorm:"column:total_time_minutes;<-:false" json:"total_time_minutes"`
	Servings         int              `gorm:"default:1" json:"servings"`
	DifficultyLevel  string           `gorm:"size:20;check:difficulty_level IN ('easy','medium','hard')" json:"difficulty_level"`
	TotalCalories    *float64         `gorm:"column:total_calories;type:decimal(10,2)" json:"total_calories"`
	TotalProtein     *float64         `gorm:"column:total_protein;type:decimal(8,2)" json:"total_protein"`
	TotalFat         *float64         `gorm:"column:total_fat;type:decimal(8,2)" json:"total_fat"`
	TotalCarbs       *float64         `gorm:"column:total_carbs;type:decimal(8,2)" json:"total_carbs"`
	TotalFiber       *float64         `gorm:"column:total_fiber;type:decimal(8,2)" json:"total_fiber"`
	TotalSodium      *float64         `gorm:"column:total_sodium;type:decimal(8,2)" json:"total_sodium"`
	EstimatedCost    *float64         `gorm:"column:estimated_cost;type:decimal(10,2)" json:"estimated_cost"`
	SourceURL        string           `gorm:"column:source_url;type:text" json:"source_url"`
	ScrapedAt        *time.Time       `gorm:"column:scraped_at" json:"scraped_at"`
	Ingredients      []RecipeIngredient `gorm:"foreignKey:RecipeID" json:"ingredients,omitempty"`
	Tags             []RecipeTag      `gorm:"many2many:recipe_tag_associations;" json:"tags,omitempty"`
}

// RecipeIngredient represents the junction table for recipe ingredients
type RecipeIngredient struct {
	BaseModel
	RecipeID     uuid.UUID   `gorm:"type:uuid;not null" json:"recipe_id"`
	Recipe       *Recipe     `gorm:"foreignKey:RecipeID" json:"recipe,omitempty"`
	IngredientID uuid.UUID   `gorm:"type:uuid;not null" json:"ingredient_id"`
	Ingredient   *Ingredient `gorm:"foreignKey:IngredientID" json:"ingredient,omitempty"`
	Quantity     float64     `gorm:"type:decimal(10,3);not null" json:"quantity"`
	Unit         string      `gorm:"size:50;not null" json:"unit"`
	Notes        string      `gorm:"type:text" json:"notes"`
}

// RecipeTag represents tags for categorizing recipes
type RecipeTag struct {
	BaseModel
	Name    string `gorm:"size:50;not null;unique" json:"name"`
	Color   string `gorm:"size:7;default:#6B7280" json:"color"`
}

// RecipeTagAssociation represents the join table for recipe-tag relationships
type RecipeTagAssociation struct {
	RecipeID uuid.UUID `gorm:"type:uuid;primaryKey" json:"recipe_id"`
	TagID    uuid.UUID `gorm:"type:uuid;primaryKey" json:"tag_id"`
	CreatedAt time.Time `json:"created_at"`
}

// MealPlan represents a meal planning schedule
type MealPlan struct {
	BaseModel
	Name                string           `gorm:"size:200;not null" json:"name"`
	Description         string           `gorm:"type:text" json:"description"`
	StartDate           time.Time        `gorm:"type:timestamp;not null" json:"start_date"`
	EndDate             time.Time        `gorm:"type:timestamp;not null" json:"end_date"`
	BudgetLimit         *float64         `gorm:"column:budget_limit;type:decimal(10,2)" json:"budget_limit"`
	CalorieTargetPerDay *int             `gorm:"column:calorie_target_per_day" json:"calorie_target_per_day"`
	MaxPrepTimeMinutes  *int             `gorm:"column:max_prep_time_minutes" json:"max_prep_time_minutes"`
	DietaryRestrictions StringArray      `gorm:"type:text[]" json:"dietary_restrictions"`
	TotalEstimatedCost  *float64         `gorm:"column:total_estimated_cost;type:decimal(10,2)" json:"total_estimated_cost"`
	TotalCalories       *float64         `gorm:"column:total_calories;type:decimal(10,2)" json:"total_calories"`
	Entries             []MealPlanEntry  `gorm:"foreignKey:MealPlanID" json:"entries,omitempty"`
	ShoppingLists       []ShoppingList   `gorm:"foreignKey:MealPlanID" json:"shopping_lists,omitempty"`
}

// MealPlanEntry represents individual meals in a meal plan
type MealPlanEntry struct {
	BaseModel
	MealPlanID  uuid.UUID `gorm:"type:uuid;not null" json:"meal_plan_id"`
	MealPlan    *MealPlan `gorm:"foreignKey:MealPlanID" json:"meal_plan,omitempty"`
	RecipeID    uuid.UUID `gorm:"type:uuid;not null" json:"recipe_id"`
	Recipe      *Recipe   `gorm:"foreignKey:RecipeID" json:"recipe,omitempty"`
	PlannedDate time.Time `gorm:"type:timestamp;not null" json:"planned_date"`
	MealType    string    `gorm:"size:20;not null;check:meal_type IN ('breakfast','lunch','dinner','snack')" json:"meal_type"`
	Servings    int       `gorm:"default:1" json:"servings"`
	Notes       string    `gorm:"type:text" json:"notes"`
}

// ShoppingList represents a shopping list generated from meal plans
type ShoppingList struct {
	BaseModel
	MealPlanID         uuid.UUID          `gorm:"type:uuid;not null" json:"meal_plan_id"`
	MealPlan           *MealPlan          `gorm:"foreignKey:MealPlanID" json:"meal_plan,omitempty"`
	Name               string             `gorm:"size:200;not null" json:"name"`
	Status             string             `gorm:"size:20;default:pending;check:status IN ('pending','shopping','completed')" json:"status"`
	TotalEstimatedCost *float64           `gorm:"column:total_estimated_cost;type:decimal(10,2)" json:"total_estimated_cost"`
	Items              []ShoppingListItem `gorm:"foreignKey:ShoppingListID" json:"items,omitempty"`
}

// ShoppingListItem represents individual items in a shopping list
type ShoppingListItem struct {
	BaseModel
	ShoppingListID uuid.UUID    `gorm:"type:uuid;not null" json:"shopping_list_id"`
	ShoppingList   *ShoppingList `gorm:"foreignKey:ShoppingListID" json:"shopping_list,omitempty"`
	IngredientID   uuid.UUID    `gorm:"type:uuid;not null" json:"ingredient_id"`
	Ingredient     *Ingredient  `gorm:"foreignKey:IngredientID" json:"ingredient,omitempty"`
	Quantity       float64      `gorm:"type:decimal(10,3);not null" json:"quantity"`
	Unit           string       `gorm:"size:50;not null" json:"unit"`
	EstimatedCost  *float64     `gorm:"column:estimated_cost;type:decimal(8,2)" json:"estimated_cost"`
	Purchased      bool         `gorm:"default:false" json:"purchased"`
	ActualCost     *float64     `gorm:"column:actual_cost;type:decimal(8,2)" json:"actual_cost"`
	Notes          string       `gorm:"type:text" json:"notes"`
}

// UserPreferences represents user-specific preferences
type UserPreferences struct {
	BaseModel
	DietaryRestrictions StringArray `gorm:"type:text[]" json:"dietary_restrictions"`
	FavoriteCuisines    UUIDArray   `gorm:"type:uuid[]" json:"favorite_cuisines"`
	DislikedIngredients UUIDArray   `gorm:"type:uuid[]" json:"disliked_ingredients"`
	DefaultBudget       *float64    `gorm:"column:default_budget;type:decimal(10,2)" json:"default_budget"`
	DefaultCalorieTarget *int        `gorm:"column:default_calorie_target" json:"default_calorie_target"`
	MaxPrepTime         *int        `gorm:"column:max_prep_time" json:"max_prep_time"`
	PreferredMealTypes  StringArray `gorm:"type:text[]" json:"preferred_meal_types"`
}

// ShoppingCart represents a user's shopping cart for online grocery ordering
type ShoppingCart struct {
	BaseModel
	UserID             string            `gorm:"size:100;not null" json:"user_id"`
	Name               string            `gorm:"size:200;default:My Cart" json:"name"`
	Status             string            `gorm:"size:20;default:active;check:status IN ('active','checked_out','abandoned')" json:"status"`
	TotalEstimatedCost *float64          `gorm:"column:total_estimated_cost;type:decimal(10,2)" json:"total_estimated_cost"`
	Items              []ShoppingCartItem `gorm:"foreignKey:ShoppingCartID" json:"items,omitempty"`
}

// ShoppingCartItem represents individual items in a shopping cart
type ShoppingCartItem struct {
	BaseModel
	ShoppingCartID uuid.UUID    `gorm:"type:uuid;not null" json:"shopping_cart_id"`
	ShoppingCart   *ShoppingCart `gorm:"foreignKey:ShoppingCartID" json:"shopping_cart,omitempty"`
	IngredientID   uuid.UUID    `gorm:"type:uuid;not null" json:"ingredient_id"`
	Ingredient     *Ingredient  `gorm:"foreignKey:IngredientID" json:"ingredient,omitempty"`
	Quantity       float64      `gorm:"type:decimal(10,3);not null" json:"quantity"`
	Unit           string       `gorm:"size:50;not null" json:"unit"`
	EstimatedCost  *float64     `gorm:"column:estimated_cost;type:decimal(8,2)" json:"estimated_cost"`
	Notes          string       `gorm:"type:text" json:"notes"`
}

// GroceryStoreIntegration represents external grocery store API configurations
type GroceryStoreIntegration struct {
	BaseModel
	Name           string `gorm:"size:100;not null" json:"name"`
	APIEndpoint    string `gorm:"size:500;not null" json:"api_endpoint"`
	APIKey         string `gorm:"size:200" json:"api_key"`
	IsActive       bool   `gorm:"default:true" json:"is_active"`
	SupportedAreas StringArray `gorm:"type:text[]" json:"supported_areas"`
}

// ExternalCartSession represents a checkout session with external grocery stores
type ExternalCartSession struct {
	BaseModel
	ShoppingCartID    uuid.UUID `gorm:"type:uuid;not null" json:"shopping_cart_id"`
	ShoppingCart      *ShoppingCart `gorm:"foreignKey:ShoppingCartID" json:"shopping_cart,omitempty"`
	GroceryStore      string    `gorm:"size:100;not null" json:"grocery_store"`
	ExternalSessionID string    `gorm:"size:200" json:"external_session_id"`
	CheckoutURL       string    `gorm:"size:1000" json:"checkout_url"`
	Status            string    `gorm:"size:20;default:pending;check:status IN ('pending','redirected','completed','failed')" json:"status"`
	TotalCost         *float64  `gorm:"column:total_cost;type:decimal(10,2)" json:"total_cost"`
	ExpiresAt         *time.Time `gorm:"column:expires_at" json:"expires_at"`
}

// USDA API response structures
type USDAFoodSearchResponse struct {
	Foods []USDAFood `json:"foods"`
}

// USDAFood represents a food item from the USDA API
type USDAFood struct {
	FDCID       int           `json:"fdcId"`
	Description string        `json:"description"`
	DataType    string        `json:"dataType"`
	FoodNutrients   []USDANutrient `json:"foodNutrients"`
}

// USDANutrient represents a nutrient from the USDA API
type USDANutrient struct {
	NutrientID     int     `json:"nutrientId"`
	NutrientName   string  `json:"nutrientName"`
	NutrientNumber string  `json:"nutrientNumber"`
	UnitName       string  `json:"unitName"`
	Value          float64 `json:"value"`
}

// Food Details API response structures (different format)
type USDAFoodDetailsResponse struct {
	FDCID         int                      `json:"fdcId"`
	Description   string                   `json:"description"`
	DataType      string                   `json:"dataType"`
	FoodNutrients []USDAFoodDetailsNutrient `json:"foodNutrients"`
}

// USDAFoodDetailsNutrient represents a nutrient from the USDA Food Details API
type USDAFoodDetailsNutrient struct {
	Nutrient struct {
		ID       int    `json:"id"`
		Name     string `json:"name"`
		Number   string `json:"number"`
		UnitName string `json:"unitName"`
	} `json:"nutrient"`
	Amount float64 `json:"amount"`
}

// Recipe scraping structures
type ScrapedRecipe struct {
	Title        string              `json:"title"`
	Description  string              `json:"description"`
	Instructions string              `json:"instructions"`
	PrepTime     *int                `json:"prep_time"`
	CookTime     *int                `json:"cook_time"`
	Servings     int                 `json:"servings"`
	Ingredients  []ScrapedIngredient `json:"ingredients"`
	SourceURL    string              `json:"source_url"`
}

// ScrapedIngredient represents an ingredient from a scraped recipe
type ScrapedIngredient struct {
	Name     string  `json:"name"`
	Quantity float64 `json:"quantity"`
	Unit     string  `json:"unit"`
	Notes    string  `json:"notes"`
}

// CentralizedScrapedRecipe represents a recipe stored in the centralized database
type CentralizedScrapedRecipe struct {
	BaseModel
	Title             string    `gorm:"size:500;not null" json:"title"`
	Description       string    `gorm:"type:text" json:"description"`
	SourceURL         string    `gorm:"size:1000;not null;unique" json:"source_url"`
	SourceSite        string    `gorm:"size:100;not null" json:"source_site"`
	ImageURL          string    `gorm:"size:1000" json:"image_url"`
	PrepTimeMinutes   *int      `gorm:"column:prep_time_minutes" json:"prep_time_minutes"`
	CookTimeMinutes   *int      `gorm:"column:cook_time_minutes" json:"cook_time_minutes"`
	TotalTimeMinutes  *int      `gorm:"column:total_time_minutes" json:"total_time_minutes"`
	Servings          int       `gorm:"default:4" json:"servings"`
	DifficultyLevel   string    `gorm:"size:20;default:Medium" json:"difficulty_level"`
	CuisineType       string    `gorm:"size:100" json:"cuisine_type"`
	
	// Nutritional information
	CaloriesPerServing *int     `gorm:"column:calories_per_serving" json:"calories_per_serving"`
	ProteinPerServing  *float64 `gorm:"column:protein_per_serving;type:decimal(5,2)" json:"protein_per_serving"`
	FatPerServing      *float64 `gorm:"column:fat_per_serving;type:decimal(5,2)" json:"fat_per_serving"`
	CarbsPerServing    *float64 `gorm:"column:carbs_per_serving;type:decimal(5,2)" json:"carbs_per_serving"`
	FiberPerServing    *float64 `gorm:"column:fiber_per_serving;type:decimal(5,2)" json:"fiber_per_serving"`
	SodiumPerServing   *float64 `gorm:"column:sodium_per_serving;type:decimal(7,2)" json:"sodium_per_serving"`
	
	// Raw scraped data
	RawIngredients   string `gorm:"type:text" json:"raw_ingredients"`   // JSON array of raw ingredient text
	RawInstructions  string `gorm:"type:text" json:"raw_instructions"`  // JSON array of raw instruction steps
	
	// LLM processed data
	StructuredIngredients JSONB `gorm:"type:jsonb" json:"structured_ingredients"` // Normalized ingredient objects
	StructuredInstructions JSONB `gorm:"type:jsonb" json:"structured_instructions"` // Structured instruction steps
	DietaryTags           JSONB `gorm:"type:jsonb" json:"dietary_tags"`           // Array of dietary tags
	
	// Metadata
	ScrapedAt        time.Time  `gorm:"default:CURRENT_TIMESTAMP" json:"scraped_at"`
	ProcessedAt      *time.Time `gorm:"column:processed_at" json:"processed_at"`
	ProcessingStatus string     `gorm:"size:20;default:pending" json:"processing_status"`
	ProcessingError  string     `gorm:"type:text" json:"processing_error"`
	QualityScore     int        `gorm:"default:0" json:"quality_score"`
}

// JSONB is a custom type for PostgreSQL JSONB columns
type JSONB map[string]interface{}

func (j JSONB) Value() (driver.Value, error) {
	return json.Marshal(j)
}

func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = JSONB{}
		return nil
	}
	b, ok := value.([]byte)
	if !ok {
		return errors.New("cannot scan JSONB")
	}
	return json.Unmarshal(b, j)
}

// StructuredIngredient represents a normalized ingredient from LLM processing
type StructuredIngredient struct {
	Name     string  `json:"name"`
	Amount   float64 `json:"amount"`
	Unit     string  `json:"unit"`
	Notes    string  `json:"notes"`
	FDCID    *int    `json:"fdc_id,omitempty"`
	Category string  `json:"category,omitempty"`
}

// StructuredInstruction represents a normalized instruction step from LLM processing
type StructuredInstruction struct {
	StepNumber int    `json:"step_number"`
	Action     string `json:"action"`
	Details    string `json:"details"`
	Duration   *int   `json:"duration,omitempty"`   // in minutes
	Temperature *int  `json:"temperature,omitempty"` // in fahrenheit
}

// ProcessingRequest represents a request to process a scraped recipe with LLM
type ProcessingRequest struct {
	RecipeID      uuid.UUID `json:"recipe_id"`
	RawIngredients []string `json:"raw_ingredients"`
	RawInstructions []string `json:"raw_instructions"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	SourceSite    string    `json:"source_site"`
}

// ProcessingResponse represents the response from LLM processing
type ProcessingResponse struct {
	StructuredIngredients []StructuredIngredient  `json:"structured_ingredients"`
	StructuredInstructions []StructuredInstruction `json:"structured_instructions"`
	DietaryTags           []string                `json:"dietary_tags"`
	CuisineType           string                  `json:"cuisine_type"`
	DifficultyLevel       string                  `json:"difficulty_level"`
	EstimatedCalories     *int                    `json:"estimated_calories"`
	EstimatedProtein      *float64                `json:"estimated_protein"`
	EstimatedFat          *float64                `json:"estimated_fat"`
	EstimatedCarbs        *float64                `json:"estimated_carbs"`
	ProcessingNotes       string                  `json:"processing_notes"`
}

// RecipeSearchSuggestion represents a suggestion for recipe search
type RecipeSearchSuggestion struct {
	BaseModel
	SearchQuery               string                      `gorm:"size:500;not null" json:"search_query"`
	SuggestedScrapedRecipeID  uuid.UUID                   `gorm:"type:uuid" json:"suggested_scraped_recipe_id"`
	SuggestedScrapedRecipe    *CentralizedScrapedRecipe   `gorm:"foreignKey:SuggestedScrapedRecipeID" json:"suggested_scraped_recipe,omitempty"`
	ConfidenceScore           *float64                    `gorm:"type:decimal(3,2)" json:"confidence_score"`
}

// ScrapingJob represents a job to scrape recipes from a source
type ScrapingJob struct {
	BaseModel
	SourceSite    string     `gorm:"size:100;not null" json:"source_site"`
	Status        string     `gorm:"size:20;default:pending" json:"status"`
	TotalUrls     int        `gorm:"default:0" json:"total_urls"`
	ScrapedCount  int        `gorm:"default:0" json:"scraped_count"`
	FailedCount   int        `gorm:"default:0" json:"failed_count"`
	StartedAt     *time.Time `json:"started_at"`
	CompletedAt   *time.Time `json:"completed_at"`
	ErrorMessage  string     `gorm:"type:text" json:"error_message"`
}

// RecipeLookupRequest represents a request to look up recipes
type RecipeLookupRequest struct {
	Query       string   `json:"query"`
	Ingredients []string `json:"ingredients,omitempty"`
	CuisineType string   `json:"cuisine_type,omitempty"`
	DietaryTags []string `json:"dietary_tags,omitempty"`
	MaxResults  int      `json:"max_results,omitempty"`
}

// RecipeLookupResponse represents the response for recipe lookup
type RecipeLookupResponse struct {
	Recipes     []CentralizedScrapedRecipe `json:"recipes"`
	TotalCount  int                        `json:"total_count"`
	QueryTime   string                     `json:"query_time"`
	HasMore     bool                       `json:"has_more"`
	Suggestions []string                   `json:"suggestions,omitempty"`
}

// Meal plan generation request
type MealPlanGenerationRequest struct {
	Name                string      `json:"name"`
	StartDate           time.Time   `json:"start_date"`
	EndDate             time.Time   `json:"end_date"`
	BudgetLimit         *float64    `json:"budget_limit"`
	CalorieTargetPerDay *int        `json:"calorie_target_per_day"`
	MaxPrepTimeMinutes  *int        `json:"max_prep_time_minutes"`
	DietaryRestrictions StringArray `json:"dietary_restrictions"`
	PreferredCuisines   UUIDArray   `json:"preferred_cuisines"`
	MealTypes           StringArray `json:"meal_types"`
}

// BeforeCreate hooks for GORM
func (b *BaseModel) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}

// ScrapedRecipeDB represents a recipe scraped from external sources for database storage
type ScrapedRecipeDB struct {
	ID           int       `json:"id" db:"id"`
	Title        string    `json:"title" db:"title"`
	Description  string    `json:"description" db:"description"`
	Instructions string    `json:"instructions" db:"instructions"`
	PrepTime     string    `json:"prep_time" db:"prep_time"`
	CookTime     string    `json:"cook_time" db:"cook_time"`
	Servings     string    `json:"servings" db:"servings"`
	SourceURL    string    `json:"source_url" db:"source_url"`
	SourceSite   string    `json:"source_site" db:"source_site"`
	ScrapedAt    time.Time `json:"scraped_at" db:"scraped_at"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

// RecommendationFilters for filtering scraped recipes
type RecommendationFilters struct {
	MaxPrepTimeMinutes int      `json:"max_prep_time_minutes"`
	MaxCookTimeMinutes int      `json:"max_cook_time_minutes"`
	DietaryRestrictions []string `json:"dietary_restrictions"`
	Allergies          []string `json:"allergies"`
	CookingSkillLevel  string   `json:"cooking_skill_level"`
	Limit              int      `json:"limit"`
	Offset             int      `json:"offset"`
}

// PersonalizedRecommendation represents a recommendation with score
type PersonalizedRecommendation struct {
	Recipe          ScrapedRecipeDB `json:"recipe"`
	RecommendationScore float64   `json:"recommendation_score"`
	MatchReason     string        `json:"match_reason"`
}