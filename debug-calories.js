const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testCaloriesAPI() {
  const baseURL = 'http://localhost:8080/api';
  
  console.log('🔍 Testing Calories API...\n');
  
  try {
    // Test 1: Check if backend is running
    console.log('1. Testing backend connection...');
    const healthResponse = await fetch(`${baseURL}/ingredients`);
    
    if (!healthResponse.ok) {
      console.log('❌ Backend not responding. Status:', healthResponse.status);
      console.log('💡 Make sure the backend server is running: cd backend && go run cmd/server/main.go');
      return;
    }
    
    console.log('✅ Backend is running');
    
    // Test 2: Check ingredients data
    console.log('\n2. Checking ingredients data...');
    const ingredientsData = await healthResponse.json();
    
    console.log('📊 Ingredients Response Structure:');
    console.log('- Total ingredients:', ingredientsData.total || 'N/A');
    console.log('- Ingredients count:', ingredientsData.ingredients?.length || 0);
    
    if (ingredientsData.ingredients && ingredientsData.ingredients.length > 0) {
      console.log('\n3. Sample ingredient data:');
      const sampleIngredient = ingredientsData.ingredients[0];
      console.log('- Name:', sampleIngredient.name);
      console.log('- Category:', sampleIngredient.category);
      console.log('- Calories per 100g:', sampleIngredient.calories_per_100g || 'NOT SET');
      console.log('- FDC ID:', sampleIngredient.fdc_id || 'NOT SET');
      
      // Check how many ingredients have calorie data
      const withCalories = ingredientsData.ingredients.filter(i => i.calories_per_100g).length;
      const withoutCalories = ingredientsData.ingredients.length - withCalories;
      
      console.log('\n📈 Calorie Data Summary:');
      console.log('- Ingredients with calories:', withCalories);
      console.log('- Ingredients without calories:', withoutCalories);
      
      if (withCalories === 0) {
        console.log('\n❌ NO INGREDIENTS HAVE CALORIE DATA!');
        console.log('💡 This suggests the database needs to be seeded.');
        console.log('💡 Run: cd database && psql -d mealplanner -f seeds.sql');
      } else {
        console.log('\n✅ Some ingredients have calorie data');
      }
    } else {
      console.log('\n❌ NO INGREDIENTS FOUND IN DATABASE!');
      console.log('💡 Database needs to be seeded with sample data.');
      console.log('💡 Run: cd database && psql -d mealplanner -f seeds.sql');
    }
    
    // Test 3: Check calorie ranges endpoint
    console.log('\n4. Testing calorie ranges endpoint...');
    const calorieRangesResponse = await fetch(`${baseURL}/ingredients/calorie-ranges`);
    
    if (calorieRangesResponse.ok) {
      const calorieRangesData = await calorieRangesResponse.json();
      console.log('📊 Calorie Ranges:');
      console.log('- Low calorie ingredients:', calorieRangesData.low?.length || 0);
      console.log('- Medium calorie ingredients:', calorieRangesData.medium?.length || 0);
      console.log('- High calorie ingredients:', calorieRangesData.high?.length || 0);
    } else {
      console.log('❌ Calorie ranges endpoint failed');
    }
    
  } catch (error) {
    console.log('❌ Error testing API:', error.message);
    console.log('💡 Make sure the backend server is running on port 8080');
  }
}

// Run the test
testCaloriesAPI(); 