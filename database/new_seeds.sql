-- Clear existing data
TRUNCATE TABLE cuisines, ingredients, recipes, recipe_ingredients, recipe_tags, recipe_tag_associations, meal_plans, meal_plan_entries, shopping_lists, shopping_list_items, user_preferences, shopping_carts, shopping_cart_items, grocery_store_integrations, external_cart_sessions RESTART IDENTITY CASCADE;

-- Insert sample cuisines
INSERT INTO cuisines (name, description) VALUES
('Italian', 'Traditional Italian cuisine with pasta, pizza, and Mediterranean flavors'),
('Mexican', 'Spicy and flavorful Mexican dishes with beans, corn, and peppers'),
('Asian', 'Various Asian cuisines including Chinese, Japanese, Thai, and Korean'),
('American', 'Classic American comfort foods and BBQ'),
('Mediterranean', 'Healthy Mediterranean diet with olive oil, fish, and vegetables'),
('Indian', 'Aromatic Indian cuisine with spices, curries, and rice'),
('French', 'Classic French cooking techniques and refined flavors');

-- Insert sample ingredients with nutritional data
INSERT INTO ingredients (name, fdc_id, category, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g, sodium_per_100g, avg_cost_per_unit, unit_type) VALUES
-- Proteins
('Chicken Breast', 171077, 'Protein', 165, 31.0, 3.6, 0, 0, 74, 8.50, 'pound'),
('Ground Beef', 174032, 'Protein', 254, 26.1, 15.4, 0, 0, 75, 6.99, 'pound'),
('Salmon Fillet', 175167, 'Protein', 208, 25.4, 12.4, 0, 0, 59, 12.99, 'pound'),
('Eggs', 748967, 'Protein', 155, 13.0, 11.0, 1.1, 0, 124, 3.50, 'dozen'),
('Black Beans', 175204, 'Protein', 132, 8.9, 0.5, 23.7, 8.7, 5, 1.29, 'can'),
('Tofu', 172475, 'Protein', 76, 8.0, 5.0, 2.0, 1.9, 7, 2.50, 'block'),

-- Grains & Starches
('Brown Rice', 168876, 'Grain', 123, 2.6, 0.9, 23.0, 1.8, 5, 2.99, 'pound'),
('Quinoa', 168917, 'Grain', 120, 4.4, 1.9, 21.3, 2.8, 7, 5.99, 'pound'),
('Whole Wheat Pasta', 168927, 'Grain', 124, 5.0, 0.8, 25.4, 3.2, 6, 1.99, 'pound'),
('Sweet Potato', 168482, 'Vegetable', 86, 1.6, 0.1, 20.1, 3.0, 54, 1.49, 'pound'),
('Potatoes', 170093, 'Vegetable', 77, 2.0, 0.1, 17.5, 2.2, 6, 0.99, 'pound'),

-- Vegetables
('Spinach', 168462, 'Vegetable', 23, 2.9, 0.4, 3.6, 2.2, 79, 2.99, 'bag'),
('Broccoli', 170379, 'Vegetable', 34, 2.8, 0.4, 6.6, 2.6, 33, 1.99, 'pound'),
('Bell Peppers', 170427, 'Vegetable', 31, 1.0, 0.3, 7.3, 2.5, 4, 1.50, 'each'),
('Onions', 170000, 'Vegetable', 40, 1.1, 0.1, 9.3, 1.7, 4, 0.89, 'pound'),
('Tomatoes', 170457, 'Vegetable', 18, 0.9, 0.2, 3.9, 1.2, 5, 2.49, 'pound'),
('Garlic', 170594, 'Vegetable', 149, 6.4, 0.5, 33.1, 2.1, 17, 0.75, 'bulb'),
('Carrots', 170393, 'Vegetable', 41, 0.9, 0.2, 9.6, 2.8, 69, 0.99, 'pound'),
('Cucumber', 169249, 'Vegetable', 15, 0.7, 0.1, 3.6, 0.5, 2, 0.79, 'each'),

-- Fruits
('Bananas', 173944, 'Fruit', 89, 1.1, 0.3, 22.8, 2.6, 1, 0.68, 'pound'),
('Apples', 171688, 'Fruit', 52, 0.3, 0.2, 13.8, 2.4, 1, 1.99, 'pound'),
('Avocado', 171705, 'Fruit', 160, 2.0, 14.7, 8.5, 6.7, 7, 1.25, 'each'),
('Lemons', 167746, 'Fruit', 29, 1.1, 0.3, 9.3, 2.8, 2, 0.50, 'each'),
('Strawberries', 173944, 'Fruit', 32, 0.7, 0.3, 7.7, 2.0, 1, 3.99, 'pound'),

-- Dairy & Alternatives
('Greek Yogurt', 170903, 'Dairy', 59, 10.0, 0.4, 3.6, 0, 36, 4.99, 'container'),
('Cheddar Cheese', 173420, 'Dairy', 403, 24.9, 33.1, 1.3, 0, 621, 4.50, 'block'),
('Milk', 746782, 'Dairy', 42, 3.4, 1.0, 5.0, 0, 40, 3.99, 'gallon'),
('Almond Milk', 1097547, 'Dairy', 30, 1.0, 2.5, 1.0, 1.0, 150, 3.50, 'carton'),

-- Pantry Items
('Olive Oil', 171413, 'Oil', 884, 0, 100.0, 0, 0, 2, 8.99, 'bottle'),
('Salt', 174495, 'Seasoning', 0, 0, 0, 0, 0, 38758, 0.99, 'container'),
('Black Pepper', 171334, 'Seasoning', 251, 10.4, 3.3, 63.9, 25.3, 20, 2.99, 'container'),
('Cumin', 171321, 'Seasoning', 375, 17.8, 22.3, 44.2, 10.5, 168, 1.99, 'container');

-- Insert sample recipe tags
INSERT INTO recipe_tags (name, color) VALUES
('Quick', '#10B981'),
('Healthy', '#059669'),
('Vegetarian', '#34D399'),
('Vegan', '#6EE7B7'),
('Gluten-Free', '#A7F3D0'),
('Low-Carb', '#F59E0B'),
('High-Protein', '#EF4444'),
('Budget-Friendly', '#8B5CF6'),
('Meal Prep', '#3B82F6'),
('Comfort Food', '#F97316');

-- Insert sample recipes
INSERT INTO recipes (title, description, cuisine_id, instructions, prep_time_minutes, cook_time_minutes, servings, difficulty_level, total_calories, total_protein, total_fat, total_carbs, estimated_cost) VALUES
(
    'Grilled Chicken with Quinoa',
    'Healthy grilled chicken breast served with fluffy quinoa and steamed vegetables',
    (SELECT id FROM cuisines WHERE name = 'American'),
    '1. Season chicken breast with salt, pepper, and herbs\n2. Preheat grill to medium-high heat\n3. Cook quinoa according to package directions\n4. Grill chicken for 6-7 minutes per side until internal temp reaches 165°F\n5. Steam broccoli until tender\n6. Serve chicken over quinoa with vegetables',
    15, 20, 4, 'easy', 420.5, 35.2, 8.9, 35.4, 8.50
),
(
    'Black Bean and Sweet Potato Bowl',
    'Nutritious vegetarian bowl with roasted sweet potatoes, black beans, and fresh vegetables',
    (SELECT id FROM cuisines WHERE name = 'Mexican'),
    '1. Preheat oven to 425°F\n2. Cube sweet potatoes and toss with olive oil, salt, and pepper\n3. Roast sweet potatoes for 25 minutes until tender\n4. Heat black beans with cumin and garlic\n5. Prepare fresh vegetables: dice tomatoes, slice avocado\n6. Assemble bowls with sweet potatoes, beans, and toppings',
    15, 25, 4, 'easy', 385.2, 12.8, 6.4, 68.9, 6.25
),
(
    'Salmon with Brown Rice',
    'Pan-seared salmon fillet with herb-seasoned brown rice and sautéed spinach',
    (SELECT id FROM cuisines WHERE name = 'Mediterranean'),
    '1. Cook brown rice according to package directions\n2. Season salmon with salt, pepper, and lemon juice\n3. Heat olive oil in pan over medium-high heat\n4. Cook salmon 4-5 minutes per side until flaky\n5. Sauté spinach with garlic until wilted\n6. Serve salmon over rice with spinach on the side',
    10, 25, 4, 'medium', 456.8, 28.4, 18.2, 38.6, 15.50
);

-- Link recipes with their ingredients
-- Grilled Chicken with Quinoa ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, notes) VALUES
((SELECT id FROM recipes WHERE title = 'Grilled Chicken with Quinoa'), (SELECT id FROM ingredients WHERE name = 'Chicken Breast'), 1.5, 'pound', 'boneless, skinless'),
((SELECT id FROM recipes WHERE title = 'Grilled Chicken with Quinoa'), (SELECT id FROM ingredients WHERE name = 'Quinoa'), 1, 'cup', 'dry'),
((SELECT id FROM recipes WHERE title = 'Grilled Chicken with Quinoa'), (SELECT id FROM ingredients WHERE name = 'Broccoli'), 1, 'pound', 'fresh'),
((SELECT id FROM recipes WHERE title = 'Grilled Chicken with Quinoa'), (SELECT id FROM ingredients WHERE name = 'Olive Oil'), 2, 'tablespoon', ''),
((SELECT id FROM recipes WHERE title = 'Grilled Chicken with Quinoa'), (SELECT id FROM ingredients WHERE name = 'Salt'), 1, 'teaspoon', ''),
((SELECT id FROM recipes WHERE title = 'Grilled Chicken with Quinoa'), (SELECT id FROM ingredients WHERE name = 'Black Pepper'), 0.5, 'teaspoon', '');

-- Black Bean and Sweet Potato Bowl ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, notes) VALUES
((SELECT id FROM recipes WHERE title = 'Black Bean and Sweet Potato Bowl'), (SELECT id FROM ingredients WHERE name = 'Sweet Potato'), 2, 'pound', 'medium sized'),
((SELECT id FROM recipes WHERE title = 'Black Bean and Sweet Potato Bowl'), (SELECT id FROM ingredients WHERE name = 'Black Beans'), 2, 'can', '15 oz cans'),
((SELECT id FROM recipes WHERE title = 'Black Bean and Sweet Potato Bowl'), (SELECT id FROM ingredients WHERE name = 'Avocado'), 2, 'each', 'ripe'),
((SELECT id FROM recipes WHERE title = 'Black Bean and Sweet Potato Bowl'), (SELECT id FROM ingredients WHERE name = 'Tomatoes'), 1, 'pound', 'fresh'),
((SELECT id FROM recipes WHERE title = 'Black Bean and Sweet Potato Bowl'), (SELECT id FROM ingredients WHERE name = 'Onions'), 0.5, 'each', 'medium'),
((SELECT id FROM recipes WHERE title = 'Black Bean and Sweet Potato Bowl'), (SELECT id FROM ingredients WHERE name = 'Olive Oil'), 3, 'tablespoon', ''),
((SELECT id FROM recipes WHERE title = 'Black Bean and Sweet Potato Bowl'), (SELECT id FROM ingredients WHERE name = 'Cumin'), 1, 'teaspoon', ''),
((SELECT id FROM recipes WHERE title = 'Black Bean and Sweet Potato Bowl'), (SELECT id FROM ingredients WHERE name = 'Garlic'), 3, 'clove', 'minced');

-- Salmon with Brown Rice ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, notes) VALUES
((SELECT id FROM recipes WHERE title = 'Salmon with Brown Rice'), (SELECT id FROM ingredients WHERE name = 'Salmon Fillet'), 1.5, 'pound', 'fresh'),
((SELECT id FROM recipes WHERE title = 'Salmon with Brown Rice'), (SELECT id FROM ingredients WHERE name = 'Brown Rice'), 1, 'cup', 'dry'),
((SELECT id FROM recipes WHERE title = 'Salmon with Brown Rice'), (SELECT id FROM ingredients WHERE name = 'Spinach'), 1, 'bag', '5 oz baby spinach'),
((SELECT id FROM recipes WHERE title = 'Salmon with Brown Rice'), (SELECT id FROM ingredients WHERE name = 'Lemons'), 1, 'each', 'for juice'),
((SELECT id FROM recipes WHERE title = 'Salmon with Brown Rice'), (SELECT id FROM ingredients WHERE name = 'Olive Oil'), 2, 'tablespoon', ''),
((SELECT id FROM recipes WHERE title = 'Salmon with Brown Rice'), (SELECT id FROM ingredients WHERE name = 'Garlic'), 2, 'clove', 'minced'),
((SELECT id FROM recipes WHERE title = 'Salmon with Brown Rice'), (SELECT id FROM ingredients WHERE name = 'Salt'), 1, 'teaspoon', ''),
((SELECT id FROM recipes WHERE title = 'Salmon with Brown Rice'), (SELECT id FROM ingredients WHERE name = 'Black Pepper'), 0.5, 'teaspoon', '');

-- Associate recipes with tags
INSERT INTO recipe_tag_associations (recipe_id, tag_id) VALUES
((SELECT id FROM recipes WHERE title = 'Grilled Chicken with Quinoa'), (SELECT id FROM recipe_tags WHERE name = 'Healthy')),
((SELECT id FROM recipes WHERE title = 'Grilled Chicken with Quinoa'), (SELECT id FROM recipe_tags WHERE name = 'High-Protein')),
((SELECT id FROM recipes WHERE title = 'Grilled Chicken with Quinoa'), (SELECT id FROM recipe_tags WHERE name = 'Gluten-Free')),
((SELECT id FROM recipes WHERE title = 'Black Bean and Sweet Potato Bowl'), (SELECT id FROM recipe_tags WHERE name = 'Vegetarian')),
((SELECT id FROM recipes WHERE title = 'Black Bean and Sweet Potato Bowl'), (SELECT id FROM recipe_tags WHERE name = 'Healthy')),
((SELECT id FROM recipes WHERE title = 'Black Bean and Sweet Potato Bowl'), (SELECT id FROM recipe_tags WHERE name = 'Budget-Friendly')),
((SELECT id FROM recipes WHERE title = 'Salmon with Brown Rice'), (SELECT id FROM recipe_tags WHERE name = 'Healthy')),
((SELECT id FROM recipes WHERE title = 'Salmon with Brown Rice'), (SELECT id FROM recipe_tags WHERE name = 'High-Protein'));

-- Insert sample user preferences
INSERT INTO user_preferences (dietary_restrictions, default_budget, default_calorie_target, max_prep_time, preferred_meal_types) VALUES
(ARRAY['vegetarian'], 50.00, 1800, 45, ARRAY['breakfast', 'lunch', 'dinner']);

-- Create a sample meal plan
INSERT INTO meal_plans (name, description, start_date, end_date, budget_limit, calorie_target_per_day, max_prep_time_minutes, dietary_restrictions) VALUES
('Healthy Week Plan', 'A balanced weekly meal plan focused on healthy, nutritious meals', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 100.00, 1800, 60, ARRAY['none']);

-- Add entries to the meal plan
INSERT INTO meal_plan_entries (meal_plan_id, recipe_id, planned_date, meal_type, servings) VALUES
((SELECT id FROM meal_plans WHERE name = 'Healthy Week Plan'), (SELECT id FROM recipes WHERE title = 'Grilled Chicken with Quinoa'), CURRENT_DATE, 'dinner', 2),
((SELECT id FROM meal_plans WHERE name = 'Healthy Week Plan'), (SELECT id FROM recipes WHERE title = 'Black Bean and Sweet Potato Bowl'), CURRENT_DATE + INTERVAL '1 day', 'lunch', 2),
((SELECT id FROM meal_plans WHERE name = 'Healthy Week Plan'), (SELECT id FROM recipes WHERE title = 'Salmon with Brown Rice'), CURRENT_DATE + INTERVAL '2 days', 'dinner', 2);