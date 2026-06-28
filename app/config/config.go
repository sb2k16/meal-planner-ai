package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	Port        string
	USDAAPIKey  string
	Environment string
}

func Load() (*Config, error) {
	// Load .env file if it exists
	godotenv.Load()

	config := &Config{
		DatabaseURL: getEnv("DATABASE_URL", "postgres://mealplanner:mealplanner123@localhost:5432/mealplanner?sslmode=disable"),
		Port:        getEnv("PORT", "8080"),
		USDAAPIKey:  getEnv("USDA_API_KEY", ""),
		Environment: getEnv("ENVIRONMENT", "development"),
	}

	return config, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
} 