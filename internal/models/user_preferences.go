package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// Enhanced User Preferences Models

// UserPreferencesEnhanced represents comprehensive user preferences
type UserPreferencesEnhanced struct {
	ID     string `json:"id" db:"id"`
	UserID string `json:"user_id" db:"user_id"`

	// Explicit Dietary Preferences
	DietaryRestrictions JSONB             `json:"dietary_restrictions" db:"dietary_restrictions"`
	Allergies          JSONB             `json:"allergies" db:"allergies"`
	FavoriteCuisines   CuisineScores     `json:"favorite_cuisines" db:"favorite_cuisines"`
	AvoidedIngredients JSONB             `json:"avoided_ingredients" db:"avoided_ingredients"`
	FavoriteIngredients JSONB            `json:"favorite_ingredients" db:"favorite_ingredients"`

	// Cooking Preferences
	CookingSkillLevel       string `json:"cooking_skill_level" db:"cooking_skill_level"`
	MaxPrepTimeMinutes      int    `json:"max_prep_time_minutes" db:"max_prep_time_minutes"`
	MaxCookTimeMinutes      int    `json:"max_cook_time_minutes" db:"max_cook_time_minutes"`
	PreferredMealTimes      JSONB  `json:"preferred_meal_times" db:"preferred_meal_times"`

	// Health & Nutrition Goals
	DailyCalorieGoal  *int     `json:"daily_calorie_goal,omitempty" db:"daily_calorie_goal"`
	DailyProteinGoal  *float64 `json:"daily_protein_goal,omitempty" db:"daily_protein_goal"`
	DailyCarbGoal     *float64 `json:"daily_carb_goal,omitempty" db:"daily_carb_goal"`
	DailyFatGoal      *float64 `json:"daily_fat_goal,omitempty" db:"daily_fat_goal"`
	WeeklyBudgetLimit *float64 `json:"weekly_budget_limit,omitempty" db:"weekly_budget_limit"`

	// Kitchen Setup
	AvailableEquipment JSONB  `json:"available_equipment" db:"available_equipment"`
	KitchenSize        string `json:"kitchen_size" db:"kitchen_size"`

	// Lifestyle Preferences
	MealPrepStyle              string `json:"meal_prep_style" db:"meal_prep_style"`
	FamilySize                 int    `json:"family_size" db:"family_size"`
	PreferredShoppingFrequency string `json:"preferred_shopping_frequency" db:"preferred_shopping_frequency"`

	// Personalization Settings
	RecommendationStyle    string `json:"recommendation_style" db:"recommendation_style"`
	OnboardingCompleted    bool   `json:"onboarding_completed" db:"onboarding_completed"`
	PreferencesLastUpdated time.Time `json:"preferences_last_updated" db:"preferences_last_updated"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// CuisineScores represents user's preference scores for different cuisines
type CuisineScores map[string]float64

// Value implements driver.Valuer for database storage
func (cs CuisineScores) Value() (driver.Value, error) {
	return json.Marshal(cs)
}

// Scan implements sql.Scanner for database retrieval
func (cs *CuisineScores) Scan(value interface{}) error {
	if value == nil {
		*cs = make(CuisineScores)
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	
	return json.Unmarshal(bytes, cs)
}

// UserBehaviorEvent tracks user interactions for implicit preference learning
type UserBehaviorEvent struct {
	ID        string `json:"id" db:"id"`
	UserID    string `json:"user_id" db:"user_id"`
	EventType string `json:"event_type" db:"event_type"`

	// Event Context
	RecipeID     *string `json:"recipe_id,omitempty" db:"recipe_id"`
	IngredientID *string `json:"ingredient_id,omitempty" db:"ingredient_id"`
	CuisineType  *string `json:"cuisine_type,omitempty" db:"cuisine_type"`
	MealType     *string `json:"meal_type,omitempty" db:"meal_type"`

	// Event Details
	EventData JSONB  `json:"event_data" db:"event_data"`
	SessionID string `json:"session_id" db:"session_id"`

	// Metadata
	Timestamp  time.Time `json:"timestamp" db:"timestamp"`
	DeviceType string    `json:"device_type" db:"device_type"`
	Source     string    `json:"source" db:"source"`
}

// EventData represents additional context for behavior events
type EventData struct {
	Duration     *int     `json:"duration,omitempty"`     // Time spent on recipe
	Rating       *int     `json:"rating,omitempty"`       // User rating 1-5
	SearchQuery  *string  `json:"search_query,omitempty"` // Search terms used
	ScrollDepth  *float64 `json:"scroll_depth,omitempty"` // How far user scrolled
	TimeOfDay    *string  `json:"time_of_day,omitempty"`  // morning, afternoon, evening
	WasRecommended *bool  `json:"was_recommended,omitempty"` // Whether this was a recommendation
}

// UserPreferenceScore represents computed preference scores
type UserPreferenceScore struct {
	ID              string  `json:"id" db:"id"`
	UserID          string  `json:"user_id" db:"user_id"`
	PreferenceType  string  `json:"preference_type" db:"preference_type"`
	PreferenceValue string  `json:"preference_value" db:"preference_value"`

	// Scoring
	ExplicitScore float64 `json:"explicit_score" db:"explicit_score"`
	ImplicitScore float64 `json:"implicit_score" db:"implicit_score"`
	CombinedScore float64 `json:"combined_score" db:"combined_score"`
	Confidence    float64 `json:"confidence" db:"confidence"`

	// Metadata
	InteractionCount int        `json:"interaction_count" db:"interaction_count"`
	LastInteraction  *time.Time `json:"last_interaction,omitempty" db:"last_interaction"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`
}

// UserRecipeRecommendation represents cached recipe recommendations
type UserRecipeRecommendation struct {
	ID       string `json:"id" db:"id"`
	UserID   string `json:"user_id" db:"user_id"`
	RecipeID string `json:"recipe_id" db:"recipe_id"`

	// Recommendation scoring
	RelevanceScore  float64 `json:"relevance_score" db:"relevance_score"`
	DiversityBoost  float64 `json:"diversity_boost" db:"diversity_boost"`
	FreshnessScore  float64 `json:"freshness_score" db:"freshness_score"`
	FinalScore      float64 `json:"final_score" db:"final_score"`

	// Recommendation context
	RecommendationReason JSONB  `json:"recommendation_reason" db:"recommendation_reason"`
	MealType             string `json:"meal_type" db:"meal_type"`
	RecommendedForDate   *time.Time `json:"recommended_for_date,omitempty" db:"recommended_for_date"`

	// Status tracking
	ShownToUser  bool   `json:"shown_to_user" db:"shown_to_user"`
	UserAction   string `json:"user_action" db:"user_action"`
	UserFeedback *int   `json:"user_feedback,omitempty" db:"user_feedback"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
	ExpiresAt time.Time `json:"expires_at" db:"expires_at"`
}

// UserRecipeFeedback represents detailed user feedback on recipes
type UserRecipeFeedback struct {
	ID       string `json:"id" db:"id"`
	UserID   string `json:"user_id" db:"user_id"`
	RecipeID string `json:"recipe_id" db:"recipe_id"`

	// Feedback
	Rating             *int    `json:"rating,omitempty" db:"rating"`
	WouldCookAgain     *bool   `json:"would_cook_again,omitempty" db:"would_cook_again"`
	DifficultyActual   *string `json:"difficulty_actual,omitempty" db:"difficulty_actual"`
	TimeTakenMinutes   *int    `json:"time_taken_minutes,omitempty" db:"time_taken_minutes"`

	// Detailed feedback
	LikedAspects      JSONB  `json:"liked_aspects" db:"liked_aspects"`
	DislikedAspects   JSONB  `json:"disliked_aspects" db:"disliked_aspects"`
	ModificationsMade string `json:"modifications_made" db:"modifications_made"`
	Notes             string `json:"notes" db:"notes"`

	// Context
	CookedForMealType string     `json:"cooked_for_meal_type" db:"cooked_for_meal_type"`
	CookedForPeople   int        `json:"cooked_for_people" db:"cooked_for_people"`
	CookingDate       *time.Time `json:"cooking_date,omitempty" db:"cooking_date"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// UserOnboardingProgress tracks user onboarding completion
type UserOnboardingProgress struct {
	ID     string `json:"id" db:"id"`
	UserID string `json:"user_id" db:"user_id"`

	// Onboarding steps completion
	BasicInfoCompleted        bool `json:"basic_info_completed" db:"basic_info_completed"`
	DietaryPreferencesCompleted bool `json:"dietary_preferences_completed" db:"dietary_preferences_completed"`
	CookingPreferencesCompleted bool `json:"cooking_preferences_completed" db:"cooking_preferences_completed"`
	KitchenSetupCompleted     bool `json:"kitchen_setup_completed" db:"kitchen_setup_completed"`
	GoalSettingCompleted      bool `json:"goal_setting_completed" db:"goal_setting_completed"`
	FirstRecipeInteraction    bool `json:"first_recipe_interaction" db:"first_recipe_interaction"`

	// Progress tracking
	CompletionPercentage    int        `json:"completion_percentage" db:"completion_percentage"`
	CurrentStep             string     `json:"current_step" db:"current_step"`
	OnboardingStartedAt     time.Time  `json:"onboarding_started_at" db:"onboarding_started_at"`
	OnboardingCompletedAt   *time.Time `json:"onboarding_completed_at,omitempty" db:"onboarding_completed_at"`

	// Onboarding customization
	OnboardingVersion      string `json:"onboarding_version" db:"onboarding_version"`
	SkipAdvancedFeatures   bool   `json:"skip_advanced_features" db:"skip_advanced_features"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// Preference-related request/response models

// UpdatePreferencesRequest represents a request to update user preferences
type UpdatePreferencesRequest struct {
	DietaryRestrictions         []string                 `json:"dietary_restrictions,omitempty"`
	Allergies                   []string                 `json:"allergies,omitempty"`
	FavoriteCuisines           map[string]float64       `json:"favorite_cuisines,omitempty"`
	AvoidedIngredients         []string                 `json:"avoided_ingredients,omitempty"`
	FavoriteIngredients        []string                 `json:"favorite_ingredients,omitempty"`
	CookingSkillLevel          *string                  `json:"cooking_skill_level,omitempty"`
	MaxPrepTimeMinutes         *int                     `json:"max_prep_time_minutes,omitempty"`
	MaxCookTimeMinutes         *int                     `json:"max_cook_time_minutes,omitempty"`
	PreferredMealTimes         []string                 `json:"preferred_meal_times,omitempty"`
	DailyCalorieGoal           *int                     `json:"daily_calorie_goal,omitempty"`
	NutritionGoals             *NutritionGoals          `json:"nutrition_goals,omitempty"`
	AvailableEquipment         []string                 `json:"available_equipment,omitempty"`
	KitchenSize                *string                  `json:"kitchen_size,omitempty"`
	MealPrepStyle              *string                  `json:"meal_prep_style,omitempty"`
	FamilySize                 *int                     `json:"family_size,omitempty"`
	RecommendationStyle        *string                  `json:"recommendation_style,omitempty"`
}

// NutritionGoals represents user's nutrition targets
type NutritionGoals struct {
	DailyProteinGoal  *float64 `json:"daily_protein_goal,omitempty"`
	DailyCarbGoal     *float64 `json:"daily_carb_goal,omitempty"`
	DailyFatGoal      *float64 `json:"daily_fat_goal,omitempty"`
	WeeklyBudgetLimit *float64 `json:"weekly_budget_limit,omitempty"`
}

// RecommendationRequest represents a request for personalized recommendations
type RecommendationRequest struct {
	UserID             string   `json:"user_id"`
	MealType           *string  `json:"meal_type,omitempty"`
	MaxResults         int      `json:"max_results"`
	IncludeDiversity   bool     `json:"include_diversity"`
	ForDate            *time.Time `json:"for_date,omitempty"`
	ExcludeRecipeIDs   []string `json:"exclude_recipe_ids,omitempty"`
	MinRelevanceScore  *float64 `json:"min_relevance_score,omitempty"`
}

// PersonalizedRecommendationResponse represents personalized recipe recommendations
type PersonalizedRecommendationResponse struct {
	Recommendations []RecommendationWithReason `json:"recommendations"`
	UserProfile     UserPreferenceProfile      `json:"user_profile"`
	TotalCount      int                        `json:"total_count"`
	GeneratedAt     time.Time                  `json:"generated_at"`
}

// RecommendationWithReason includes the recipe and why it was recommended
type RecommendationWithReason struct {
	Recipe           Recipe   `json:"recipe"`
	Score            float64  `json:"score"`
	RelevanceScore   float64  `json:"relevance_score"`
	DiversityBoost   float64  `json:"diversity_boost"`
	Reasons          []string `json:"reasons"`
	MealType         string   `json:"meal_type"`
	ConfidenceLevel  string   `json:"confidence_level"` // high, medium, low
}

// UserPreferenceProfile represents a summary of user preferences for display
type UserPreferenceProfile struct {
	UserID                    string             `json:"user_id"`
	TopCuisines              []CuisinePreference `json:"top_cuisines"`
	DietaryRestrictions      []string           `json:"dietary_restrictions"`
	Allergies                []string           `json:"allergies"`
	CookingSkillLevel        string             `json:"cooking_skill_level"`
	PreferredCookingTime     string             `json:"preferred_cooking_time"`
	RecommendationStyle      string             `json:"recommendation_style"`
	OnboardingCompleted      bool               `json:"onboarding_completed"`
	ProfileCompleteness      int                `json:"profile_completeness"`
	LastActivityDate         *time.Time         `json:"last_activity_date,omitempty"`
}

// CuisinePreference represents user's preference for a specific cuisine
type CuisinePreference struct {
	Name       string  `json:"name"`
	Score      float64 `json:"score"`
	Confidence float64 `json:"confidence"`
}

// BehaviorTrackingRequest represents a request to track user behavior
type BehaviorTrackingRequest struct {
	UserID      string    `json:"user_id"`
	EventType   string    `json:"event_type"`
	RecipeID    *string   `json:"recipe_id,omitempty"`
	EventData   EventData `json:"event_data,omitempty"`
	SessionID   string    `json:"session_id"`
	DeviceType  string    `json:"device_type"`
	Source      string    `json:"source"`
}

// FeedbackRequest represents a request to submit recipe feedback
type FeedbackRequest struct {
	UserID             string   `json:"user_id"`
	RecipeID           string   `json:"recipe_id"`
	Rating             *int     `json:"rating,omitempty"`
	WouldCookAgain     *bool    `json:"would_cook_again,omitempty"`
	DifficultyActual   *string  `json:"difficulty_actual,omitempty"`
	TimeTakenMinutes   *int     `json:"time_taken_minutes,omitempty"`
	LikedAspects       []string `json:"liked_aspects,omitempty"`
	DislikedAspects    []string `json:"disliked_aspects,omitempty"`
	ModificationsMade  string   `json:"modifications_made,omitempty"`
	Notes              string   `json:"notes,omitempty"`
	CookedForMealType  string   `json:"cooked_for_meal_type"`
	CookedForPeople    int      `json:"cooked_for_people"`
	CookingDate        *time.Time `json:"cooking_date,omitempty"`
}

// Constants for preference types and values
var (
	// Event types for behavior tracking
	EventTypeRecipeViewed      = "recipe_viewed"
	EventTypeRecipeSaved       = "recipe_saved"
	EventTypeRecipeCooked      = "recipe_cooked"
	EventTypeRecipeShared      = "recipe_shared"
	EventTypeRecipeDisliked    = "recipe_disliked"
	EventTypeSearchPerformed   = "search_performed"
	EventTypeIngredientViewed  = "ingredient_viewed"
	EventTypeMealPlanCreated   = "meal_plan_created"
	EventTypeShoppingListGenerated = "shopping_list_generated"

	// Preference types for scoring
	PreferenceTypeCuisine       = "cuisine"
	PreferenceTypeIngredient    = "ingredient"
	PreferenceTypeCookingMethod = "cooking_method"
	PreferenceTypeDifficulty    = "difficulty"
	PreferenceTypeMealType      = "meal_type"
	PreferenceTypePrepTime      = "prep_time"

	// Cooking skill levels
	CookingSkillBeginner     = "beginner"
	CookingSkillIntermediate = "intermediate"
	CookingSkillAdvanced     = "advanced"

	// Recommendation styles
	RecommendationStyleAdventurous = "adventurous"
	RecommendationStyleBalanced    = "balanced"
	RecommendationStyleConservative = "conservative"

	// Meal prep styles
	MealPrepStyleBatchCook      = "batch_cook"
	MealPrepStyleFreshDaily     = "fresh_daily"
	MealPrepStyleLeftoversFriendly = "leftovers_friendly"
) 