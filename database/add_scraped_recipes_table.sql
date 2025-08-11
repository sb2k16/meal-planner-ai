-- Add scraped recipes table for centralized recipe database
CREATE TABLE IF NOT EXISTS scraped_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    source_url VARCHAR(1000) NOT NULL UNIQUE,
    source_site VARCHAR(100) NOT NULL, -- allrecipes, bbcgoodfood, etc.
    image_url VARCHAR(1000),
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    total_time_minutes INTEGER,
    servings INTEGER DEFAULT 4,
    difficulty_level VARCHAR(20) DEFAULT 'Medium',
    cuisine_type VARCHAR(100),
    
    -- Nutritional information
    calories_per_serving INTEGER,
    protein_per_serving DECIMAL(5,2),
    fat_per_serving DECIMAL(5,2),
    carbs_per_serving DECIMAL(5,2),
    fiber_per_serving DECIMAL(5,2),
    sodium_per_serving DECIMAL(7,2),
    
    -- Raw scraped data
    raw_ingredients TEXT, -- JSON array of raw ingredient text
    raw_instructions TEXT, -- JSON array of raw instruction steps
    
    -- LLM processed data
    structured_ingredients JSONB, -- Normalized ingredient objects
    structured_instructions JSONB, -- Structured instruction steps
    dietary_tags JSONB, -- Array of dietary tags (vegan, keto, etc.)
    
    -- Metadata
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP, -- When LLM processing was completed
    processing_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    processing_error TEXT,
    quality_score INTEGER DEFAULT 0, -- 0-100 quality score based on completeness
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scraped_recipes_source_site ON scraped_recipes(source_site);
CREATE INDEX IF NOT EXISTS idx_scraped_recipes_cuisine_type ON scraped_recipes(cuisine_type);
CREATE INDEX IF NOT EXISTS idx_scraped_recipes_processing_status ON scraped_recipes(processing_status);
CREATE INDEX IF NOT EXISTS idx_scraped_recipes_title_search ON scraped_recipes USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_scraped_recipes_dietary_tags ON scraped_recipes USING gin(dietary_tags);

-- Create recipe search suggestions table
CREATE TABLE IF NOT EXISTS recipe_search_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_query VARCHAR(500) NOT NULL,
    suggested_scraped_recipe_id UUID REFERENCES scraped_recipes(id) ON DELETE CASCADE,
    confidence_score DECIMAL(3,2), -- 0.00-1.00
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recipe_search_suggestions_query ON recipe_search_suggestions(search_query);

-- Create table to track scraping jobs
CREATE TABLE IF NOT EXISTS scraping_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_site VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed
    total_urls INTEGER DEFAULT 0,
    scraped_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scraped_recipes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scraped_recipes_updated_at
    BEFORE UPDATE ON scraped_recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_scraped_recipes_updated_at(); 