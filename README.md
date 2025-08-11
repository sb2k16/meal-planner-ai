# Meal Planner Application

A comprehensive meal planning application that helps users manage recipes, calculate calories, and create weekly meal plans based on budget and nutritional requirements.

## Features

- **Recipe Management**: Store and organize recipes by cuisine and ingredients
- **Calorie Tracking**: Automatic calorie calculation using USDA FoodData Central API
- **Web Scraping**: Extract recipes from public web pages
- **Meal Planning**: Generate weekly meal plans based on budget, calories, and cooking time
- **Multi-cuisine Support**: Organize recipes by different cuisines
- **Ingredient Management**: Track ingredients with nutritional information

## Technology Stack

- **Backend**: Go (Golang)
- **Frontend**: React with TypeScript
- **Database**: PostgreSQL
- **APIs**: USDA FoodData Central API
- **Web Scraping**: Custom Go implementation

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

### Environment Variables
Create `.env` files in both backend and frontend directories with required configuration.

## API Documentation

### Recipes
- `GET /api/recipes` - List all recipes
- `POST /api/recipes` - Create new recipe
- `GET /api/recipes/{id}` - Get recipe by ID
- `PUT /api/recipes/{id}` - Update recipe
- `DELETE /api/recipes/{id}` - Delete recipe

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