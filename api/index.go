// Package handler is the Vercel serverless entrypoint for the MealPlanner API.
//
// The entire Gin application is wrapped in a single serverless function. All
// requests to /api/* are rewritten to this function (see vercel.json), and the
// Gin router (registered under /api by Handlers.SetupRoutes) dispatches them.
//
// Initialization (DB connection + service construction) happens once per warm
// instance via sync.Once so that subsequent invocations reuse the connection
// pool instead of reconnecting on every request.
package handler

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"mealplanner/internal/api"
	"mealplanner/internal/config"
	"mealplanner/internal/services"
)

var (
	engine   *gin.Engine
	initOnce sync.Once
	initErr  error
)

func setup() {
	cfg, err := config.Load()
	if err != nil {
		initErr = err
		return
	}

	gormDB, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{})
	if err != nil {
		initErr = err
		return
	}

	sqlDB, err := gormDB.DB()
	if err != nil {
		initErr = err
		return
	}

	// Serverless functions are short-lived and many may run concurrently, so
	// keep the per-instance pool small to avoid exhausting database connections.
	// Pair this with a pooled connection string (e.g. Neon's pooler endpoint).
	sqlDB.SetMaxOpenConns(4)
	sqlDB.SetMaxIdleConns(2)
	sqlDB.SetConnMaxIdleTime(30 * time.Second)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	// Construct services (mirrors what cmd/server/main.go would have done).
	usdaService := services.NewUSDAService(cfg.USDAAPIKey)
	scraperService := services.NewScraperService()
	mealPlanService := services.NewMealPlanService(gormDB)
	unitConverter := services.NewUnitConversionService()
	nutritionService := services.NewNutritionService(unitConverter)
	llmService := services.NewLLMService(usdaService)
	aiMealPlanService := services.NewAIMealPlanService(gormDB, mealPlanService, llmService, nutritionService, unitConverter)
	scrapedRecipeService := services.NewScrapedRecipeService(sqlDB)

	h := api.NewHandlers(
		gormDB,
		usdaService,
		scraperService,
		mealPlanService,
		aiMealPlanService,
		llmService,
		nutritionService,
		unitConverter,
		scrapedRecipeService,
	)

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())

	// CORS is harmless on the single-domain (rewrite) setup and useful if the
	// frontend is ever served from a different origin.
	corsCfg := cors.DefaultConfig()
	corsCfg.AllowAllOrigins = true
	corsCfg.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	corsCfg.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	r.Use(cors.New(corsCfg))

	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	h.SetupRoutes(r)
	engine = r
}

// Handler is the function entrypoint invoked by the Vercel Go runtime.
func Handler(w http.ResponseWriter, r *http.Request) {
	initOnce.Do(setup)
	if initErr != nil {
		http.Error(w, "server initialization failed: "+initErr.Error(), http.StatusInternalServerError)
		return
	}
	engine.ServeHTTP(w, r)
}
