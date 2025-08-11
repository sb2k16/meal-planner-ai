package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	
	"mealplanner/internal/models"
)

type LLMService struct {
	apiKey   string
	baseURL  string
	usdaService *USDAService
}

func NewLLMService(usdaService *USDAService) *LLMService {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		// For development, we'll provide a mock implementation
		fmt.Println("Warning: OPENAI_API_KEY not set, using mock LLM responses")
	}
	
	return &LLMService{
		apiKey:      apiKey,
		baseURL:     "https://api.openai.com/v1/chat/completions",
		usdaService: usdaService,
	}
}

// RecipeGenerationRequest represents the input for recipe generation
type RecipeGenerationRequest struct {
	Prompt              string   `json:"prompt"`
	DietaryRestrictions []string `json:"dietary_restrictions,omitempty"`
	PreferredCuisine    string   `json:"cuisine_preference,omitempty"`
	ServingSize         int      `json:"servings,omitempty"`
	MaxPrepTime         int      `json:"max_prep_time,omitempty"`
	DifficultyLevel     string   `json:"difficulty_level,omitempty"`
	
	// New personalization fields
	VoiceStyle          string            `json:"voice_style,omitempty"`          // chef_pro, food_blogger, home_cook, funny_friend, grandma_voice
	UserPreferences     UserPreferences   `json:"user_preferences,omitempty"`     // User context and preferences
	IncludeChefNotes    bool             `json:"include_chef_notes,omitempty"`   // Add story intros/tips
	IncludeVariations   bool             `json:"include_variations,omitempty"`   // Add ingredient swaps and tips
	Occasion            string           `json:"occasion,omitempty"`             // weeknight, date_night, family_dinner, meal_prep
}

// UserPreferences represents user context for personalization
type UserPreferences struct {
	CookingLevel        string   `json:"cooking_level,omitempty"`        // beginner, intermediate, advanced
	AvoidedIngredients  []string `json:"avoided_ingredients,omitempty"`  // cilantro, mushrooms, etc.
	FavoriteIngredients []string `json:"favorite_ingredients,omitempty"` // bell peppers, cumin, etc.
	MealPrepStyle       string   `json:"meal_prep_style,omitempty"`      // batch_cook, fresh_daily, leftovers_friendly
	KitchenEquipment    []string `json:"kitchen_equipment,omitempty"`    // slow_cooker, air_fryer, etc.
	TimeOfDay           string   `json:"time_of_day,omitempty"`          // breakfast, lunch, dinner, snack
	FamilySize          int      `json:"family_size,omitempty"`          // Number of people usually cooking for
}

// RecipeGenerationResponse represents the structured recipe response
type RecipeGenerationResponse struct {
	Title           string                     `json:"title"`
	Description     string                     `json:"description"`
	CuisineName     string                     `json:"cuisine_name"`
	Instructions    []string                   `json:"instructions"`
	PrepTime        int                        `json:"prep_time_minutes"`
	CookTime        int                        `json:"cook_time_minutes"`
	Servings        int                        `json:"servings"`
	DifficultyLevel string                     `json:"difficulty_level"`
	Ingredients     []GeneratedIngredient      `json:"ingredients"`
	Tags            []string                   `json:"tags"`
	Nutrition       NutritionSummary           `json:"nutrition"`
	
	// New personalization fields
	ChefNotes       string                     `json:"chef_notes,omitempty"`        // Friendly intro about why this recipe is great
	Variations      []RecipeVariation          `json:"variations,omitempty"`        // Alternative ingredients and cooking tips
	PersonalTips    []string                   `json:"personal_tips,omitempty"`     // Contextual cooking advice
	StorageAdvice   string                     `json:"storage_advice,omitempty"`    // How to store leftovers, meal prep tips
}

// RecipeVariation represents alternative ingredients or cooking methods
type RecipeVariation struct {
	Type        string `json:"type"`        // ingredient_swap, cooking_method, dietary_adaptation
	Title       string `json:"title"`       // "Make it Vegan", "Air Fryer Version", "Spice it Up"
	Description string `json:"description"` // Detailed explanation of the variation
}

type GeneratedIngredient struct {
	Name     string  `json:"name"`
	Quantity float64 `json:"quantity"`
	Unit     string  `json:"unit"`
	Notes    string  `json:"notes,omitempty"`
	FDCID    *int    `json:"fdc_id,omitempty"`
}

type NutritionSummary struct {
	TotalCalories *float64 `json:"total_calories"`
	TotalProtein  *float64 `json:"total_protein"`
	TotalFat      *float64 `json:"total_fat"`
	TotalCarbs    *float64 `json:"total_carbs"`
	TotalFiber    *float64 `json:"total_fiber"`
	TotalSodium   *float64 `json:"total_sodium"`
}

// RecipeMetadata represents the initial extraction from Step 1
type RecipeMetadata struct {
	Title           string                `json:"title"`
	Description     string                `json:"description"`
	CuisineName     string                `json:"cuisine_name"`
	PrepTime        int                   `json:"prep_time_minutes"`
	CookTime        int                   `json:"cook_time_minutes"`
	Servings        int                   `json:"servings"`
	DifficultyLevel string                `json:"difficulty_level"`
	Ingredients     []GeneratedIngredient `json:"ingredients"`
	Tags            []string              `json:"tags"`
}

// OpenAI API structures
type OpenAIRequest struct {
	Model       string          `json:"model"`
	Messages    []OpenAIMessage `json:"messages"`
	Temperature float32         `json:"temperature"`
	MaxTokens   int             `json:"max_tokens"`
}

type OpenAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

// GenerateRecipe takes a natural language description and generates a structured recipe
func (s *LLMService) GenerateRecipe(req RecipeGenerationRequest) (*RecipeGenerationResponse, error) {
	// If no OpenAI API key, use enhanced mock implementation
	if s.apiKey == "" {
		return s.generateStructuredMockRecipe(req)
	}

	// Step 1: Extract recipe metadata (title, ingredients, tags)
	metadata, err := s.extractRecipeMetadata(req)
	if err != nil {
		return nil, fmt.Errorf("failed to extract recipe metadata: %w", err)
	}

	// Step 2: Generate detailed cooking steps with personalization
	steps, chefNotes, variations, err := s.generatePersonalizedCookingContent(metadata, req)
	if err != nil {
		return nil, fmt.Errorf("failed to generate cooking steps: %w", err)
	}

	// Step 3: Enrich ingredients via USDA API
	enrichedIngredients, err := s.enrichIngredients(metadata.Ingredients)
	if err != nil {
		fmt.Printf("Warning: Failed to enrich ingredients: %v\n", err)
		// Continue with extracted ingredients if USDA lookup fails
	} else {
		metadata.Ingredients = enrichedIngredients
	}

	// Step 4: Construct final recipe object
	finalRecipe := &RecipeGenerationResponse{
		Title:           metadata.Title,
		Description:     metadata.Description,
		CuisineName:     metadata.CuisineName,
		Instructions:    steps,
		PrepTime:        metadata.PrepTime,
		CookTime:        metadata.CookTime,
		Servings:        metadata.Servings,
		DifficultyLevel: metadata.DifficultyLevel,
		Ingredients:     metadata.Ingredients,
		Tags:            metadata.Tags,
		ChefNotes:       chefNotes,
		Variations:      variations,
	}

	// Step 5: Calculate nutrition summary
	nutrition := s.calculateNutrition(finalRecipe.Ingredients, finalRecipe.Servings)
	finalRecipe.Nutrition = nutrition

	// Step 6: Add storage advice based on meal prep preferences
	if req.UserPreferences.MealPrepStyle != "" || req.Occasion == "meal_prep" {
		finalRecipe.StorageAdvice = s.generateStorageAdvice(finalRecipe, req)
	}

	return finalRecipe, nil
}

// ProcessScrapedRecipe processes a scraped recipe using LLM to normalize and structure data
func (s *LLMService) ProcessScrapedRecipe(request models.ProcessingRequest) (*models.ProcessingResponse, error) {
	// If no OpenAI API key, use mock implementation
	if s.apiKey == "" {
		return s.generateMockProcessingResponse(request)
	}

	// Create the prompt for LLM processing
	prompt := s.createRecipeProcessingPrompt(request)
	
	// Call LLM API
	openAIRequest := OpenAIRequest{
		Model:       "gpt-4",
		Temperature: 0.3,
		MaxTokens:   4000,
		Messages: []OpenAIMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	response, err := s.callOpenAI(openAIRequest)
	if err != nil {
		return nil, fmt.Errorf("LLM processing failed: %w", err)
	}

	// Extract JSON from response
	jsonStr := s.extractJSONFromResponse(response)
	
	// Parse the structured response
	var processingResponse models.ProcessingResponse
	if err := json.Unmarshal([]byte(jsonStr), &processingResponse); err != nil {
		return nil, fmt.Errorf("failed to parse LLM response: %w", err)
	}

	return &processingResponse, nil
}

// createRecipeProcessingPrompt creates a detailed prompt for recipe processing
func (s *LLMService) createRecipeProcessingPrompt(request models.ProcessingRequest) string {
	ingredientsJSON, _ := json.Marshal(request.RawIngredients)
	instructionsJSON, _ := json.Marshal(request.RawInstructions)

	prompt := fmt.Sprintf(`You are a professional recipe analyzer and data normalizer. Process the following scraped recipe data and return a structured JSON response with normalized and enriched information.

## Input Recipe Data:
**Title:** %s
**Description:** %s
**Source Site:** %s
**Raw Ingredients:** %s
**Raw Instructions:** %s

## Your Task:
Analyze this recipe and provide a structured response with the following information:

### 1. Structured Ingredients
Convert each raw ingredient into a normalized format with:
- name: Clean ingredient name (remove quantities, focus on the actual ingredient)
- amount: Numeric quantity (convert fractions to decimals, e.g., "1/2" → 0.5)
- unit: Standardized unit (cup, tbsp, tsp, lb, oz, g, kg, etc.)
- notes: Any preparation notes (diced, chopped, optional, etc.)
- category: Ingredient category (protein, vegetable, dairy, grain, spice, etc.)

### 2. Structured Instructions
Convert raw instruction steps into:
- step_number: Sequential step number
- action: Primary cooking action (mix, bake, sauté, etc.)
- details: Full step description
- duration: Time in minutes if mentioned (null if not specified)
- temperature: Temperature in Fahrenheit if mentioned (null if not specified)

### 3. Recipe Analysis
Extract and infer:
- dietary_tags: Array of dietary classifications (vegan, vegetarian, gluten-free, dairy-free, keto, low-carb, high-protein, etc.)
- cuisine_type: Primary cuisine type (Italian, Mexican, Indian, American, etc.)
- difficulty_level: Easy, Medium, or Hard
- estimated_calories: Estimated calories per serving (reasonable estimate)
- estimated_protein: Estimated protein per serving in grams
- estimated_fat: Estimated fat per serving in grams  
- estimated_carbs: Estimated carbs per serving in grams
- processing_notes: Any notes about the processing or data quality

## Output Format:
Return ONLY a valid JSON object with this exact structure:

{
  "structured_ingredients": [
    {
      "name": "string",
      "amount": number,
      "unit": "string", 
      "notes": "string",
      "category": "string"
    }
  ],
  "structured_instructions": [
    {
      "step_number": number,
      "action": "string",
      "details": "string",
      "duration": number or null,
      "temperature": number or null
    }
  ],
  "dietary_tags": ["string"],
  "cuisine_type": "string",
  "difficulty_level": "Easy|Medium|Hard",
  "estimated_calories": number or null,
  "estimated_protein": number or null,
  "estimated_fat": number or null,
  "estimated_carbs": number or null,
  "processing_notes": "string"
}

## Guidelines:
- Be conservative with dietary tags (only include if clearly applicable)
- Convert all measurements to common US units when possible
- If ingredient amounts are unclear, make reasonable estimates
- For difficulty: Easy (< 30 min, simple techniques), Medium (30-60 min, moderate skills), Hard (> 60 min, advanced techniques)
- Provide nutritional estimates based on typical ingredient values
- If source site is known, factor in typical cuisine/dietary patterns from that site

Analyze the recipe now and return the structured JSON:`, 
		request.Title, 
		request.Description, 
		request.SourceSite, 
		string(ingredientsJSON), 
		string(instructionsJSON))

	return prompt
}

// generateMockProcessingResponse creates a mock response for development when no API key is available
func (s *LLMService) generateMockProcessingResponse(request models.ProcessingRequest) (*models.ProcessingResponse, error) {
	// Parse raw ingredients into structured format (simplified mock)
	var structuredIngredients []models.StructuredIngredient
	for _, rawIngredient := range request.RawIngredients {
		if rawIngredient == "" {
			continue
		}
		
		// Simple parsing for mock
		ingredient := models.StructuredIngredient{
			Name:     strings.TrimSpace(rawIngredient),
			Amount:   1.0,
			Unit:     "unit",
			Notes:    "",
			Category: "ingredient",
		}
		
		// Try to extract basic info
		if strings.Contains(strings.ToLower(rawIngredient), "cup") {
			ingredient.Unit = "cup"
		} else if strings.Contains(strings.ToLower(rawIngredient), "tbsp") {
			ingredient.Unit = "tbsp"
		} else if strings.Contains(strings.ToLower(rawIngredient), "tsp") {
			ingredient.Unit = "tsp"
		}
		
		structuredIngredients = append(structuredIngredients, ingredient)
	}

	// Parse raw instructions into structured format
	var structuredInstructions []models.StructuredInstruction
	for i, rawInstruction := range request.RawInstructions {
		if rawInstruction == "" {
			continue
		}
		
		instruction := models.StructuredInstruction{
			StepNumber: i + 1,
			Action:     "prepare",
			Details:    strings.TrimSpace(rawInstruction),
		}
		
		// Try to extract cooking actions
		lowerInstruction := strings.ToLower(rawInstruction)
		if strings.Contains(lowerInstruction, "bake") || strings.Contains(lowerInstruction, "oven") {
			instruction.Action = "bake"
		} else if strings.Contains(lowerInstruction, "mix") || strings.Contains(lowerInstruction, "stir") {
			instruction.Action = "mix"
		} else if strings.Contains(lowerInstruction, "cook") || strings.Contains(lowerInstruction, "heat") {
			instruction.Action = "cook"
		}
		
		structuredInstructions = append(structuredInstructions, instruction)
	}

	// Generate basic dietary tags and cuisine type
	var dietaryTags []string
	cuisineType := "American"
	
	// Simple heuristics for mock
	combinedText := strings.ToLower(request.Title + " " + request.Description)
	if strings.Contains(combinedText, "vegan") {
		dietaryTags = append(dietaryTags, "vegan")
	}
	if strings.Contains(combinedText, "vegetarian") {
		dietaryTags = append(dietaryTags, "vegetarian")
	}
	if strings.Contains(combinedText, "gluten") {
		dietaryTags = append(dietaryTags, "gluten-free")
	}
	
	// Simple cuisine detection
	if strings.Contains(combinedText, "italian") || strings.Contains(combinedText, "pasta") {
		cuisineType = "Italian"
	} else if strings.Contains(combinedText, "mexican") || strings.Contains(combinedText, "taco") {
		cuisineType = "Mexican"
	} else if strings.Contains(combinedText, "indian") || strings.Contains(combinedText, "curry") {
		cuisineType = "Indian"
	} else if strings.Contains(combinedText, "chinese") || strings.Contains(combinedText, "stir") {
		cuisineType = "Chinese"
	}

	response := &models.ProcessingResponse{
		StructuredIngredients:  structuredIngredients,
		StructuredInstructions: structuredInstructions,
		DietaryTags:           dietaryTags,
		CuisineType:           cuisineType,
		DifficultyLevel:       "Medium",
		EstimatedCalories:     toIntPtr(400),
		EstimatedProtein:      toFloatPtr(20.0),
		EstimatedFat:          toFloatPtr(15.0),
		EstimatedCarbs:        toFloatPtr(45.0),
		ProcessingNotes:       "Mock processing - generated for development",
	}

	return response, nil
}

// Helper functions
func toIntPtr(i int) *int {
	return &i
}

func toFloatPtr(f float64) *float64 {
	return &f
}

// generatePersonalizedCookingContent generates instructions along with chef notes and variations
func (s *LLMService) generatePersonalizedCookingContent(metadata *RecipeMetadata, req RecipeGenerationRequest) ([]string, string, []RecipeVariation, error) {
	prompt := s.buildStepsGenerationPrompt(metadata, req)
	
	openAIReq := OpenAIRequest{
		Model:       "gpt-3.5-turbo",
		Temperature: 0.8,
		MaxTokens:   2000,
		Messages: []OpenAIMessage{
			{
				Role:    "system",
				Content: s.buildPersonalizedSystemPrompt(req) + " Generate engaging, personalized cooking instructions with sensory details and helpful tips.",
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	responseBody, err := s.callOpenAI(openAIReq)
	if err != nil {
		return nil, "", nil, err
	}

	// Parse the response - could be JSON with instructions, chef_notes, and variations
	type PersonalizedResponse struct {
		Instructions []string          `json:"instructions"`
		ChefNotes    string           `json:"chef_notes,omitempty"`
		Variations   []RecipeVariation `json:"variations,omitempty"`
		PersonalTips []string         `json:"personal_tips,omitempty"`
	}

	var response PersonalizedResponse
	if err := json.Unmarshal([]byte(responseBody), &response); err != nil {
		// If JSON parsing fails, try to extract JSON from the response
		jsonStr := s.extractJSONFromResponse(responseBody)
		if err := json.Unmarshal([]byte(jsonStr), &response); err != nil {
			// Fallback: try to parse as simple string array for backward compatibility
			var steps []string
			if err := json.Unmarshal([]byte(jsonStr), &steps); err != nil {
				return nil, "", nil, fmt.Errorf("failed to parse LLM response as JSON: %w", err)
			}
			return steps, "", nil, nil
		}
	}

	return response.Instructions, response.ChefNotes, response.Variations, nil
}

// generateStorageAdvice creates meal prep and storage suggestions
func (s *LLMService) generateStorageAdvice(recipe *RecipeGenerationResponse, req RecipeGenerationRequest) string {
	switch req.UserPreferences.MealPrepStyle {
	case "batch_cook":
		return fmt.Sprintf("This %s stores beautifully! Make a double batch and freeze half for busy days. Reheat gently to preserve the flavors.", recipe.Title)
	case "leftovers_friendly":
		return "Leftovers taste even better the next day as the flavors meld. Store in the fridge for up to 3 days and reheat gently."
	case "fresh_daily":
		return "Best enjoyed fresh, but components can be prepped ahead. Store prepped ingredients separately and combine just before cooking."
	default:
		return "Store leftovers in the refrigerator for up to 3 days. This recipe is great for meal prep!"
	}
}

// extractRecipeComponents uses LLM to parse natural language into structured recipe
func (s *LLMService) extractRecipeComponents(req RecipeGenerationRequest) (*RecipeGenerationResponse, error) {
	prompt := s.buildRecipeExtractionPrompt(req)
	
	openAIReq := OpenAIRequest{
		Model:       "gpt-3.5-turbo",
		Temperature: 0.7,
		MaxTokens:   2000,
		Messages: []OpenAIMessage{
			{
				Role:    "system",
				Content: "You are a professional chef and recipe developer. Extract structured recipe information from natural language descriptions. Respond only with valid JSON.",
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	responseBody, err := s.callOpenAI(openAIReq)
	if err != nil {
		return nil, err
	}

	// Parse the JSON response
	var recipe RecipeGenerationResponse
	if err := json.Unmarshal([]byte(responseBody), &recipe); err != nil {
		// If JSON parsing fails, try to extract JSON from the response
		jsonStr := s.extractJSONFromResponse(responseBody)
		if err := json.Unmarshal([]byte(jsonStr), &recipe); err != nil {
			return nil, fmt.Errorf("failed to parse LLM response as JSON: %w", err)
		}
	}

	return &recipe, nil
}

func (s *LLMService) buildRecipeExtractionPrompt(req RecipeGenerationRequest) string {
	servings := req.ServingSize
	if servings <= 0 {
		servings = 4
	}

	difficulty := req.DifficultyLevel
	if difficulty == "" {
		difficulty = "medium"
	}

	prompt := fmt.Sprintf(`Extract recipe information from this description: "%s"

Requirements:
- Servings: %d
- Difficulty: %s`, req.Prompt, servings, difficulty)

	if req.PreferredCuisine != "" {
		prompt += fmt.Sprintf("\n- Cuisine: %s", req.PreferredCuisine)
	}

	if len(req.DietaryRestrictions) > 0 {
		prompt += fmt.Sprintf("\n- Dietary restrictions: %s", strings.Join(req.DietaryRestrictions, ", "))
	}

	if req.MaxPrepTime > 0 {
		prompt += fmt.Sprintf("\n- Max prep time: %d minutes", req.MaxPrepTime)
	}

	prompt += `

Return a JSON object with this exact structure:
{
  "title": "Recipe Name",
  "description": "Brief description of the dish",
  "cuisine_name": "Cuisine type (e.g., Italian, Indian, Mexican)",
  "instructions": ["Step 1", "Step 2", "Step 3"],
  "prep_time_minutes": 15,
  "cook_time_minutes": 25,
  "servings": 4,
  "difficulty_level": "easy|medium|hard",
  "ingredients": [
    {
      "name": "ingredient name (simplified for USDA lookup)",
      "quantity": 1.5,
      "unit": "cup",
      "notes": "optional preparation notes"
    }
  ],
  "tags": ["tag1", "tag2", "tag3"]
}

Important guidelines:
- Use common ingredient names (e.g., "chickpeas" not "garbanzo beans")
- Use standard cooking units (cup, tablespoon, teaspoon, pound, ounce)
- Include 3-5 relevant tags for categorization
- Make instructions clear and step-by-step
- Keep prep/cook times realistic`

	return prompt
}

func (s *LLMService) callOpenAI(req OpenAIRequest) (string, error) {
	jsonData, err := json.Marshal(req)
	if err != nil {
		return "", err
	}

	httpReq, err := http.NewRequest("POST", s.baseURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+s.apiKey)

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("OpenAI API error: %s", string(body))
	}

	var openAIResp OpenAIResponse
	if err := json.Unmarshal(body, &openAIResp); err != nil {
		return "", err
	}

	if len(openAIResp.Choices) == 0 {
		return "", fmt.Errorf("no response from OpenAI")
	}

	return openAIResp.Choices[0].Message.Content, nil
}

func (s *LLMService) extractJSONFromResponse(response string) string {
	// Find JSON object in the response
	re := regexp.MustCompile(`\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}`)
	matches := re.FindAllString(response, -1)
	
	for _, match := range matches {
		// Try to validate it's proper JSON
		var test interface{}
		if json.Unmarshal([]byte(match), &test) == nil {
			return match
		}
	}
	
	return response // Return original if no valid JSON found
}

// extractRecipeMetadata - Step 1: Extract title, ingredients, and tags
func (s *LLMService) extractRecipeMetadata(req RecipeGenerationRequest) (*RecipeMetadata, error) {
	prompt := s.buildMetadataExtractionPrompt(req)
	
	openAIReq := OpenAIRequest{
		Model:       "gpt-3.5-turbo",
		Temperature: 0.7,
		MaxTokens:   1500,
		Messages: []OpenAIMessage{
			{
				Role:    "system",
				Content: s.buildPersonalizedSystemPrompt(req) + " Extract structured recipe information from natural language descriptions. Respond only with valid JSON.",
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	responseBody, err := s.callOpenAI(openAIReq)
	if err != nil {
		return nil, err
	}

	// Parse the JSON response
	var metadata RecipeMetadata
	if err := json.Unmarshal([]byte(responseBody), &metadata); err != nil {
		// If JSON parsing fails, try to extract JSON from the response
		jsonStr := s.extractJSONFromResponse(responseBody)
		if err := json.Unmarshal([]byte(jsonStr), &metadata); err != nil {
			return nil, fmt.Errorf("failed to parse LLM response as JSON: %w", err)
		}
	}

	return &metadata, nil
}

// generateCookingSteps - Step 2: Generate detailed cooking instructions
func (s *LLMService) generateCookingSteps(metadata *RecipeMetadata, req RecipeGenerationRequest) ([]string, error) {
	prompt := s.buildStepsGenerationPrompt(metadata, req)
	
	openAIReq := OpenAIRequest{
		Model:       "gpt-3.5-turbo",
		Temperature: 0.8, // Slightly higher for more creative, personalized instructions
		MaxTokens:   2000,
		Messages: []OpenAIMessage{
			{
				Role:    "system",
				Content: s.buildPersonalizedSystemPrompt(req) + " Generate engaging, personalized cooking instructions with sensory details and helpful tips.",
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	responseBody, err := s.callOpenAI(openAIReq)
	if err != nil {
		return nil, err
	}

	// Parse the response - could be JSON with instructions, chef_notes, and variations
	type StepsResponse struct {
		Instructions []string          `json:"instructions"`
		ChefNotes    string           `json:"chef_notes,omitempty"`
		Variations   []RecipeVariation `json:"variations,omitempty"`
	}

	var response StepsResponse
	if err := json.Unmarshal([]byte(responseBody), &response); err != nil {
		// If JSON parsing fails, try to extract JSON from the response
		jsonStr := s.extractJSONFromResponse(responseBody)
		if err := json.Unmarshal([]byte(jsonStr), &response); err != nil {
			// Fallback: try to parse as simple string array for backward compatibility
			var steps []string
			if err := json.Unmarshal([]byte(jsonStr), &steps); err != nil {
				return nil, fmt.Errorf("failed to parse LLM response as JSON: %w", err)
			}
			return steps, nil
		}
	}

	// Store additional data in metadata for later use
	// We'll need to update the calling function to handle this
	return response.Instructions, nil
}

func (s *LLMService) buildPersonalizedSystemPrompt(req RecipeGenerationRequest) string {
	basePersonality := "You are a helpful cooking assistant who creates warm, personal recipes."
	
	switch req.VoiceStyle {
	case "chef_pro":
		return "You are a professional chef with years of culinary training. Write recipes with precision, proper culinary terminology, and expert techniques. Be authoritative yet helpful, focusing on technique and professional results."
		
	case "food_blogger":
		return "You are a friendly food blogger who loves sharing recipes with personal stories. Write in a casual, warm tone with enthusiasm. Include sensory descriptions, personal anecdotes, and make the reader feel like they're cooking with a close friend. Use phrases like 'I love how...' and 'You'll know it's ready when...'"
		
	case "home_cook":
		return "You are an experienced home cook sharing practical, family-tested recipes. Write in a conversational, helpful tone with real-world tips. Focus on simplicity, practicality, and what actually works in a busy kitchen. Include shortcuts and substitutions that make cooking easier."
		
	case "funny_friend":
		return "You are that hilarious friend who somehow makes amazing food while cracking jokes. Write recipes with light humor, pop culture references, and playful language. Keep it helpful but entertaining - like texting cooking instructions to your funniest friend. Don't overdo the jokes, but keep it fun and relatable."
		
	case "grandma_voice":
		return "You are a warm, loving grandmother sharing cherished family recipes. Write with nostalgic warmth, gentle wisdom, and old-school cooking intuition. Use phrases like 'a pinch of this' and 'cook until it looks right,' while still being helpful. Include stories about when you'd make this dish and why it's special."
		
	default:
		return basePersonality
	}
}

func (s *LLMService) buildPersonalizedContext(req RecipeGenerationRequest) string {
	context := ""
	
	// Add user preferences context
	if req.UserPreferences.CookingLevel != "" {
		switch req.UserPreferences.CookingLevel {
		case "beginner":
			context += "This recipe is for someone new to cooking, so include extra detail and explain techniques clearly. "
		case "advanced":
			context += "This recipe is for an experienced cook who appreciates sophisticated techniques and flavors. "
		}
	}
	
	// Add occasion context
	if req.Occasion != "" {
		switch req.Occasion {
		case "weeknight":
			context += "This is for a busy weeknight when time is short but good food still matters. "
		case "date_night":
			context += "This is for a romantic dinner, so make it elegant and impressive but not overwhelming. "
		case "family_dinner":
			context += "This is for bringing the family together around good food. "
		case "meal_prep":
			context += "This recipe should work well for meal prepping and storing for later. "
		}
	}
	
	// Add avoided ingredients
	if len(req.UserPreferences.AvoidedIngredients) > 0 {
		context += fmt.Sprintf("Avoid these ingredients: %s. ", strings.Join(req.UserPreferences.AvoidedIngredients, ", "))
	}
	
	// Add favorite ingredients
	if len(req.UserPreferences.FavoriteIngredients) > 0 {
		context += fmt.Sprintf("Try to incorporate these favorite ingredients if they fit: %s. ", strings.Join(req.UserPreferences.FavoriteIngredients, ", "))
	}
	
	// Add family size context
	if req.UserPreferences.FamilySize > 0 {
		context += fmt.Sprintf("This cook usually feeds %d people. ", req.UserPreferences.FamilySize)
	}
	
	return context
}

func (s *LLMService) buildMetadataExtractionPrompt(req RecipeGenerationRequest) string {
	servings := req.ServingSize
	if servings <= 0 {
		servings = 4
	}

	difficulty := req.DifficultyLevel
	if difficulty == "" {
		difficulty = "medium"
	}

	// Build personalized context
	personalContext := s.buildPersonalizedContext(req)

	prompt := fmt.Sprintf(`Extract the recipe title, a list of ingredients with realistic quantities, and tags from this description:
"%s"

Context: %s

Requirements:
- Servings: %d
- Difficulty: %s`, req.Prompt, personalContext, servings, difficulty)

	if req.PreferredCuisine != "" {
		prompt += fmt.Sprintf("\n- Cuisine: %s", req.PreferredCuisine)
	}

	if len(req.DietaryRestrictions) > 0 {
		prompt += fmt.Sprintf("\n- Dietary restrictions: %s", strings.Join(req.DietaryRestrictions, ", "))
	}

	if req.MaxPrepTime > 0 {
		prompt += fmt.Sprintf("\n- Max prep time: %d minutes", req.MaxPrepTime)
	}

	prompt += `

Make the recipe title engaging and descriptive. Include a warm, inviting description that makes someone want to cook this dish.

Respond in JSON:
{
  "title": "Quick Garlic Tomato Pasta",
  "description": "A fast and flavorful pasta dish perfect for busy weeknights",
  "cuisine_name": "Italian",
  "prep_time_minutes": 10,
  "cook_time_minutes": 20,
  "servings": 4,
  "difficulty_level": "easy",
  "ingredients": [
    {"name": "pasta", "quantity": 12, "unit": "oz", "notes": "penne or any short pasta"},
    {"name": "olive oil", "quantity": 0.25, "unit": "cup", "notes": "extra virgin"},
    {"name": "garlic", "quantity": 4, "unit": "clove", "notes": "minced"},
    {"name": "cherry tomatoes", "quantity": 1, "unit": "cup", "notes": "halved"}
  ],
  "tags": ["quick", "weeknight", "pasta", "30-minute", "easy"]
}`

	return prompt
}

func (s *LLMService) buildStepsGenerationPrompt(metadata *RecipeMetadata, req RecipeGenerationRequest) string {
	// Convert ingredients to string list
	ingredientNames := make([]string, len(metadata.Ingredients))
	for i, ing := range metadata.Ingredients {
		ingredientNames[i] = ing.Name
	}

	totalTime := metadata.PrepTime + metadata.CookTime
	if req.MaxPrepTime > 0 && totalTime > req.MaxPrepTime {
		totalTime = req.MaxPrepTime
	}

	// Build personalized context
	personalContext := s.buildPersonalizedContext(req)
	
	prompt := fmt.Sprintf(`Write detailed, personalized step-by-step instructions for the following recipe:

Title: %s
Ingredients: %s
Total Time: %d minutes
Servings: %d
Difficulty: %s
Context: %s

Voice Style Instructions:
%s

Requirements for Instructions:
- Each step should be clear, specific, and engaging
- Include cooking times, temperatures, and visual cues (e.g., "until golden brown", "until tender")
- Use sensory descriptions - how it should smell, sound, or look
- Include timing tips and technique explanations
- Write in the specified voice style - be warm, personal, and helpful
- Make it feel like you're cooking alongside a friend`, 
		metadata.Title, 
		strings.Join(ingredientNames, ", "), 
		totalTime, 
		metadata.Servings, 
		metadata.DifficultyLevel,
		personalContext,
		s.getInstructionStyleGuidance(req.VoiceStyle))

	// Add chef notes if requested
	if req.IncludeChefNotes {
		prompt += `

Include a "chef_notes" field with a warm, 1-2 sentence introduction about why this recipe is special, when to make it, or what makes it delicious.`
	}

	// Add variations if requested
	if req.IncludeVariations {
		prompt += `

Include a "variations" array with 2-3 creative suggestions:
- Ingredient swaps for dietary needs or preferences
- Cooking method alternatives
- Ways to customize flavors
- Make-ahead or meal prep tips`
	}

	prompt += `

Respond as JSON:
{
  "instructions": ["Step 1 with sensory details...", "Step 2 with timing cues..."]`

	if req.IncludeChefNotes {
		prompt += `,
  "chef_notes": "This dish is perfect when you want comfort food that doesn't take all day..."`
	}

	if req.IncludeVariations {
		prompt += `,
  "variations": [
    {
      "type": "ingredient_swap",
      "title": "Make it Vegan",
      "description": "Replace the cream with coconut milk for a dairy-free version that's just as rich."
    }
  ]`
	}

	prompt += `
}`

	return prompt
}

func (s *LLMService) getInstructionStyleGuidance(voiceStyle string) string {
	switch voiceStyle {
	case "chef_pro":
		return "Use precise culinary language, proper technique names, and professional cooking guidance. Be authoritative but educational."
		
	case "food_blogger":
		return "Write like you're sharing with friends - use 'I love when...' and 'You'll know it's perfect when...' Include personal touches and enthusiasm."
		
	case "home_cook":
		return "Keep it practical and real - mention shortcuts, what to do if something goes wrong, and realistic timing for busy cooks."
		
	case "funny_friend":
		return "Add light humor and relatable commentary, but keep the instructions clear. Think of texting cooking steps to your funniest friend."
		
	case "grandma_voice":
		return "Use warm, gentle language with intuitive cues like 'until it looks right' while still being helpful. Add wisdom and care."
		
	default:
		return "Write warmly and personally, like helping a friend cook. Include sensory details and encouraging language."
	}
}

func (s *LLMService) enrichIngredients(ingredients []GeneratedIngredient) ([]GeneratedIngredient, error) {
	enriched := make([]GeneratedIngredient, len(ingredients))
	
	for i, ingredient := range ingredients {
		enriched[i] = ingredient
		
		// Search USDA for this ingredient
		searchResponse, err := s.usdaService.SearchFood(ingredient.Name, 5)
		if err != nil {
			fmt.Printf("Warning: USDA search failed for %s: %v\n", ingredient.Name, err)
			continue
		}
		
		if searchResponse != nil && len(searchResponse.Foods) > 0 {
			// Use the first (most relevant) result
			enriched[i].FDCID = &searchResponse.Foods[0].FDCID
		}
	}
	
	return enriched, nil
}

func (s *LLMService) calculateNutrition(ingredients []GeneratedIngredient, servings int) NutritionSummary {
	summary := NutritionSummary{}
	
	var totalCalories, totalProtein, totalFat, totalCarbs, totalFiber, totalSodium float64
	
	for _, ingredient := range ingredients {
		if ingredient.FDCID == nil {
			continue // Skip ingredients without USDA data
		}
		
		// Get detailed nutrition info from USDA
		foodDetails, err := s.usdaService.GetFoodDetails(*ingredient.FDCID)
		if err != nil {
			continue
		}
		
		// Convert USDA response to ingredient
		details := s.usdaService.ConvertUSDAFoodDetailsToIngredient(foodDetails)
		
		// Convert quantity to grams (rough approximation)
		grams := s.convertToGrams(ingredient.Quantity, ingredient.Unit)
		factor := grams / 100.0 // USDA data is per 100g
		
		if details.CaloriesPer100g != nil {
			totalCalories += *details.CaloriesPer100g * factor
		}
		if details.ProteinPer100g != nil {
			totalProtein += *details.ProteinPer100g * factor
		}
		if details.FatPer100g != nil {
			totalFat += *details.FatPer100g * factor
		}
		if details.CarbsPer100g != nil {
			totalCarbs += *details.CarbsPer100g * factor
		}
		if details.FiberPer100g != nil {
			totalFiber += *details.FiberPer100g * factor
		}
		if details.SodiumPer100g != nil {
			totalSodium += *details.SodiumPer100g * factor
		}
	}
	
	// Calculate per serving
	if servings > 0 {
		summary.TotalCalories = &[]float64{totalCalories / float64(servings)}[0]
		summary.TotalProtein = &[]float64{totalProtein / float64(servings)}[0]
		summary.TotalFat = &[]float64{totalFat / float64(servings)}[0]
		summary.TotalCarbs = &[]float64{totalCarbs / float64(servings)}[0]
		summary.TotalFiber = &[]float64{totalFiber / float64(servings)}[0]
		summary.TotalSodium = &[]float64{totalSodium / float64(servings)}[0]
	}
	
	return summary
}

func (s *LLMService) convertToGrams(quantity float64, unit string) float64 {
	// Rough conversion factors to grams
	conversions := map[string]float64{
		"cup":        240.0,  // Varies by ingredient, using average
		"tablespoon": 15.0,
		"tbsp":       15.0,
		"teaspoon":   5.0,
		"tsp":        5.0,
		"pound":      453.592,
		"lb":         453.592,
		"ounce":      28.3495,
		"oz":         28.3495,
		"gram":       1.0,
		"g":          1.0,
		"kilogram":   1000.0,
		"kg":         1000.0,
		"liter":      1000.0, // For liquids, approximate
		"l":          1000.0,
		"milliliter": 1.0,
		"ml":         1.0,
	}
	
	factor, exists := conversions[strings.ToLower(unit)]
	if !exists {
		return quantity * 100.0 // Default assumption
	}
	
	return quantity * factor
}

// generateStructuredMockRecipe provides an enhanced mock that follows the step-by-step approach
func (s *LLMService) generateStructuredMockRecipe(req RecipeGenerationRequest) (*RecipeGenerationResponse, error) {
	// Step 1: Extract recipe metadata (simulated)
	metadata := s.mockExtractMetadata(req)
	
	// Step 2: Generate detailed cooking steps (simulated)
	steps := s.mockGenerateCookingSteps(metadata, req)
	
	// Step 3: Enrich ingredients via USDA API
	enrichedIngredients, err := s.enrichIngredients(metadata.Ingredients)
	if err != nil {
		fmt.Printf("Warning: Failed to enrich ingredients: %v\n", err)
		// Continue with extracted ingredients if USDA lookup fails
	} else {
		metadata.Ingredients = enrichedIngredients
	}
	
	// Step 4: Construct final recipe object
	finalRecipe := &RecipeGenerationResponse{
		Title:           metadata.Title,
		Description:     metadata.Description,
		CuisineName:     metadata.CuisineName,
		Instructions:    steps,
		PrepTime:        metadata.PrepTime,
		CookTime:        metadata.CookTime,
		Servings:        metadata.Servings,
		DifficultyLevel: metadata.DifficultyLevel,
		Ingredients:     metadata.Ingredients,
		Tags:            metadata.Tags,
	}
	
	// Step 5: Calculate nutrition summary
	nutrition := s.calculateNutrition(finalRecipe.Ingredients, finalRecipe.Servings)
	finalRecipe.Nutrition = nutrition
	
	return finalRecipe, nil
}

// mockExtractMetadata simulates Step 1: Extract title, ingredients, and tags
func (s *LLMService) mockExtractMetadata(req RecipeGenerationRequest) *RecipeMetadata {
	description := strings.ToLower(req.Prompt)
	servings := req.ServingSize
	if servings <= 0 {
		servings = 4
	}
	
	maxPrepTime := req.MaxPrepTime
	if maxPrepTime <= 0 {
		maxPrepTime = 45
	}
	
	// Enhanced pattern matching for different recipe types
	if strings.Contains(description, "pasta") || strings.Contains(description, "spaghetti") || 
	   strings.Contains(description, "penne") || strings.Contains(description, "linguine") {
		
		if strings.Contains(description, "30") && strings.Contains(description, "minute") {
			return &RecipeMetadata{
				Title:           "Quick 30-Minute Garlic Penne Pasta",
				Description:     "A fast and flavorful pasta dish perfect for busy weeknights, featuring al dente penne in a fragrant garlic and olive oil sauce with fresh herbs",
				CuisineName:     "Italian",
				PrepTime:        10,
				CookTime:        20,
				Servings:        servings,
				DifficultyLevel: "easy",
				Ingredients: []GeneratedIngredient{
					{Name: "penne pasta", Quantity: 12, Unit: "oz", Notes: "or any short pasta shape"},
					{Name: "olive oil", Quantity: 0.25, Unit: "cup", Notes: "extra virgin"},
					{Name: "garlic", Quantity: 6, Unit: "clove", Notes: "thinly sliced"},
					{Name: "red pepper flakes", Quantity: 0.5, Unit: "teaspoon", Notes: "adjust to taste"},
					{Name: "cherry tomatoes", Quantity: 1, Unit: "cup", Notes: "halved"},
					{Name: "fresh basil", Quantity: 0.25, Unit: "cup", Notes: "chopped"},
					{Name: "parmesan cheese", Quantity: 0.5, Unit: "cup", Notes: "freshly grated"},
					{Name: "lemon", Quantity: 1, Unit: "medium", Notes: "juiced and zested"},
					{Name: "salt", Quantity: 1, Unit: "teaspoon", Notes: "or to taste"},
					{Name: "black pepper", Quantity: 0.5, Unit: "teaspoon", Notes: "freshly ground"},
					{Name: "fresh parsley", Quantity: 2, Unit: "tablespoon", Notes: "chopped for garnish"},
				},
				Tags: []string{"pasta", "quick", "30-minute", "weeknight", "italian", "vegetarian", "garlic"},
			}
		}
		
		// Default pasta recipe
		return &RecipeMetadata{
			Title:           "Classic Garlic Pasta",
			Description:     "A simple and delicious pasta with garlic, olive oil, and herbs",
			CuisineName:     "Italian", 
			PrepTime:        15,
			CookTime:        20,
			Servings:        servings,
			DifficultyLevel: "easy",
			Ingredients: []GeneratedIngredient{
				{Name: "pasta", Quantity: 12, Unit: "oz"},
				{Name: "olive oil", Quantity: 0.25, Unit: "cup"},
				{Name: "garlic", Quantity: 4, Unit: "clove", Notes: "minced"},
				{Name: "parmesan cheese", Quantity: 0.5, Unit: "cup", Notes: "grated"},
				{Name: "salt", Quantity: 1, Unit: "teaspoon"},
				{Name: "black pepper", Quantity: 0.5, Unit: "teaspoon"},
			},
			Tags: []string{"pasta", "italian", "vegetarian", "garlic"},
		}
	}
	
	if strings.Contains(description, "curry") && strings.Contains(description, "chickpea") {
		return &RecipeMetadata{
			Title:           "High-Protein Vegan Chickpea Curry",
			Description:     "A delicious and nutritious vegan curry packed with protein from chickpeas and fresh spinach",
			CuisineName:     "Indian",
			PrepTime:        15,
			CookTime:        25,
			Servings:        servings,
			DifficultyLevel: "medium",
			Ingredients: []GeneratedIngredient{
				{Name: "chickpeas", Quantity: 2, Unit: "cup", Notes: "drained and rinsed"},
				{Name: "spinach", Quantity: 4, Unit: "cup", Notes: "fresh, chopped"},
				{Name: "onion", Quantity: 1, Unit: "large", Notes: "diced"},
				{Name: "garlic", Quantity: 3, Unit: "clove", Notes: "minced"},
				{Name: "ginger", Quantity: 1, Unit: "tablespoon", Notes: "fresh, grated"},
				{Name: "coconut milk", Quantity: 1, Unit: "cup", Notes: "full-fat"},
				{Name: "tomatoes", Quantity: 2, Unit: "large", Notes: "diced"},
				{Name: "curry powder", Quantity: 2, Unit: "tablespoon"},
				{Name: "turmeric", Quantity: 1, Unit: "teaspoon"},
				{Name: "olive oil", Quantity: 2, Unit: "tablespoon"},
			},
			Tags: []string{"vegan", "high-protein", "indian", "curry", "healthy"},
		}
	}
	
	if strings.Contains(description, "chicken") {
		return &RecipeMetadata{
			Title:           "Simple Garlic Herb Chicken",
			Description:     "Tender, juicy chicken breast seasoned with herbs and garlic",
			CuisineName:     "American",
			PrepTime:        10,
			CookTime:        25,
			Servings:        servings,
			DifficultyLevel: "easy",
			Ingredients: []GeneratedIngredient{
				{Name: "chicken breast", Quantity: 1.5, Unit: "lb", Notes: "boneless, skinless"},
				{Name: "olive oil", Quantity: 2, Unit: "tablespoon"},
				{Name: "garlic", Quantity: 4, Unit: "clove", Notes: "minced"},
				{Name: "rosemary", Quantity: 1, Unit: "tablespoon", Notes: "fresh, chopped"},
				{Name: "thyme", Quantity: 1, Unit: "tablespoon", Notes: "fresh, chopped"},
				{Name: "salt", Quantity: 1, Unit: "teaspoon"},
				{Name: "black pepper", Quantity: 0.5, Unit: "teaspoon"},
				{Name: "lemon", Quantity: 1, Unit: "medium", Notes: "juiced"},
			},
			Tags: []string{"chicken", "protein", "herbs", "main-course", "easy"},
		}
	}
	
	// Ultimate fallback with better structure
	return &RecipeMetadata{
		Title:           "Simple Delicious Recipe",
		Description:     fmt.Sprintf("A tasty recipe based on: %s", req.Prompt),
		CuisineName:     "International",
		PrepTime:        15,
		CookTime:        20,
		Servings:        servings,
		DifficultyLevel: "medium",
		Ingredients: []GeneratedIngredient{
			{Name: "main ingredient", Quantity: 1, Unit: "lb"},
			{Name: "olive oil", Quantity: 2, Unit: "tablespoon"},
			{Name: "garlic", Quantity: 2, Unit: "clove", Notes: "minced"},
			{Name: "salt", Quantity: 1, Unit: "teaspoon"},
			{Name: "black pepper", Quantity: 0.5, Unit: "teaspoon"},
		},
		Tags: []string{"simple", "quick", "homemade"},
	}
}

// mockGenerateCookingSteps simulates Step 2: Generate detailed cooking instructions  
func (s *LLMService) mockGenerateCookingSteps(metadata *RecipeMetadata, req RecipeGenerationRequest) []string {
	description := strings.ToLower(req.Prompt)
	
	// Enhanced step generation based on recipe type
	if strings.Contains(description, "pasta") && strings.Contains(description, "30") && strings.Contains(description, "minute") {
		return []string{
			"Bring a large pot of generously salted water to a rolling boil (about 1 tablespoon salt per 4 cups water). This ensures the pasta will be properly seasoned.",
			"Add penne pasta to the boiling water and cook according to package directions until al dente (usually 8-10 minutes). Stir occasionally to prevent sticking.",
			"About 2 minutes before the pasta is done, reserve 1 cup of the starchy pasta cooking water. This will help create a silky sauce.",
			"While pasta cooks, heat olive oil in a large skillet or sauté pan over medium-low heat. Don't let it get too hot or the garlic will burn.",
			"Add thinly sliced garlic to the warm oil and cook gently for 2-3 minutes, stirring frequently, until fragrant and just beginning to turn golden. The key is slow, gentle cooking.",
			"Add red pepper flakes and cook for 30 seconds until fragrant. Be careful not to burn them as they can become bitter.",
			"Add halved cherry tomatoes to the pan and cook for 3-4 minutes, stirring occasionally, until they start to soften and release their juices.",
			"Drain the pasta and immediately add it to the skillet with the garlic oil. Don't rinse the pasta - you want that starch!",
			"Toss the pasta with the oil over medium heat, adding reserved pasta water gradually (start with 1/4 cup) to create a glossy sauce that coats each piece of pasta.",
			"Remove the pan from heat and immediately stir in fresh basil, lemon zest, and lemon juice. The residual heat will wilt the basil perfectly.",
			"Add half the grated parmesan cheese and toss vigorously to create a creamy coating. Season generously with salt and freshly ground black pepper.",
			"Taste and adjust seasoning. The pasta should be well-seasoned, garlicky, and have a nice balance of acidity from the lemon.",
			"Serve immediately in warmed bowls, topped with remaining parmesan cheese and fresh chopped parsley. Drizzle with a bit more olive oil if desired.",
			"Total active cooking time: 25-30 minutes from start to finish. Perfect for busy weeknights!",
		}
	}
	
	if strings.Contains(description, "curry") && strings.Contains(description, "chickpea") {
		return []string{
			"Heat olive oil in a large pan or Dutch oven over medium heat until shimmering.",
			"Add diced onions and cook for 5-7 minutes, stirring occasionally, until translucent and starting to soften.",
			"Add minced garlic and grated ginger, cooking for 1-2 minutes until fragrant. Stir constantly to prevent burning.",
			"Add curry powder and turmeric, stirring for 30 seconds until the spices are fragrant and well combined with the aromatics.",
			"Add diced tomatoes and cook for 5-7 minutes, stirring occasionally, until they break down and become sauce-like.",
			"Pour in coconut milk and bring the mixture to a gentle simmer. Stir to combine all ingredients.",
			"Add drained chickpeas to the pan and simmer for 15-20 minutes, stirring occasionally, until the sauce thickens slightly.",
			"Stir in chopped spinach and cook for 2-3 minutes until wilted and incorporated into the curry.",
			"Season with salt and pepper to taste. The curry should be rich, aromatic, and well-balanced.",
			"Serve hot over basmati rice or with warm naan bread. Garnish with fresh cilantro if desired.",
		}
	}
	
	if strings.Contains(description, "chicken") {
		return []string{
			"Preheat your oven to 375°F (190°C) and let it fully heat while you prepare the chicken.",
			"Pat chicken breasts dry with paper towels and season both sides generously with salt, pepper, and minced garlic.",
			"Rub the fresh herbs (rosemary and thyme) into the chicken, pressing gently to help them adhere.",
			"Heat olive oil in an oven-safe skillet over medium-high heat until hot but not smoking.",
			"Carefully place the seasoned chicken breasts in the skillet and sear for 3-4 minutes until golden brown on the first side.",
			"Flip the chicken and sear the other side for 3-4 minutes until golden brown.",
			"Drizzle the chicken with fresh lemon juice, then transfer the entire skillet to the preheated oven.",
			"Bake for 15-20 minutes, or until the internal temperature reaches 165°F (74°C) when tested with a meat thermometer.",
			"Remove from oven and let the chicken rest for 5 minutes before slicing. This helps retain the juices.",
			"Slice and serve immediately. The chicken should be golden on the outside and juicy on the inside.",
		}
	}
	
	// Default detailed steps
	return []string{
		"Gather all ingredients and prepare your workspace. Read through the entire recipe before starting.",
		"Prepare ingredients according to the recipe requirements (chopping, measuring, etc.).",
		"Heat olive oil in a large pan over medium heat until shimmering but not smoking.",
		"Add aromatics (garlic, onions) and cook until fragrant, about 2-3 minutes, stirring frequently.",
		"Add main ingredients to the pan and cook according to their requirements, stirring as needed.",
		"Season with salt and pepper throughout the cooking process, tasting and adjusting as you go.",
		"Continue cooking until ingredients are properly done, following visual and timing cues.",
		"Remove from heat and let rest briefly if needed to allow flavors to meld.",
		"Taste one final time and adjust seasoning if necessary.",
		"Serve immediately while hot, garnishing as desired.",
	}
}

// Keep the old function name for backward compatibility, but redirect to new implementation
func (s *LLMService) generateMockRecipe(req RecipeGenerationRequest) (*RecipeGenerationResponse, error) {
	return s.generateStructuredMockRecipe(req)
} 