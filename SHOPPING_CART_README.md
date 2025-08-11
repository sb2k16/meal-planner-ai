# Shopping Cart Integration

## Current Implementation

The shopping cart system allows users to:
- Add ingredients from the meal planner to a shopping cart
- Edit quantities and add notes to cart items
- View estimated costs and totals
- Checkout with major grocery store chains

## How Checkout Works

Currently, the checkout process works as follows:

1. **User selects a grocery store** (Amazon Fresh, Walmart Grocery, Kroger, or Instacart)
2. **System generates a search URL** with the user's ingredients
3. **Opens the grocery store's website** with ingredients pre-searched
4. **User manually adds items** to their cart on the grocery store's site
5. **User completes checkout** on the grocery store's platform

## Supported Stores

- **Amazon Fresh**: Searches Amazon's grocery section with ingredient names
- **Walmart Grocery**: Searches Walmart's grocery pickup/delivery section
- **Kroger**: Searches Kroger's online shopping platform
- **Instacart**: Directs to Instacart's Costco storefront

## Limitations

- **No direct cart integration**: Items are not automatically added to grocery store carts
- **Manual process**: Users must manually find and add items on the store's website
- **Search-based**: Uses search terms rather than specific product matches
- **No real-time pricing**: Estimated costs are rough approximations

## Future Improvements

### Phase 1: Enhanced Search
- [ ] Use grocery store APIs to find exact product matches
- [ ] Implement product image recognition
- [ ] Add nutritional information matching
- [ ] Support for organic/brand preferences

### Phase 2: Direct Integration
- [ ] Amazon Product Advertising API integration
- [ ] Walmart Affiliate Program integration
- [ ] Kroger API partnership
- [ ] Instacart Connect API integration

### Phase 3: Smart Shopping
- [ ] Price comparison across stores
- [ ] Automatic substitution suggestions
- [ ] Bulk buying optimization
- [ ] Seasonal availability tracking
- [ ] Store loyalty program integration

### Phase 4: Full Automation
- [ ] One-click ordering through partnerships
- [ ] Recurring grocery delivery subscriptions
- [ ] Smart inventory management
- [ ] AI-powered meal planning with automatic ordering

## Technical Architecture

### Backend (Go)
- **Models**: ShoppingCart, ShoppingCartItem, GroceryStoreIntegration
- **API Endpoints**: 7 REST endpoints for cart management
- **URL Generation**: Store-specific URL builders for checkout
- **Database**: PostgreSQL with proper relationships and indexes

### Frontend (React/TypeScript)
- **Cart Management**: Add, edit, remove items with real-time updates
- **Store Selection**: Modal dialog with store information
- **Cost Estimation**: Real-time total calculation
- **User Feedback**: Loading states and success/error messages

## API Documentation

### Cart Endpoints
- `GET /api/cart` - Get user's active cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:id` - Update cart item
- `DELETE /api/cart/items/:id` - Remove cart item
- `DELETE /api/cart` - Clear entire cart
- `GET /api/cart/stores` - Get available stores
- `POST /api/cart/checkout/:store` - Checkout with store

### Example Usage
```bash
# Add item to cart
curl -X POST http://localhost:8080/api/cart/items \
  -H "Content-Type: application/json" \
  -H "X-User-ID: user123" \
  -d '{
    "ingredient_id": 1,
    "quantity": 2,
    "unit": "lbs",
    "notes": "Organic preferred"
  }'

# Checkout with Amazon Fresh
curl -X POST http://localhost:8080/api/cart/checkout/amazon_fresh \
  -H "X-User-ID: user123"
```

## Database Schema

```sql
-- Shopping cart for each user
CREATE TABLE shopping_carts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    total_estimated_cost DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Items in each cart
CREATE TABLE shopping_cart_items (
    id SERIAL PRIMARY KEY,
    shopping_cart_id INTEGER REFERENCES shopping_carts(id),
    ingredient_id INTEGER REFERENCES ingredients(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'g',
    estimated_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Contributing

To improve the shopping cart functionality:

1. **For better search results**: Enhance the URL generation functions in `handlers.go`
2. **For new store integrations**: Add new cases to the checkout switch statement
3. **For UI improvements**: Update the `ShoppingCart.tsx` component
4. **For API integrations**: Implement store-specific API clients

## Known Issues

- Amazon Fresh URLs may occasionally return 404 if the search parameters are malformed
- Price estimates are not accurate and should not be relied upon for budgeting
- Some stores may not support all ingredient types in their search
- Cart persistence is per-session and not saved long-term

## Support

For issues or feature requests related to the shopping cart:
1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Include steps to reproduce any bugs
4. Provide browser/environment information 