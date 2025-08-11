-- Simple table for scraped recipes
CREATE TABLE IF NOT EXISTS simple_scraped_recipes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    instructions TEXT,
    prep_time VARCHAR(100),
    cook_time VARCHAR(100),
    servings VARCHAR(100),
    source_url TEXT UNIQUE NOT NULL,
    source_site VARCHAR(100) NOT NULL,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_simple_scraped_recipes_source_site ON simple_scraped_recipes(source_site);
CREATE INDEX IF NOT EXISTS idx_simple_scraped_recipes_scraped_at ON simple_scraped_recipes(scraped_at);
CREATE INDEX IF NOT EXISTS idx_simple_scraped_recipes_source_url ON simple_scraped_recipes(source_url); 