package services

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"

	"mealplanner/app/models"
)

type USDAService struct {
	APIKey  string
	BaseURL string
}

func NewUSDAService(apiKey string) *USDAService {
	return &USDAService{
		APIKey:  apiKey,
		BaseURL: "https://api.nal.usda.gov/fdc/v1",
	}
}

// SearchFood searches for food in USDA database
func (s *USDAService) SearchFood(query string, limit int) (*models.USDAFoodSearchResponse, error) {
	if s.APIKey == "" {
		return nil, fmt.Errorf("USDA API key not configured")
	}

	// Build URL with parameters
	baseURL := fmt.Sprintf("%s/foods/search", s.BaseURL)
	params := url.Values{}
	params.Add("query", query)
	params.Add("pageSize", fmt.Sprintf("%d", limit))
	params.Add("api_key", s.APIKey)

	fullURL := fmt.Sprintf("%s?%s", baseURL, params.Encode())

	// Make HTTP request
	resp, err := http.Get(fullURL)
	if err != nil {
		return nil, fmt.Errorf("failed to make request to USDA API: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read USDA API response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		// Try to parse error response
		var errorResponse struct {
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		
		if err := json.Unmarshal(bodyBytes, &errorResponse); err == nil && errorResponse.Error.Code != "" {
			switch errorResponse.Error.Code {
			case "OVER_RATE_LIMIT":
				return nil, fmt.Errorf("USDA API rate limit exceeded. Please wait a few minutes before trying again")
			case "API_KEY_INVALID":
				return nil, fmt.Errorf("USDA API key is invalid. Please check your API key configuration")
			case "API_KEY_MISSING":
				return nil, fmt.Errorf("USDA API key is missing. Please configure your API key")
			default:
				return nil, fmt.Errorf("USDA API error (%s): %s", errorResponse.Error.Code, errorResponse.Error.Message)
			}
		}
		
		// Fallback error message if we can't parse the error
		return nil, fmt.Errorf("USDA API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// Parse successful response
	var searchResponse models.USDAFoodSearchResponse
	if err := json.Unmarshal(bodyBytes, &searchResponse); err != nil {
		return nil, fmt.Errorf("failed to decode USDA API response: %w", err)
	}

	return &searchResponse, nil
}

// GetFoodDetails gets detailed information about a specific food item
func (s *USDAService) GetFoodDetails(fdcID int) (*models.USDAFoodDetailsResponse, error) {
	if s.APIKey == "" {
		return nil, fmt.Errorf("USDA API key not configured - please set USDA_API_KEY environment variable")
	}

	// Build URL
	url := fmt.Sprintf("%s/food/%d?api_key=%s", s.BaseURL, fdcID, s.APIKey)

	// Make HTTP request
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to make request to USDA API: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read USDA API response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		// Try to parse error response
		var errorResponse struct {
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		
		if err := json.Unmarshal(bodyBytes, &errorResponse); err == nil && errorResponse.Error.Code != "" {
			switch errorResponse.Error.Code {
			case "OVER_RATE_LIMIT":
				return nil, fmt.Errorf("USDA API rate limit exceeded. Please wait a few minutes before trying again")
			case "API_KEY_INVALID":
				return nil, fmt.Errorf("USDA API key is invalid. Please check your API key configuration")
			case "API_KEY_MISSING":
				return nil, fmt.Errorf("USDA API key is missing. Please configure your API key")
			default:
				return nil, fmt.Errorf("USDA API error (%s): %s", errorResponse.Error.Code, errorResponse.Error.Message)
			}
		}
		
		// Fallback error message if we can't parse the error
		return nil, fmt.Errorf("USDA API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// Parse successful response
	var food models.USDAFoodDetailsResponse
	if err := json.Unmarshal(bodyBytes, &food); err != nil {
		return nil, fmt.Errorf("failed to decode USDA API response: %w", err)
	}

	return &food, nil
}

// ConvertUSDAFoodToIngredient converts USDA food data to our ingredient model (for search results)
func (s *USDAService) ConvertUSDAFoodToIngredient(usdaFood *models.USDAFood) *models.Ingredient {
	ingredient := &models.Ingredient{
		Name:        usdaFood.Description,
		FDCID:       &usdaFood.FDCID,
		Description: usdaFood.Description,
		Category:    s.categorizeFood(usdaFood.Description),
	}

	// Extract nutritional information from nutrients
	for _, nutrient := range usdaFood.FoodNutrients {
		switch nutrient.NutrientID {
		case 1008: // Energy (calories)
			ingredient.CaloriesPer100g = &nutrient.Value
		case 1003: // Protein
			ingredient.ProteinPer100g = &nutrient.Value
		case 1004: // Total lipid (fat)
			ingredient.FatPer100g = &nutrient.Value
		case 1005: // Carbohydrate, by difference
			ingredient.CarbsPer100g = &nutrient.Value
		case 1079: // Fiber, total dietary
			ingredient.FiberPer100g = &nutrient.Value
		case 1093: // Sodium, Na
			ingredient.SodiumPer100g = &nutrient.Value
		}
	}

	return ingredient
}

// ConvertUSDAFoodDetailsToIngredient converts USDA food details data to our ingredient model (for import by FDC ID)
func (s *USDAService) ConvertUSDAFoodDetailsToIngredient(usdaFood *models.USDAFoodDetailsResponse) *models.Ingredient {
	ingredient := &models.Ingredient{
		Name:        usdaFood.Description,
		FDCID:       &usdaFood.FDCID,
		Description: usdaFood.Description,
		Category:    s.categorizeFood(usdaFood.Description),
	}

	// Extract nutritional information from nutrients (different structure for food details)
	fmt.Printf("DEBUG: Processing %d nutrients for %s\n", len(usdaFood.FoodNutrients), ingredient.Name)
	for _, nutrient := range usdaFood.FoodNutrients {
		switch nutrient.Nutrient.ID {
		case 1008: // Energy (calories)
			fmt.Printf("DEBUG: Setting calories to %f\n", nutrient.Amount)
			calories := nutrient.Amount
			ingredient.CaloriesPer100g = &calories
		case 1003: // Protein
			fmt.Printf("DEBUG: Setting protein to %f\n", nutrient.Amount)
			protein := nutrient.Amount
			ingredient.ProteinPer100g = &protein
		case 1004: // Total lipid (fat)
			fmt.Printf("DEBUG: Setting fat to %f\n", nutrient.Amount)
			fat := nutrient.Amount
			ingredient.FatPer100g = &fat
		case 1005: // Carbohydrate, by difference
			fmt.Printf("DEBUG: Setting carbs to %f\n", nutrient.Amount)
			carbs := nutrient.Amount
			ingredient.CarbsPer100g = &carbs
		case 1079: // Fiber, total dietary
			fmt.Printf("DEBUG: Setting fiber to %f\n", nutrient.Amount)
			fiber := nutrient.Amount
			ingredient.FiberPer100g = &fiber
		case 1093: // Sodium, Na
			fmt.Printf("DEBUG: Setting sodium to %f\n", nutrient.Amount)
			sodium := nutrient.Amount
			ingredient.SodiumPer100g = &sodium
		}
	}
	
	// Debug final values
	fmt.Printf("DEBUG: Final ingredient values - Calories: %v, Protein: %v, Fat: %v\n", 
		ingredient.CaloriesPer100g, ingredient.ProteinPer100g, ingredient.FatPer100g)

	return ingredient
}

// categorizeFood attempts to categorize food based on description
func (s *USDAService) categorizeFood(description string) string {
	desc := strings.ToLower(description)

	// Protein sources
	if strings.Contains(desc, "chicken") || strings.Contains(desc, "beef") || 
	   strings.Contains(desc, "fish") || strings.Contains(desc, "salmon") ||
	   strings.Contains(desc, "tuna") || strings.Contains(desc, "turkey") ||
	   strings.Contains(desc, "pork") || strings.Contains(desc, "egg") ||
	   strings.Contains(desc, "beans") || strings.Contains(desc, "lentil") {
		return "Protein"
	}

	// Vegetables
	if strings.Contains(desc, "broccoli") || strings.Contains(desc, "spinach") ||
	   strings.Contains(desc, "carrot") || strings.Contains(desc, "pepper") ||
	   strings.Contains(desc, "tomato") || strings.Contains(desc, "onion") ||
	   strings.Contains(desc, "lettuce") || strings.Contains(desc, "cabbage") {
		return "Vegetable"
	}

	// Fruits
	if strings.Contains(desc, "apple") || strings.Contains(desc, "banana") ||
	   strings.Contains(desc, "orange") || strings.Contains(desc, "berry") ||
	   strings.Contains(desc, "grape") || strings.Contains(desc, "avocado") ||
	   strings.Contains(desc, "lemon") || strings.Contains(desc, "lime") {
		return "Fruit"
	}

	// Grains
	if strings.Contains(desc, "rice") || strings.Contains(desc, "bread") ||
	   strings.Contains(desc, "pasta") || strings.Contains(desc, "quinoa") ||
	   strings.Contains(desc, "oat") || strings.Contains(desc, "wheat") ||
	   strings.Contains(desc, "barley") || strings.Contains(desc, "cereal") {
		return "Grain"
	}

	// Dairy
	if strings.Contains(desc, "milk") || strings.Contains(desc, "cheese") ||
	   strings.Contains(desc, "yogurt") || strings.Contains(desc, "butter") ||
	   strings.Contains(desc, "cream") {
		return "Dairy"
	}

	// Oils and fats
	if strings.Contains(desc, "oil") || strings.Contains(desc, "fat") {
		return "Oil"
	}

	// Seasonings and spices
	if strings.Contains(desc, "salt") || strings.Contains(desc, "pepper") ||
	   strings.Contains(desc, "spice") || strings.Contains(desc, "herb") ||
	   strings.Contains(desc, "garlic") || strings.Contains(desc, "ginger") {
		return "Seasoning"
	}

	return "Other"
} 