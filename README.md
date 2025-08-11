# MealPlanner AI

A comprehensive AI-powered meal planning application that helps users manage recipes, calculate calories, and create weekly meal plans based on budget and nutritional requirements.

## Features

- **AI Recipe Generation**: Generate recipes using OpenAI LLM
- **Recipe Management**: Store and organize recipes by cuisine and ingredients
- **Calorie Tracking**: Automatic calorie calculation using USDA FoodData Central API
- **Web Scraping**: Extract recipes from public web pages with AI processing
- **Meal Planning**: Generate weekly meal plans based on budget, calories, and cooking time
- **Multi-cuisine Support**: Organize recipes by different cuisines
- **Ingredient Management**: Track ingredients with nutritional information
- **Shopping Cart**: Manage shopping lists and meal planning
- **User Preferences**: Personalized dietary and cuisine preferences

## Technology Stack

- **Backend**: Go (Golang) with Gin framework
- **Frontend**: React with TypeScript and Material-UI
- **Database**: PostgreSQL with GORM ORM
- **APIs**: USDA FoodData Central API, OpenAI GPT-4
- **AI Services**: Recipe generation, dietary analysis, instruction improvement
- **Web Scraping**: Custom Go implementation with AI processing

## Project Structure

```
MealPlanner/
├── backend/                 # Go backend application
│   ├── cmd/                # Application entrypoints
│   ├── internal/           # Internal application code
│   │   ├── api/           # API handlers
│   │   ├── models/        # Data models
│   │   ├── services/      # Business logic
│   │   └── config/        # Configuration
│   ├── pkg/               # Public packages
│   ├── migrations/        # Database migrations
│   └── go.mod
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   ├── public/
│   └── package.json
├── database/              # Database schema and seeds
│   ├── schema.sql
│   └── seeds.sql
├── docker-compose.yml     # Docker configuration
└── README.md
```

## Setup Instructions

### Prerequisites
- Go 1.21+
- Node.js 18+
- PostgreSQL 14+
- Docker (optional)
- OpenAI API key

### Environment Variables
Create a `.env` file in the root directory:
```bash
DATABASE_URL=postgres://username:password@localhost:5432/mealplanner?sslmode=disable
USDA_API_KEY=your_usda_api_key
OPENAI_API_KEY=your_openai_api_key
PORT=8080
ENVIRONMENT=development
```

### Database Setup
1. Create PostgreSQL database
2. Run migrations from `database/schema.sql`
3. Optionally seed with sample data from `database/seeds.sql`

### Backend Setup
```bash
cd backend
go mod tidy
go run cmd/server/main.go
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## API Documentation

### Recipes
- `GET /api/recipes` - List all recipes
- `POST /api/recipes` - Create new recipe
- `GET /api/recipes/{id}` - Get recipe by ID
- `PUT /api/recipes/{id}` - Update recipe
- `DELETE /api/recipes/{id}` - Delete recipe

### AI Services
- `POST /api/ai/generate-recipe` - Generate recipe using AI
- `POST /api/ai/process-scraped` - Process scraped recipe with AI
- `POST /api/ai/improve-instructions` - Improve recipe instructions

### Ingredients  
- `GET /api/ingredients` - List all ingredients
- `POST /api/ingredients` - Create new ingredient
- `GET /api/ingredients/search` - Search USDA database

### Meal Plans
- `GET /api/meal-plans` - List meal plans
- `POST /api/meal-plans` - Create meal plan
- `POST /api/meal-plans/generate` - Generate weekly meal plan

### Web Scraping
- `POST /api/scrape` - Extract recipe from URL

## License

MIT License
