package services

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"mealplanner/internal/models"
)

type ScraperService struct {
	client *http.Client
}

func NewScraperService() *ScraperService {
	return &ScraperService{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ScrapeRecipe extracts recipe information from a given URL
func (s *ScraperService) ScrapeRecipe(urlStr string) (*models.ScrapedRecipe, error) {
	// Validate URL
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	// Make HTTP request
	resp, err := s.client.Get(parsedURL.String())
	if err != nil {
		return nil, fmt.Errorf("failed to fetch page: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	// Parse HTML
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	// Try to extract recipe using different strategies
	recipe := &models.ScrapedRecipe{
		SourceURL: urlStr,
	}

	// Strategy 1: JSON-LD structured data
	if s.extractJSONLD(doc, recipe) {
		return recipe, nil
	}

	// Strategy 2: Common recipe markup patterns
	if s.extractFromCommonPatterns(doc, recipe) {
		return recipe, nil
	}

	// Strategy 3: Generic content extraction
	if s.extractGeneric(doc, recipe) {
		return recipe, nil
	}

	return nil, fmt.Errorf("could not extract recipe from page")
}

// extractJSONLD extracts recipe from JSON-LD structured data
func (s *ScraperService) extractJSONLD(doc *goquery.Document, recipe *models.ScrapedRecipe) bool {
	found := false
	doc.Find("script[type='application/ld+json']").Each(func(i int, selection *goquery.Selection) {
		if found {
			return
		}
		// This would require JSON parsing for structured data
		// For simplicity, we'll skip this complex implementation
		// In a production system, you'd parse the JSON-LD here
	})
	return found
}

// extractFromCommonPatterns extracts recipe using common HTML patterns
func (s *ScraperService) extractFromCommonPatterns(doc *goquery.Document, recipe *models.ScrapedRecipe) bool {
	// Try to find title
	title := ""
	titleSelectors := []string{
		"h1.recipe-title",
		"h1.entry-title",
		".recipe-header h1",
		"h1[itemprop='name']",
		"h1",
	}
	
	for _, selector := range titleSelectors {
		if element := doc.Find(selector).First(); element.Length() > 0 {
			title = strings.TrimSpace(element.Text())
			if title != "" {
				break
			}
		}
	}
	
	if title == "" {
		return false
	}
	recipe.Title = title

	// Try to find description
	descSelectors := []string{
		".recipe-description",
		".recipe-summary",
		"[itemprop='description']",
		".entry-summary",
	}
	
	for _, selector := range descSelectors {
		if element := doc.Find(selector).First(); element.Length() > 0 {
			recipe.Description = strings.TrimSpace(element.Text())
			if recipe.Description != "" {
				break
			}
		}
	}

	// Try to find prep time
	prepTimeSelectors := []string{
		"[itemprop='prepTime']",
		".prep-time",
		".recipe-prep-time",
	}
	
	for _, selector := range prepTimeSelectors {
		if element := doc.Find(selector).First(); element.Length() > 0 {
			if duration := s.parseDuration(element.Text()); duration > 0 {
				recipe.PrepTime = &duration
				break
			}
		}
	}

	// Try to find cook time
	cookTimeSelectors := []string{
		"[itemprop='cookTime']",
		".cook-time",
		".recipe-cook-time",
	}
	
	for _, selector := range cookTimeSelectors {
		if element := doc.Find(selector).First(); element.Length() > 0 {
			if duration := s.parseDuration(element.Text()); duration > 0 {
				recipe.CookTime = &duration
				break
			}
		}
	}

	// Try to find servings
	servingsSelectors := []string{
		"[itemprop='recipeYield']",
		".recipe-yield",
		".servings",
	}
	
	recipe.Servings = 4 // default
	for _, selector := range servingsSelectors {
		if element := doc.Find(selector).First(); element.Length() > 0 {
			if servings := s.parseServings(element.Text()); servings > 0 {
				recipe.Servings = servings
				break
			}
		}
	}

	// Try to find ingredients
	ingredientSelectors := []string{
		".recipe-ingredient",
		"[itemprop='recipeIngredient']",
		".ingredients li",
		".ingredient",
	}
	
	for _, selector := range ingredientSelectors {
		                elements := doc.Find(selector)
                if elements.Length() > 0 {
                        elements.Each(func(i int, sel *goquery.Selection) {
                                text := strings.TrimSpace(sel.Text())
                                if text != "" {
                                        ingredient := s.parseIngredient(text)
                                        recipe.Ingredients = append(recipe.Ingredients, ingredient)
                                }
                        })
			if len(recipe.Ingredients) > 0 {
				break
			}
		}
	}

	// Try to find instructions
	instructionSelectors := []string{
		".recipe-instruction",
		"[itemprop='recipeInstructions']",
		".instructions li",
		".directions li",
		".method li",
	}
	
	var instructions []string
	for _, selector := range instructionSelectors {
		elements := doc.Find(selector)
		if elements.Length() > 0 {
			elements.Each(func(i int, s *goquery.Selection) {
				text := strings.TrimSpace(s.Text())
				if text != "" {
					instructions = append(instructions, fmt.Sprintf("%d. %s", i+1, text))
				}
			})
			if len(instructions) > 0 {
				break
			}
		}
	}
	
	if len(instructions) > 0 {
		recipe.Instructions = strings.Join(instructions, "\n")
	}

	return len(recipe.Ingredients) > 0 && recipe.Instructions != ""
}

// extractGeneric performs generic content extraction as fallback
func (s *ScraperService) extractGeneric(doc *goquery.Document, recipe *models.ScrapedRecipe) bool {
	// Try to get title from page title if not found
	if recipe.Title == "" {
		if title := doc.Find("title").First().Text(); title != "" {
			recipe.Title = strings.TrimSpace(title)
		}
	}

	        // Look for any lists that might be ingredients
        if len(recipe.Ingredients) == 0 {
                doc.Find("ul li, ol li").Each(func(i int, sel *goquery.Selection) {
                        text := strings.TrimSpace(sel.Text())
                        // Simple heuristic: if it contains common measurement words, it might be an ingredient
                        if s.containsMeasurementWords(text) {
                                ingredient := s.parseIngredient(text)
                                recipe.Ingredients = append(recipe.Ingredients, ingredient)
                        }
                })
	}

	return recipe.Title != ""
}

// containsMeasurementWords checks if text contains common cooking measurements
func (s *ScraperService) containsMeasurementWords(text string) bool {
	lowerText := strings.ToLower(text)
	measurements := []string{
		"cup", "cups", "tbsp", "tablespoon", "tablespoons", "tsp", "teaspoon", "teaspoons",
		"oz", "ounce", "ounces", "lb", "pound", "pounds", "gram", "grams", "kg", "kilogram",
		"ml", "milliliter", "liter", "pint", "quart", "gallon", "piece", "pieces", "clove", "cloves",
	}
	
	for _, measurement := range measurements {
		if strings.Contains(lowerText, measurement) {
			return true
		}
	}
	return false
}

// parseIngredient parses ingredient text into structured format
func (s *ScraperService) parseIngredient(text string) models.ScrapedIngredient {
	// This is a simplified parser
	// In production, you'd want more sophisticated parsing
	parts := strings.Fields(text)
	
	ingredient := models.ScrapedIngredient{
		Quantity: 1, // default
		Unit:     "piece",
		Notes:    "",
	}

	if len(parts) == 0 {
		return ingredient
	}

	// Try to parse quantity from first word
	if quantity, err := strconv.ParseFloat(parts[0], 64); err == nil {
		ingredient.Quantity = quantity
		parts = parts[1:]
	}

	// Try to identify unit from next word(s)
	if len(parts) > 0 {
		possibleUnit := strings.ToLower(parts[0])
		units := map[string]string{
			"cup":        "cup",
			"cups":       "cup",
			"tbsp":       "tablespoon",
			"tablespoon": "tablespoon",
			"tablespoons": "tablespoon",
			"tsp":        "teaspoon",
			"teaspoon":   "teaspoon",
			"teaspoons":  "teaspoon",
			"oz":         "ounce",
			"ounce":      "ounce",
			"ounces":     "ounce",
			"lb":         "pound",
			"pound":      "pound",
			"pounds":     "pound",
			"gram":       "gram",
			"grams":      "gram",
			"piece":      "piece",
			"pieces":     "piece",
			"clove":      "clove",
			"cloves":     "clove",
		}
		
		if unit, exists := units[possibleUnit]; exists {
			ingredient.Unit = unit
			parts = parts[1:]
		}
	}

	// Remaining parts are the ingredient name and notes
	if len(parts) > 0 {
		ingredient.Name = strings.Join(parts, " ")
		
		// Extract notes (text in parentheses)
		if idx := strings.Index(ingredient.Name, "("); idx >= 0 {
			if endIdx := strings.Index(ingredient.Name[idx:], ")"); endIdx >= 0 {
				ingredient.Notes = strings.TrimSpace(ingredient.Name[idx+1 : idx+endIdx])
				ingredient.Name = strings.TrimSpace(ingredient.Name[:idx] + ingredient.Name[idx+endIdx+1:])
			}
		}
	}

	return ingredient
}

// parseDuration parses duration text into minutes
func (s *ScraperService) parseDuration(text string) int {
	text = strings.ToLower(strings.TrimSpace(text))
	
	// Look for patterns like "30 min", "1 hour", "1 hr 30 min"
	minutes := 0
	
	// Extract hours
	if strings.Contains(text, "hour") || strings.Contains(text, "hr") {
		parts := strings.Fields(text)
		for i, part := range parts {
			if (part == "hour" || part == "hours" || part == "hr" || part == "hrs") && i > 0 {
				if hours, err := strconv.Atoi(parts[i-1]); err == nil {
					minutes += hours * 60
				}
			}
		}
	}
	
	// Extract minutes
	if strings.Contains(text, "min") {
		parts := strings.Fields(text)
		for i, part := range parts {
			if (part == "min" || part == "mins" || part == "minute" || part == "minutes") && i > 0 {
				if mins, err := strconv.Atoi(parts[i-1]); err == nil {
					minutes += mins
				}
			}
		}
	}
	
	// If no pattern found, try to extract any number
	if minutes == 0 {
		parts := strings.Fields(text)
		for _, part := range parts {
			if mins, err := strconv.Atoi(part); err == nil && mins > 0 && mins < 1000 {
				minutes = mins
				break
			}
		}
	}
	
	return minutes
}

// parseServings parses serving text into number
func (s *ScraperService) parseServings(text string) int {
	text = strings.ToLower(strings.TrimSpace(text))
	parts := strings.Fields(text)
	
	for _, part := range parts {
		if servings, err := strconv.Atoi(part); err == nil && servings > 0 && servings <= 50 {
			return servings
		}
	}
	
	return 0
} 