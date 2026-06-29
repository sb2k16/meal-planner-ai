package services

import (
	"database/sql"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"mealplanner/app/models"
)

type ScrapedRecipeService struct {
	db *sql.DB
}

func NewScrapedRecipeService(db *sql.DB) *ScrapedRecipeService {
	return &ScrapedRecipeService{db: db}
}

// GetPersonalizedRecommendations returns scraped recipes filtered and scored based on user preferences
func (s *ScrapedRecipeService) GetPersonalizedRecommendations(userID string, filters models.RecommendationFilters) ([]models.PersonalizedRecommendation, error) {
	// Get user preferences to personalize recommendations
	userPrefs, err := s.getUserPreferences(userID)
	if err != nil {
		// If we can't get user preferences, continue with default filtering
		userPrefs = &models.UserPreferencesEnhanced{
			MaxPrepTimeMinutes: 60,
			CookingSkillLevel:  "medium",
		}
	}

	// Apply user preferences to filters if not explicitly set
	if filters.MaxPrepTimeMinutes == 0 {
		filters.MaxPrepTimeMinutes = userPrefs.MaxPrepTimeMinutes
	}
	if filters.MaxCookTimeMinutes == 0 {
		filters.MaxCookTimeMinutes = 60 // Default 1 hour
	}
	if filters.CookingSkillLevel == "" {
		filters.CookingSkillLevel = userPrefs.CookingSkillLevel
	}
	if filters.Limit == 0 {
		filters.Limit = 10
	}

	// Build SQL query with filters
	query, args := s.buildRecommendationQuery(filters)
	
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query scraped recipes: %w", err)
	}
	defer rows.Close()

	// Initialize as an empty (non-nil) slice so an empty result serializes to
	// [] rather than null, which the frontend treats as an array.
	recommendations := []models.PersonalizedRecommendation{}
	for rows.Next() {
		var recipe models.ScrapedRecipeDB
		err := rows.Scan(
			&recipe.ID,
			&recipe.Title,
			&recipe.Description,
			&recipe.Instructions,
			&recipe.PrepTime,
			&recipe.CookTime,
			&recipe.Servings,
			&recipe.SourceURL,
			&recipe.SourceSite,
			&recipe.ScrapedAt,
			&recipe.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan recipe: %w", err)
		}

		// Score the recipe based on user preferences
		score, reason := s.scoreRecipe(recipe, userPrefs, filters)
		
		recommendations = append(recommendations, models.PersonalizedRecommendation{
			Recipe:              recipe,
			RecommendationScore: score,
			MatchReason:         reason,
		})
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	// Sort by score (highest first) - for now we'll return as-is since SQL can't easily sort by our scoring logic
	return recommendations, nil
}

// GetScrapedRecipes returns all scraped recipes with optional filtering
func (s *ScrapedRecipeService) GetScrapedRecipes(filters models.RecommendationFilters) ([]models.ScrapedRecipeDB, error) {
	query, args := s.buildRecommendationQuery(filters)
	
	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query scraped recipes: %w", err)
	}
	defer rows.Close()

	// Empty (non-nil) slice so an empty result serializes to [] not null.
	recipes := []models.ScrapedRecipeDB{}
	for rows.Next() {
		var recipe models.ScrapedRecipeDB
		err := rows.Scan(
			&recipe.ID,
			&recipe.Title,
			&recipe.Description,
			&recipe.Instructions,
			&recipe.PrepTime,
			&recipe.CookTime,
			&recipe.Servings,
			&recipe.SourceURL,
			&recipe.SourceSite,
			&recipe.ScrapedAt,
			&recipe.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan recipe: %w", err)
		}
		recipes = append(recipes, recipe)
	}

	return recipes, rows.Err()
}

// GetScrapedRecipeByID returns a single scraped recipe by ID
func (s *ScrapedRecipeService) GetScrapedRecipeByID(id int) (*models.ScrapedRecipeDB, error) {
	query := `
		SELECT id, title, description, instructions, prep_time, cook_time, 
		       servings, source_url, source_site, scraped_at, created_at
		FROM simple_scraped_recipes 
		WHERE id = $1
	`
	
	var recipe models.ScrapedRecipeDB
	err := s.db.QueryRow(query, id).Scan(
		&recipe.ID,
		&recipe.Title,
		&recipe.Description,
		&recipe.Instructions,
		&recipe.PrepTime,
		&recipe.CookTime,
		&recipe.Servings,
		&recipe.SourceURL,
		&recipe.SourceSite,
		&recipe.ScrapedAt,
		&recipe.CreatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("recipe not found")
		}
		return nil, fmt.Errorf("failed to get recipe: %w", err)
	}
	
	return &recipe, nil
}

// buildRecommendationQuery builds a SQL query with filters
func (s *ScrapedRecipeService) buildRecommendationQuery(filters models.RecommendationFilters) (string, []interface{}) {
	query := `
		SELECT id, title, description, instructions, prep_time, cook_time, 
		       servings, source_url, source_site, scraped_at, created_at
		FROM simple_scraped_recipes 
		WHERE 1=1
	`
	
	args := []interface{}{}
	argCount := 0

	// Filter by prep time if specified
	if filters.MaxPrepTimeMinutes > 0 {
		argCount++
		query += fmt.Sprintf(" AND (prep_time IS NULL OR prep_time = '' OR extract_minutes_from_time(prep_time) <= $%d)", argCount)
		args = append(args, filters.MaxPrepTimeMinutes)
	}

	// Filter by cook time if specified  
	if filters.MaxCookTimeMinutes > 0 {
		argCount++
		query += fmt.Sprintf(" AND (cook_time IS NULL OR cook_time = '' OR extract_minutes_from_time(cook_time) <= $%d)", argCount)
		args = append(args, filters.MaxCookTimeMinutes)
	}

	// Filter by dietary restrictions (basic keyword matching for now)
	if len(filters.DietaryRestrictions) > 0 {
		for _, restriction := range filters.DietaryRestrictions {
			if restriction == "vegetarian" {
				query += " AND (LOWER(title) LIKE '%vegetarian%' OR LOWER(description) LIKE '%vegetarian%' OR LOWER(instructions) NOT LIKE '%meat%' AND LOWER(instructions) NOT LIKE '%chicken%' AND LOWER(instructions) NOT LIKE '%beef%')"
			}
			if restriction == "vegan" {
				query += " AND (LOWER(title) LIKE '%vegan%' OR LOWER(description) LIKE '%vegan%')"
			}
		}
	}

	// Filter by allergies (basic keyword matching for now)
	if len(filters.Allergies) > 0 {
		for _, allergy := range filters.Allergies {
			argCount++
			query += fmt.Sprintf(" AND (LOWER(title) NOT LIKE $%d AND LOWER(description) NOT LIKE $%d AND LOWER(instructions) NOT LIKE $%d)", argCount, argCount, argCount)
			allergyPattern := "%" + strings.ToLower(allergy) + "%"
			args = append(args, allergyPattern)
		}
	}

	// Order by most recently scraped first
	query += " ORDER BY scraped_at DESC"

	// Apply limit and offset
	if filters.Limit > 0 {
		argCount++
		query += fmt.Sprintf(" LIMIT $%d", argCount)
		args = append(args, filters.Limit)
	}

	if filters.Offset > 0 {
		argCount++
		query += fmt.Sprintf(" OFFSET $%d", argCount)
		args = append(args, filters.Offset)
	}

	return query, args
}

// scoreRecipe scores a recipe based on user preferences
func (s *ScrapedRecipeService) scoreRecipe(recipe models.ScrapedRecipeDB, userPrefs *models.UserPreferencesEnhanced, filters models.RecommendationFilters) (float64, string) {
	score := 1.0
	reasons := []string{}

	// Score based on prep time preference
	prepMinutes := s.extractMinutesFromTime(recipe.PrepTime)
	if prepMinutes > 0 && prepMinutes <= userPrefs.MaxPrepTimeMinutes {
		score += 0.3
		if prepMinutes <= 15 {
			reasons = append(reasons, "Quick to prepare")
			score += 0.2
		}
	}

	// Score based on cooking skill level
	cookMinutes := s.extractMinutesFromTime(recipe.CookTime)
	complexity := s.estimateComplexity(recipe.Instructions, prepMinutes, cookMinutes)
	
	switch userPrefs.CookingSkillLevel {
	case "beginner":
		if complexity <= 2 {
			score += 0.4
			reasons = append(reasons, "Beginner-friendly")
		}
	case "intermediate", "medium":
		if complexity <= 3 {
			score += 0.3
			reasons = append(reasons, "Perfect skill match")
		}
	case "advanced":
		if complexity >= 3 {
			score += 0.2
			reasons = append(reasons, "Challenging recipe")
		}
	}

	// Boost score for popular keywords
	title := strings.ToLower(recipe.Title)
	description := strings.ToLower(recipe.Description)
	
	if strings.Contains(title, "classic") || strings.Contains(description, "classic") {
		score += 0.1
		reasons = append(reasons, "Classic recipe")
	}
	
	if strings.Contains(title, "healthy") || strings.Contains(description, "healthy") {
		score += 0.15
		reasons = append(reasons, "Healthy choice")
	}

	if strings.Contains(title, "quick") || strings.Contains(title, "easy") {
		score += 0.1
		reasons = append(reasons, "Quick and easy")
	}

	// Default reason if no specific matches
	if len(reasons) == 0 {
		reasons = append(reasons, "Popular recipe")
	}

	return score, strings.Join(reasons, ", ")
}

// extractMinutesFromTime extracts minutes from time strings like "15 minutes", "1 hour 30 minutes"
func (s *ScrapedRecipeService) extractMinutesFromTime(timeStr string) int {
	if timeStr == "" {
		return 0
	}
	
	// Remove common words and normalize
	timeStr = strings.ToLower(timeStr)
	timeStr = strings.ReplaceAll(timeStr, "minutes", "")
	timeStr = strings.ReplaceAll(timeStr, "minute", "")
	timeStr = strings.ReplaceAll(timeStr, "mins", "")
	timeStr = strings.ReplaceAll(timeStr, "min", "")
	timeStr = strings.ReplaceAll(timeStr, "hours", "")
	timeStr = strings.ReplaceAll(timeStr, "hour", "")
	timeStr = strings.ReplaceAll(timeStr, "hrs", "")
	timeStr = strings.ReplaceAll(timeStr, "hr", "")
	timeStr = strings.TrimSpace(timeStr)
	
	// Extract numbers
	re := regexp.MustCompile(`\d+`)
	matches := re.FindAllString(timeStr, -1)
	
	if len(matches) == 0 {
		return 0
	}
	
	// If we have one number, assume it's minutes
	if len(matches) == 1 {
		minutes, _ := strconv.Atoi(matches[0])
		return minutes
	}
	
	// If we have two numbers, assume first is hours, second is minutes
	if len(matches) == 2 {
		hours, _ := strconv.Atoi(matches[0])
		minutes, _ := strconv.Atoi(matches[1])
		return hours*60 + minutes
	}
	
	// Default to first number as minutes
	minutes, _ := strconv.Atoi(matches[0])
	return minutes
}

// estimateComplexity estimates recipe complexity on a scale of 1-5
func (s *ScrapedRecipeService) estimateComplexity(instructions string, prepMinutes, cookMinutes int) int {
	complexity := 1
	
	// Base complexity on total time
	totalMinutes := prepMinutes + cookMinutes
	if totalMinutes > 120 {
		complexity += 2
	} else if totalMinutes > 60 {
		complexity += 1
	}
	
	// Add complexity based on instruction length and keywords
	instructionCount := len(strings.Split(instructions, "\n"))
	if instructionCount > 8 {
		complexity += 1
	}
	
	// Look for complex cooking techniques
	lowerInstructions := strings.ToLower(instructions)
	complexKeywords := []string{"fold", "whisk", "sauté", "braise", "poach", "julienne", "brunoise", "flambé", "reduce", "emulsify"}
	
	for _, keyword := range complexKeywords {
		if strings.Contains(lowerInstructions, keyword) {
			complexity += 1
			break
		}
	}
	
	// Cap at 5
	if complexity > 5 {
		complexity = 5
	}
	
	return complexity
}

// getUserPreferences gets user preferences (simplified version)
func (s *ScrapedRecipeService) getUserPreferences(userID string) (*models.UserPreferencesEnhanced, error) {
	// For now, return default preferences since we don't have user preference table set up
	// In a real implementation, this would query the user_preferences table
	return &models.UserPreferencesEnhanced{
		MaxPrepTimeMinutes: 45,
		CookingSkillLevel:  "medium",
		FamilySize:         2,
		DietaryRestrictions: models.JSONB{},
		Allergies:          models.JSONB{},
	}, nil
}

// GetRecommendationStats returns statistics about available scraped recipes
func (s *ScrapedRecipeService) GetRecommendationStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})
	
	// Total count
	var totalCount int
	err := s.db.QueryRow("SELECT COUNT(*) FROM simple_scraped_recipes").Scan(&totalCount)
	if err != nil {
		return nil, err
	}
	stats["total_recipes"] = totalCount
	
	// By source site
	rows, err := s.db.Query("SELECT source_site, COUNT(*) FROM simple_scraped_recipes GROUP BY source_site")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	sourceCounts := make(map[string]int)
	for rows.Next() {
		var source string
		var count int
		if err := rows.Scan(&source, &count); err != nil {
			return nil, err
		}
		sourceCounts[source] = count
	}
	stats["by_source"] = sourceCounts
	
	// Recent additions (last 7 days)
	var recentCount int
	err = s.db.QueryRow("SELECT COUNT(*) FROM simple_scraped_recipes WHERE scraped_at > $1", time.Now().AddDate(0, 0, -7)).Scan(&recentCount)
	if err != nil {
		return nil, err
	}
	stats["recent_additions"] = recentCount
	
	return stats, nil
} 