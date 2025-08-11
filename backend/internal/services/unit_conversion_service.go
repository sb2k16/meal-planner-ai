package services

import (
	"fmt"
	"strings"
)

// UnitConversionService handles converting various units to grams
type UnitConversionService struct {
	conversions map[string]map[string]float64
}

// NewUnitConversionService creates a new unit conversion service
func NewUnitConversionService() *UnitConversionService {
	conversions := map[string]map[string]float64{
		// Oils and liquids
		"olive oil": {
			"1 tbsp":     13.5,
			"1 tsp":      4.5,
			"1 cup":      216,
			"1 ml":       0.92,
			"1 fl oz":    27.4,
		},
		"vegetable oil": {
			"1 tbsp":     13.6,
			"1 tsp":      4.5,
			"1 cup":      218,
			"1 ml":       0.92,
		},
		
		// Dairy products
		"parmesan cheese": {
			"1 tbsp":     5,
			"1 cup":      100,
			"1 oz":       28.35,
		},
		"mozzarella cheese": {
			"1 cup":      113,
			"1 oz":       28.35,
			"1 slice":    28,
		},
		"milk": {
			"1 cup":      244,
			"1 tbsp":     15,
			"1 fl oz":    30,
		},
		"butter": {
			"1 tbsp":     14,
			"1 tsp":      5,
			"1 cup":      227,
			"1 stick":    113,
		},
		
		// Vegetables
		"cherry tomatoes": {
			"1 cup":      150,
			"1 medium":   17,
		},
		"onion": {
			"1 medium":   110,
			"1 large":    150,
			"1 small":    70,
			"1 cup":      160,
		},
		"garlic": {
			"1 clove":    3,
			"1 tbsp":     8,
			"1 tsp":      3,
		},
		"bell pepper": {
			"1 medium":   119,
			"1 large":    164,
			"1 cup":      150,
		},
		"carrots": {
			"1 medium":   61,
			"1 large":    72,
			"1 cup":      122,
		},
		"celery": {
			"1 stalk":    40,
			"1 cup":      101,
		},
		"spinach": {
			"1 cup":      30,
			"1 handful":  85,
		},
		
		// Grains and starches
		"rice": {
			"1 cup":      185,
			"1 tbsp":     12,
		},
		"pasta": {
			"1 cup":      124,
			"1 oz":       28.35,
		},
		"bread": {
			"1 slice":    28,
			"1 cup":      50,
		},
		"flour": {
			"1 cup":      120,
			"1 tbsp":     8,
			"1 tsp":      3,
		},
		
		// Proteins
		"chicken breast": {
			"1 lb":       454,
			"1 oz":       28.35,
			"1 piece":    174,
		},
		"ground beef": {
			"1 lb":       454,
			"1 oz":       28.35,
		},
		"eggs": {
			"1 large":    50,
			"1 medium":   44,
			"1 small":    38,
		},
		
		// Spices and seasonings
		"salt": {
			"1 tsp":      6,
			"1 tbsp":     18,
		},
		"black pepper": {
			"1 tsp":      2,
			"1 tbsp":     6,
		},
		"paprika": {
			"1 tsp":      2,
			"1 tbsp":     7,
		},
		"cumin": {
			"1 tsp":      2,
			"1 tbsp":     6,
		},
		"oregano": {
			"1 tsp":      1,
			"1 tbsp":     3,
		},
		"basil": {
			"1 tsp":      1,
			"1 tbsp":     2,
		},
		
		// Default conversions for common units
		"default": {
			"1 tbsp":     15,
			"1 tsp":      5,
			"1 cup":      240,
			"1 oz":       28.35,
			"1 lb":       454,
			"1 kg":       1000,
			"1 g":        1,
		},
	}
	
	return &UnitConversionService{
		conversions: conversions,
	}
}

// ConvertToGrams converts a quantity and unit to grams for a specific ingredient
func (s *UnitConversionService) ConvertToGrams(ingredientName string, quantity float64, unit string) (float64, error) {
	// Normalize ingredient name (lowercase, remove extra spaces)
	normalizedName := strings.ToLower(strings.TrimSpace(ingredientName))
	normalizedUnit := strings.ToLower(strings.TrimSpace(unit))
	
	// If unit is already grams, return as-is
	if normalizedUnit == "g" || normalizedUnit == "gram" || normalizedUnit == "grams" {
		return quantity, nil
	}
	
	// Try different unit formats
	unitVariations := []string{
		normalizedUnit,
		"1 " + normalizedUnit,
	}
	
	// Try to find conversion for specific ingredient
	if ingredientConversions, exists := s.conversions[normalizedName]; exists {
		for _, unitVariation := range unitVariations {
			if gramsPerUnit, unitExists := ingredientConversions[unitVariation]; unitExists {
				return quantity * gramsPerUnit, nil
			}
		}
	}
	
	// Fall back to default conversions
	if defaultConversions, exists := s.conversions["default"]; exists {
		for _, unitVariation := range unitVariations {
			if gramsPerUnit, unitExists := defaultConversions[unitVariation]; unitExists {
				return quantity * gramsPerUnit, nil
			}
		}
	}
	
	// If no conversion found, return error
	return 0, fmt.Errorf("no conversion found for unit '%s' for ingredient '%s'", unit, ingredientName)
}

// GetSupportedUnits returns all supported units for a given ingredient
func (s *UnitConversionService) GetSupportedUnits(ingredientName string) []string {
	normalizedName := strings.ToLower(strings.TrimSpace(ingredientName))
	
	var units []string
	
	// Add ingredient-specific units
	if ingredientConversions, exists := s.conversions[normalizedName]; exists {
		for unit := range ingredientConversions {
			units = append(units, unit)
		}
	}
	
	// Add default units
	if defaultConversions, exists := s.conversions["default"]; exists {
		for unit := range defaultConversions {
			// Avoid duplicates
			found := false
			for _, existingUnit := range units {
				if existingUnit == unit {
					found = true
					break
				}
			}
			if !found {
				units = append(units, unit)
			}
		}
	}
	
	return units
}

// AddConversion adds a new unit conversion for an ingredient
func (s *UnitConversionService) AddConversion(ingredientName, unit string, gramsPerUnit float64) {
	normalizedName := strings.ToLower(strings.TrimSpace(ingredientName))
	normalizedUnit := strings.ToLower(strings.TrimSpace(unit))
	
	if s.conversions[normalizedName] == nil {
		s.conversions[normalizedName] = make(map[string]float64)
	}
	
	s.conversions[normalizedName][normalizedUnit] = gramsPerUnit
} 