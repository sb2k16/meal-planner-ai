-- Migration to add shopping cart tables
-- Run this to add shopping cart functionality to existing database

-- Shopping cart tables for online grocery ordering
CREATE TABLE IF NOT EXISTS shopping_carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) NOT NULL,
    name VARCHAR(200) DEFAULT 'My Cart',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'checked_out', 'abandoned')),
    total_estimated_cost DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shopping_cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopping_cart_id UUID NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    estimated_cost DECIMAL(8,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Grocery store integrations
CREATE TABLE IF NOT EXISTS grocery_store_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    api_endpoint VARCHAR(500) NOT NULL,
    api_key VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    supported_areas TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- External cart sessions for checkout
CREATE TABLE IF NOT EXISTS external_cart_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopping_cart_id UUID NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
    grocery_store VARCHAR(100) NOT NULL,
    external_session_id VARCHAR(200),
    checkout_url VARCHAR(1000),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'redirected', 'completed', 'failed')),
    total_cost DECIMAL(10,2),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shopping_carts_user ON shopping_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_carts_status ON shopping_carts(status);
CREATE INDEX IF NOT EXISTS idx_shopping_cart_items_cart ON shopping_cart_items(shopping_cart_id);
CREATE INDEX IF NOT EXISTS idx_external_cart_sessions_cart ON external_cart_sessions(shopping_cart_id);
CREATE INDEX IF NOT EXISTS idx_external_cart_sessions_store ON external_cart_sessions(grocery_store);

-- Add update triggers for the new tables (reuse existing function)
CREATE TRIGGER update_shopping_carts_updated_at BEFORE UPDATE ON shopping_carts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopping_cart_items_updated_at BEFORE UPDATE ON shopping_cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grocery_store_integrations_updated_at BEFORE UPDATE ON grocery_store_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_external_cart_sessions_updated_at BEFORE UPDATE ON external_cart_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default grocery store integrations
INSERT INTO grocery_store_integrations (name, api_endpoint, is_active, supported_areas) VALUES
('Amazon Fresh', 'https://www.amazon.com/alm/storefront', true, ARRAY['US', 'CA']),
('Walmart Grocery', 'https://www.walmart.com/grocery', true, ARRAY['US']),
('Instacart', 'https://www.instacart.com/store', true, ARRAY['US', 'CA']),
('Kroger', 'https://www.kroger.com/pl', true, ARRAY['US'])
ON CONFLICT DO NOTHING; 