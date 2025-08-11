-- Add centralized scraped recipes table
-- This table stores processed and structured scraped recipes

CREATE TABLE IF NOT EXISTS centralized_scraped_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    source_url VARCHAR(1000) NOT NULL UNIQUE,
    source_site VARCHAR(100) NOT NULL,
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
    raw_ingredients TEXT,   -- JSON array of raw ingredient text
    raw_instructions TEXT,  -- JSON array of raw instruction steps
    
    -- LLM processed data
    structured_ingredients JSONB, -- Normalized ingredient objects
    structured_instructions JSONB, -- Structured instruction steps
    dietary_tags JSONB,           -- Array of dietary tags
    
    -- Metadata
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_status VARCHAR(20) DEFAULT 'pending',
    processing_error TEXT,
    quality_score INTEGER DEFAULT 0,
    
    -- Standard timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_centralized_scraped_recipes_source_site ON centralized_scraped_recipes(source_site);
CREATE INDEX IF NOT EXISTS idx_centralized_scraped_recipes_cuisine_type ON centralized_scraped_recipes(cuisine_type);
CREATE INDEX IF NOT EXISTS idx_centralized_scraped_recipes_difficulty ON centralized_scraped_recipes(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_centralized_scraped_recipes_processing_status ON centralized_scraped_recipes(processing_status);
CREATE INDEX IF NOT EXISTS idx_centralized_scraped_recipes_quality_score ON centralized_scraped_recipes(quality_score);

-- Add trigger for updated_at
CREATE TRIGGER update_centralized_scraped_recipes_updated_at 
    BEFORE UPDATE ON centralized_scraped_recipes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 