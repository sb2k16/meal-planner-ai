-- Enhanced User Preferences System for Personalized Meal Planning

-- Main user preferences table (explicit preferences)
CREATE TABLE IF NOT EXISTS user_preferences_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL UNIQUE,
    
    -- Explicit Dietary Preferences
    dietary_restrictions JSONB DEFAULT '[]', -- ["vegan", "keto", "halal"]
    allergies JSONB DEFAULT '[]',           -- ["nuts", "gluten", "dairy", "eggs"]
    favorite_cuisines JSONB DEFAULT '{}',   -- {"indian": 0.9, "thai": 0.6, "mexican": 0.3}
    avoided_ingredients JSONB DEFAULT '[]', -- ["tofu", "mushrooms", "cilantro"]
    favorite_ingredients JSONB DEFAULT '[]', -- ["garlic", "basil", "chicken"]
    
    -- Cooking Preferences
    cooking_skill_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced
    max_prep_time_minutes INTEGER DEFAULT 45,
    max_cook_time_minutes INTEGER DEFAULT 60,
    preferred_meal_times JSONB DEFAULT '["dinner"]', -- ["breakfast", "lunch", "dinner", "snack"]
    
    -- Health & Nutrition Goals
    daily_calorie_goal INTEGER,
    daily_protein_goal DECIMAL(5,2),
    daily_carb_goal DECIMAL(5,2),
    daily_fat_goal DECIMAL(5,2),
    weekly_budget_limit DECIMAL(10,2),
    
    -- Kitchen Setup
    available_equipment JSONB DEFAULT '[]', -- ["oven", "air_fryer", "blender", "slow_cooker"]
    kitchen_size VARCHAR(20) DEFAULT 'medium', -- small, medium, large
    
    -- Lifestyle Preferences
    meal_prep_style VARCHAR(30) DEFAULT 'fresh_daily', -- batch_cook, fresh_daily, leftovers_friendly
    family_size INTEGER DEFAULT 2,
    preferred_shopping_frequency VARCHAR(20) DEFAULT 'weekly', -- daily, weekly, biweekly
    
    -- Personalization Settings
    recommendation_style VARCHAR(30) DEFAULT 'balanced', -- adventurous, balanced, conservative
    onboarding_completed BOOLEAN DEFAULT FALSE,
    preferences_last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User behavior tracking for implicit preferences
CREATE TABLE IF NOT EXISTS user_behavior_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- recipe_viewed, recipe_saved, recipe_cooked, recipe_disliked, etc.
    
    -- Event Context
    recipe_id UUID,
    ingredient_id UUID,
    cuisine_type VARCHAR(50),
    meal_type VARCHAR(20), -- breakfast, lunch, dinner, snack
    
    -- Event Details
    event_data JSONB, -- Additional context like duration, rating, etc.
    session_id VARCHAR(100),
    
    -- Metadata
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    device_type VARCHAR(20), -- web, mobile, tablet
    source VARCHAR(30) -- search, recommendation, browse, ai_generated
);

CREATE INDEX IF NOT EXISTS idx_user_behavior_user_id ON user_behavior_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_event_type ON user_behavior_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_behavior_timestamp ON user_behavior_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_behavior_recipe_id ON user_behavior_events(recipe_id);

-- Computed preference scores (updated periodically)
CREATE TABLE IF NOT EXISTS user_preference_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    preference_type VARCHAR(50) NOT NULL, -- cuisine, ingredient, cooking_method, difficulty, etc.
    preference_value VARCHAR(100) NOT NULL, -- italian, chicken, baking, easy, etc.
    
    -- Scoring
    explicit_score DECIMAL(3,2) DEFAULT 0.0, -- User-provided preference (0.0 to 1.0)
    implicit_score DECIMAL(3,2) DEFAULT 0.0, -- Behavior-inferred score (0.0 to 1.0)
    combined_score DECIMAL(3,2) DEFAULT 0.0, -- Weighted combination
    confidence DECIMAL(3,2) DEFAULT 0.0,     -- How confident we are in this score
    
    -- Metadata
    interaction_count INTEGER DEFAULT 0,
    last_interaction TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, preference_type, preference_value)
);

CREATE INDEX IF NOT EXISTS idx_preference_scores_user_id ON user_preference_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_preference_scores_type ON user_preference_scores(preference_type);
CREATE INDEX IF NOT EXISTS idx_preference_scores_combined ON user_preference_scores(combined_score DESC);

-- Recipe recommendations cache
CREATE TABLE IF NOT EXISTS user_recipe_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    recipe_id UUID NOT NULL,
    
    -- Recommendation scoring
    relevance_score DECIMAL(3,2) NOT NULL, -- How well this recipe matches user preferences
    diversity_boost DECIMAL(3,2) DEFAULT 0.0, -- Boost for trying new things
    freshness_score DECIMAL(3,2) DEFAULT 1.0, -- Recency of recipe addition
    final_score DECIMAL(3,2) NOT NULL,
    
    -- Recommendation context
    recommendation_reason JSONB, -- ["matches_cuisine_preference", "healthy_choice", "quick_meal"]
    meal_type VARCHAR(20),
    recommended_for_date DATE,
    
    -- Status tracking
    shown_to_user BOOLEAN DEFAULT FALSE,
    user_action VARCHAR(20), -- viewed, saved, cooked, dismissed, null
    user_feedback INTEGER, -- 1-5 rating, null if no feedback
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON user_recipe_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_score ON user_recipe_recommendations(final_score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_expires ON user_recipe_recommendations(expires_at);

-- User feedback and ratings
CREATE TABLE IF NOT EXISTS user_recipe_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    recipe_id UUID NOT NULL,
    
    -- Feedback
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    would_cook_again BOOLEAN,
    difficulty_actual VARCHAR(20), -- easy, medium, hard
    time_taken_minutes INTEGER,
    
    -- Detailed feedback
    liked_aspects JSONB, -- ["taste", "easy_to_follow", "healthy"]
    disliked_aspects JSONB, -- ["too_spicy", "took_too_long", "expensive"]
    modifications_made TEXT,
    notes TEXT,
    
    -- Context
    cooked_for_meal_type VARCHAR(20),
    cooked_for_people INTEGER,
    cooking_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, recipe_id)
);

-- User onboarding progress
CREATE TABLE IF NOT EXISTS user_onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL UNIQUE,
    
    -- Onboarding steps completion
    basic_info_completed BOOLEAN DEFAULT FALSE,
    dietary_preferences_completed BOOLEAN DEFAULT FALSE,
    cooking_preferences_completed BOOLEAN DEFAULT FALSE,
    kitchen_setup_completed BOOLEAN DEFAULT FALSE,
    goal_setting_completed BOOLEAN DEFAULT FALSE,
    first_recipe_interaction BOOLEAN DEFAULT FALSE,
    
    -- Progress tracking
    completion_percentage DECIMAL(3,0) DEFAULT 0,
    current_step VARCHAR(50),
    onboarding_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    onboarding_completed_at TIMESTAMP,
    
    -- Onboarding customization
    onboarding_version VARCHAR(10) DEFAULT 'v1.0',
    skip_advanced_features BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Preference learning experiments (A/B testing)
CREATE TABLE IF NOT EXISTS preference_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    experiment_name VARCHAR(100) NOT NULL,
    variant VARCHAR(50) NOT NULL, -- control, variant_a, variant_b
    
    -- Experiment data
    parameters JSONB,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    
    -- Results
    conversion_events JSONB DEFAULT '[]',
    success_metric DECIMAL(5,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Functions for updating scores
CREATE OR REPLACE FUNCTION update_user_preference_scores()
RETURNS TRIGGER AS $$
BEGIN
    -- Update preference scores based on behavior events
    -- This would be called by a trigger or background job
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_recommendations()
RETURNS void AS $$
BEGIN
    DELETE FROM user_recipe_recommendations 
    WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trigger_update_preferences_timestamp
    BEFORE UPDATE ON user_preferences_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_scores_timestamp
    BEFORE UPDATE ON user_preference_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql; 