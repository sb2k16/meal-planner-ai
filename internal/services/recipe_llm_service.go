package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"mealplanner/internal/models"
)

type RecipeLLMService struct {
	client    *http.Client
	apiKey    string
	baseURL   string
	model     string
}

func NewRecipeLLMService() *RecipeLLMService {
	return &RecipeLLMService{
		client:  &http.Client{Timeout: 120 * time.Second},
		apiKey:  os.Getenv("OPENAI_API_KEY"),
		baseURL: "https://api.openai.com/v1",
		model:   "gpt-4", // or "gpt-3.5-turbo" for faster/cheaper processing
	}
}

// ProcessScrapedRecipe processes a scraped recipe using LLM to normalize and structure data
func (s *RecipeLLMService) ProcessScrapedRecipe(request models.ProcessingRequest) (*models.ProcessingResponse, error) {
	// Create the prompt for LLM processing
	prompt := s.createRecipeProcessingPrompt(request)
	
	// Call LLM API
	response, err := s.callLLM(prompt)
	if err != nil {
		return nil, fmt.Errorf("LLM processing failed: %w", err)
	}

	// Parse the structured response
	var processingResponse models.ProcessingResponse
	if err := json.Unmarshal([]byte(response), &processingResponse); err != nil {
		return nil, fmt.Errorf("failed to parse LLM response: %w", err)
	}

	return &processingResponse, nil
}

// createRecipeProcessingPrompt creates a detailed prompt for recipe processing
func (s *RecipeLLMService) createRecipeProcessingPrompt(request models.ProcessingRequest) string {
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

// callLLM makes the actual API call to OpenAI
func (s *RecipeLLMService) callLLM(prompt string) (string, error) {
	// Create request payload
	payload := map[string]interface{}{
		"model": s.model,
		"messages": []map[string]string{
			{
				"role":    "user",
				"content": prompt,
			},
		},
		"temperature":   0.3, // Lower temperature for more consistent structured output
		"max_tokens":    4000,
		"response_format": map[string]string{"type": "json_object"}, // Ensure JSON response
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", s.baseURL+"/chat/completions", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	// Make the request
	resp, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	// Parse response
	var response struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if response.Error != nil {
		return "", fmt.Errorf("API error: %s", response.Error.Message)
	}

	if len(response.Choices) == 0 {
		return "", fmt.Errorf("no response choices returned")
	}

	return response.Choices[0].Message.Content, nil
}

// GenerateRecipeFromPrompt generates a complete recipe from a user prompt
func (s *RecipeLLMService) GenerateRecipeFromPrompt(prompt string, dietaryRestrictions []string, cuisinePreference string) (*models.ProcessingResponse, error) {
	// Create a comprehensive prompt for recipe generation
	generationPrompt := s.createRecipeGenerationPrompt(prompt, dietaryRestrictions, cuisinePreference)
	
	// Call LLM API
	response, err := s.callLLM(generationPrompt)
	if err != nil {
		return nil, fmt.Errorf("recipe generation failed: %w", err)
	}

	// Parse the response
	var processingResponse models.ProcessingResponse
	if err := json.Unmarshal([]byte(response), &processingResponse); err != nil {
		return nil, fmt.Errorf("failed to parse generation response: %w", err)
	}

	return &processingResponse, nil
}

// createRecipeGenerationPrompt creates a prompt for generating recipes from scratch
func (s *RecipeLLMService) createRecipeGenerationPrompt(userPrompt string, dietaryRestrictions []string, cuisinePreference string) string {
	restrictionsText := ""
	if len(dietaryRestrictions) > 0 {
		restrictionsText = fmt.Sprintf("**Dietary Restrictions:** %s", strings.Join(dietaryRestrictions, ", "))
	}

	cuisineText := ""
	if cuisinePreference != "" {
		cuisineText = fmt.Sprintf("**Cuisine Preference:** %s", cuisinePreference)
	}

	prompt := fmt.Sprintf(`You are a professional chef and recipe developer. Create a complete, detailed recipe based on the user's request.

## User Request:
%s

%s
%s

## Your Task:
Create a complete recipe that satisfies the user's request and any dietary restrictions. Return a structured JSON response with detailed recipe information.

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
  "estimated_calories": number,
  "estimated_protein": number,
  "estimated_fat": number,
  "estimated_carbs": number,
  "processing_notes": "Generated recipe based on user request"
}

## Guidelines:
- Create a realistic, cookable recipe with proper proportions
- Include all necessary ingredients with specific amounts
- Provide clear, step-by-step cooking instructions
- Ensure the recipe meets all specified dietary restrictions
- Estimate realistic nutritional values
- Include appropriate dietary tags
- Make the recipe appropriate for 4 servings unless otherwise specified
- Choose difficulty level based on techniques and time required

Generate the complete recipe now:`, userPrompt, restrictionsText, cuisineText)

	return prompt
}

// ImproveRecipeInstructions takes existing recipe instructions and improves them with LLM
func (s *RecipeLLMService) ImproveRecipeInstructions(title string, currentInstructions []string) ([]models.StructuredInstruction, error) {
	instructionsJSON, _ := json.Marshal(currentInstructions)
	
	prompt := fmt.Sprintf(`You are a professional chef and cooking instructor. Improve the following recipe instructions by making them clearer, more detailed, and properly structured.

## Recipe: %s
## Current Instructions: %s

## Your Task:
Transform these instructions into clear, detailed, step-by-step directions that a home cook can easily follow.

## Output Format:
Return ONLY a valid JSON array with this structure:

[
  {
    "step_number": number,
    "action": "string",
    "details": "string", 
    "duration": number or null,
    "temperature": number or null
  }
]

## Guidelines:
- Break complex steps into smaller, manageable parts
- Include specific temperatures, times, and visual cues
- Use professional cooking terminology but keep it accessible
- Add helpful tips for technique and doneness
- Ensure logical sequence and flow
- Include prep work in early steps

Improve the instructions now:`, title, string(instructionsJSON))

	response, err := s.callLLM(prompt)
	if err != nil {
		return nil, fmt.Errorf("instruction improvement failed: %w", err)
	}

	var improvedInstructions []models.StructuredInstruction
	if err := json.Unmarshal([]byte(response), &improvedInstructions); err != nil {
		return nil, fmt.Errorf("failed to parse improved instructions: %w", err)
	}

	return improvedInstructions, nil
}

// AnalyzeDietaryCompatibility analyzes if a recipe meets specific dietary requirements
func (s *RecipeLLMService) AnalyzeDietaryCompatibility(ingredients []models.StructuredIngredient, dietaryRequirements []string) (map[string]bool, []string, error) {
	ingredientsJSON, _ := json.Marshal(ingredients)
	requirementsJSON, _ := json.Marshal(dietaryRequirements)
	
	prompt := fmt.Sprintf(`You are a nutrition expert. Analyze the following recipe ingredients to determine dietary compatibility.

## Ingredients: %s
## Dietary Requirements to Check: %s

## Your Task:
Determine if this recipe meets each dietary requirement and provide suggestions for modifications if needed.

## Output Format:
Return ONLY a valid JSON object with this structure:

{
  "compatibility": {
    "vegan": boolean,
    "vegetarian": boolean,
    "gluten-free": boolean,
    "dairy-free": boolean,
    "keto": boolean,
    "low-carb": boolean,
    "high-protein": boolean
  },
  "modification_suggestions": ["string"]
}

## Guidelines:
- Be conservative - only mark as compatible if clearly suitable
- Provide specific, actionable modification suggestions
- Consider hidden sources of restricted ingredients
- Think about cross-contamination concerns for allergens

Analyze the compatibility now:`, string(ingredientsJSON), string(requirementsJSON))

	response, err := s.callLLM(prompt)
	if err != nil {
		return nil, nil, fmt.Errorf("dietary analysis failed: %w", err)
	}

	var result struct {
		Compatibility           map[string]bool `json:"compatibility"`
		ModificationSuggestions []string        `json:"modification_suggestions"`
	}

	if err := json.Unmarshal([]byte(response), &result); err != nil {
		return nil, nil, fmt.Errorf("failed to parse dietary analysis: %w", err)
	}

	return result.Compatibility, result.ModificationSuggestions, nil
} 