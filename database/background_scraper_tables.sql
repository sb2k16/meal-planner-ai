-- Background Scraper Service Database Tables
-- This migration creates tables to support the background scraping service

-- Table to track scraping jobs and their status
CREATE TABLE IF NOT EXISTS scraping_jobs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(255) UNIQUE NOT NULL, -- Unique identifier for the job
    url TEXT NOT NULL,
    source_site VARCHAR(100) NOT NULL,
    priority INTEGER DEFAULT 3, -- 1=high, 5=low
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, retrying
    retries INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    worker_id INTEGER,
    processing_time_ms BIGINT,
    result_recipe_id INTEGER, -- Reference to created recipe
    metadata JSONB -- Additional job metadata
);

-- Table to track daily scraping statistics
CREATE TABLE IF NOT EXISTS scraping_daily_stats (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    site VARCHAR(100) NOT NULL,
    total_jobs INTEGER DEFAULT 0,
    successful_scrapes INTEGER DEFAULT 0,
    failed_scrapes INTEGER DEFAULT 0,
    average_processing_time_ms BIGINT DEFAULT 0,
    total_processing_time_ms BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, site)
);

-- Table to track worker performance statistics
CREATE TABLE IF NOT EXISTS scraping_worker_stats (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER NOT NULL,
    date DATE NOT NULL,
    jobs_processed INTEGER DEFAULT 0,
    successful_jobs INTEGER DEFAULT 0,
    failed_jobs INTEGER DEFAULT 0,
    total_processing_time_ms BIGINT DEFAULT 0,
    average_processing_time_ms BIGINT DEFAULT 0,
    last_job_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(worker_id, date)
);

-- Table to store scraping configuration
CREATE TABLE IF NOT EXISTS scraping_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to track discovered URLs before they become jobs
CREATE TABLE IF NOT EXISTS discovered_urls (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    source_site VARCHAR(100) NOT NULL,
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    discovery_method VARCHAR(100), -- sitemap, category_page, social_trends, etc.
    priority INTEGER DEFAULT 3,
    already_scraped BOOLEAN DEFAULT FALSE,
    queued_for_scraping BOOLEAN DEFAULT FALSE,
    scraped_at TIMESTAMP,
    metadata JSONB,
    UNIQUE(url)
);

-- Table to track source site configurations and their health
CREATE TABLE IF NOT EXISTS scraping_sources (
    id SERIAL PRIMARY KEY,
    site_name VARCHAR(100) UNIQUE NOT NULL,
    base_url TEXT NOT NULL,
    sitemap_url TEXT,
    category_urls JSONB, -- Array of category URLs
    enabled BOOLEAN DEFAULT TRUE,
    max_daily_scrapes INTEGER DEFAULT 100,
    scrape_interval_minutes INTEGER DEFAULT 60,
    priority INTEGER DEFAULT 3,
    rate_limit_delay_ms INTEGER DEFAULT 2000,
    last_scrape_at TIMESTAMP,
    last_successful_scrape_at TIMESTAMP,
    consecutive_failures INTEGER DEFAULT 0,
    total_scrapes BIGINT DEFAULT 0,
    successful_scrapes BIGINT DEFAULT 0,
    failed_scrapes BIGINT DEFAULT 0,
    health_status VARCHAR(50) DEFAULT 'healthy', -- healthy, degraded, unhealthy
    health_check_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to track scraping patterns and optimize discovery
CREATE TABLE IF NOT EXISTS scraping_patterns (
    id SERIAL PRIMARY KEY,
    site VARCHAR(100) NOT NULL,
    pattern_type VARCHAR(100) NOT NULL, -- url_pattern, content_pattern, timing_pattern
    pattern_value TEXT NOT NULL,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    total_attempts INTEGER DEFAULT 0,
    successful_attempts INTEGER DEFAULT 0,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_source_site ON scraping_jobs(source_site);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created_at ON scraping_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_priority ON scraping_jobs(priority);

CREATE INDEX IF NOT EXISTS idx_scraping_daily_stats_date ON scraping_daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_scraping_daily_stats_site ON scraping_daily_stats(site);

CREATE INDEX IF NOT EXISTS idx_scraping_worker_stats_worker_date ON scraping_worker_stats(worker_id, date);

CREATE INDEX IF NOT EXISTS idx_discovered_urls_scraped ON discovered_urls(already_scraped);
CREATE INDEX IF NOT EXISTS idx_discovered_urls_queued ON discovered_urls(queued_for_scraping);
CREATE INDEX IF NOT EXISTS idx_discovered_urls_site ON discovered_urls(source_site);
CREATE INDEX IF NOT EXISTS idx_discovered_urls_discovered_at ON discovered_urls(discovered_at);

CREATE INDEX IF NOT EXISTS idx_scraping_sources_enabled ON scraping_sources(enabled);
CREATE INDEX IF NOT EXISTS idx_scraping_sources_health ON scraping_sources(health_status);

-- Insert default scraping source configurations
INSERT INTO scraping_sources (site_name, base_url, sitemap_url, category_urls, enabled, max_daily_scrapes, scrape_interval_minutes, priority) VALUES
('allrecipes', 'https://www.allrecipes.com', 'https://www.allrecipes.com/sitemap.xml', 
 '["https://www.allrecipes.com/recipes/17562/dinner/", "https://www.allrecipes.com/recipes/78/breakfast-and-brunch/", "https://www.allrecipes.com/recipes/79/desserts/"]'::jsonb,
 true, 150, 60, 2),

('bbcgoodfood', 'https://www.bbcgoodfood.com', 'https://www.bbcgoodfood.com/sitemap.xml',
 '["https://www.bbcgoodfood.com/recipes/category/quick", "https://www.bbcgoodfood.com/recipes/category/healthy", "https://www.bbcgoodfood.com/recipes/category/vegetarian"]'::jsonb,
 true, 100, 120, 2),

('epicurious', 'https://www.epicurious.com', NULL,
 '["https://www.epicurious.com/recipes-menus/quick-easy-recipes", "https://www.epicurious.com/recipes-menus/healthy-recipes"]'::jsonb,
 true, 80, 180, 3),

('seriouseats', 'https://www.seriouseats.com', NULL,
 '["https://www.seriouseats.com/recipes"]'::jsonb,
 true, 60, 240, 3),

('food52', 'https://food52.com', NULL,
 '["https://food52.com/recipes", "https://food52.com/recipes/quick-and-easy"]'::jsonb,
 true, 70, 200, 3)

ON CONFLICT (site_name) DO NOTHING;

-- Insert default scraping configuration
INSERT INTO scraping_config (config_key, config_value, description) VALUES
('worker_count', '5', 'Number of concurrent scraping workers'),
('scrape_interval_minutes', '30', 'Interval between scraping rounds in minutes'),
('max_urls_per_batch', '50', 'Maximum URLs to process in one batch'),
('rate_limit_delay_ms', '2000', 'Delay between requests in milliseconds'),
('max_retries_per_url', '3', 'Maximum retry attempts for failed URLs'),
('discovery_enabled', 'true', 'Enable automatic URL discovery'),
('discovery_interval_hours', '2', 'Interval between URL discovery rounds'),
('cleanup_old_jobs_days', '7', 'Days to keep completed job records'),
('health_check_interval_minutes', '15', 'Interval for source health checks')

ON CONFLICT (config_key) DO NOTHING;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_scraping_daily_stats_updated_at BEFORE UPDATE ON scraping_daily_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scraping_worker_stats_updated_at BEFORE UPDATE ON scraping_worker_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scraping_config_updated_at BEFORE UPDATE ON scraping_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scraping_sources_updated_at BEFORE UPDATE ON scraping_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scraping_patterns_updated_at BEFORE UPDATE ON scraping_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for scraping overview dashboard
CREATE OR REPLACE VIEW scraping_overview AS
SELECT 
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_jobs,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_jobs,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_jobs,
    AVG(CASE WHEN status = 'completed' AND processing_time_ms IS NOT NULL THEN processing_time_ms END) as avg_processing_time_ms,
    MAX(completed_at) as last_completion
FROM scraping_jobs;

-- View for source health monitoring
CREATE OR REPLACE VIEW source_health_summary AS
SELECT 
    site_name,
    enabled,
    health_status,
    total_scrapes,
    successful_scrapes,
    failed_scrapes,
    CASE 
        WHEN total_scrapes > 0 THEN ROUND((successful_scrapes::DECIMAL / total_scrapes::DECIMAL) * 100, 2)
        ELSE 0 
    END as success_rate_percent,
    consecutive_failures,
    last_successful_scrape_at,
    health_check_at
FROM scraping_sources
ORDER BY health_status, success_rate_percent DESC; 