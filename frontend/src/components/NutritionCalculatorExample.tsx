import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  calculateIngredientNutrition,
  convertUnits,
  getSupportedUnits,
  getRecipeNutritionAnalysis,
  formatNutritionValue,
  formatCalories,
  calculateMacroPercentages,
  RecipeNutrition,
  IngredientNutrition,
} from '../utils/nutritionUtils';

// Example component showing nutrition calculation usage
const NutritionCalculatorExample: React.FC = () => {
  const [ingredientId, setIngredientId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('cup');
  const [supportedUnits, setSupportedUnits] = useState<string[]>([]);
  const [nutrition, setNutrition] = useState<IngredientNutrition | null>(null);
  const [recipeNutrition, setRecipeNutrition] = useState<RecipeNutrition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Example ingredient (you would get this from your ingredients API)
  const sampleIngredients = [
    { id: '123', name: 'Olive Oil' },
    { id: '456', name: 'Cherry Tomatoes' },
    { id: '789', name: 'Parmesan Cheese' },
  ];

  // Load supported units when ingredient changes
  useEffect(() => {
    if (ingredientId) {
      const selectedIngredient = sampleIngredients.find(ing => ing.id === ingredientId);
      if (selectedIngredient) {
        getSupportedUnits(selectedIngredient.name)
          .then(units => setSupportedUnits(units))
          .catch(err => console.error('Failed to get supported units:', err));
      }
    }
  }, [ingredientId]);

  // Calculate ingredient nutrition
  const handleCalculateNutrition = async () => {
    if (!ingredientId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await calculateIngredientNutrition(ingredientId, quantity, unit);
      setNutrition(result.nutrition);
    } catch (err) {
      setError('Failed to calculate nutrition. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Convert units
  const handleUnitConversion = async () => {
    if (!ingredientId) return;
    
    const selectedIngredient = sampleIngredients.find(ing => ing.id === ingredientId);
    if (!selectedIngredient) return;
    
    try {
      const result = await convertUnits({
        ingredient_name: selectedIngredient.name,
        quantity,
        from_unit: unit,
        to_unit: 'grams'
      });
      
      console.log('Unit conversion result:', result);
      // You can update UI with conversion result
    } catch (err) {
      console.error('Unit conversion failed:', err);
    }
  };

  // Calculate macro percentages for display
  const macroPercentages = nutrition ? calculateMacroPercentages(nutrition) : null;

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        🥗 Nutrition Calculator Demo
      </Typography>
      
      <Typography variant="body1" paragraph color="text.secondary">
        This example shows how to use the nutrition calculation utilities.
      </Typography>

      {/* Ingredient Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            1. Select Ingredient & Quantity
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Ingredient</InputLabel>
                <Select
                  value={ingredientId}
                  onChange={(e) => setIngredientId(e.target.value)}
                  label="Ingredient"
                >
                  {sampleIngredients.map(ing => (
                    <MenuItem key={ing.id} value={ing.id}>
                      {ing.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value))}
                inputProps={{ min: 0.1, step: 0.1 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  label="Unit"
                >
                  {supportedUnits.map(unitOption => (
                    <MenuItem key={unitOption} value={unitOption.replace('1 ', '')}>
                      {unitOption}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={2}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleCalculateNutrition}
                disabled={!ingredientId || loading}
              >
                {loading ? <CircularProgress size={20} /> : 'Calculate'}
              </Button>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={handleUnitConversion}
              disabled={!ingredientId}
              sx={{ mr: 1 }}
            >
              Convert to Grams
            </Button>
            
            {supportedUnits.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Supported units: 
                </Typography>
                {supportedUnits.slice(0, 5).map(unit => (
                  <Chip
                    key={unit}
                    label={unit}
                    size="small"
                    variant="outlined"
                    sx={{ ml: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Nutrition Results */}
      {nutrition && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              2. Nutrition Results
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1, color: 'primary.contrastText' }}>
                  <Typography variant="h4" align="center">
                    {formatCalories(nutrition.calories)}
                  </Typography>
                  <Typography variant="body2" align="center">
                    Total Calories
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2, bgcolor: 'secondary.light', borderRadius: 1, color: 'secondary.contrastText' }}>
                  <Typography variant="h4" align="center">
                    {formatNutritionValue(nutrition.quantity_grams, 'g', 1)}
                  </Typography>
                  <Typography variant="body2" align="center">
                    Weight in Grams
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Grid container spacing={1} sx={{ mt: 2 }}>
              <Grid item xs={3}>
                <Box textAlign="center">
                  <Typography variant="h6" color="success.main">
                    {formatNutritionValue(nutrition.protein)}
                  </Typography>
                  <Typography variant="caption">Protein</Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box textAlign="center">
                  <Typography variant="h6" color="warning.main">
                    {formatNutritionValue(nutrition.fat)}
                  </Typography>
                  <Typography variant="caption">Fat</Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box textAlign="center">
                  <Typography variant="h6" color="info.main">
                    {formatNutritionValue(nutrition.carbs)}
                  </Typography>
                  <Typography variant="caption">Carbs</Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box textAlign="center">
                  <Typography variant="h6" color="text.secondary">
                    {formatNutritionValue(nutrition.fiber)}
                  </Typography>
                  <Typography variant="caption">Fiber</Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Macro Percentages */}
            {macroPercentages && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Macronutrient Distribution:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`Protein: ${macroPercentages.protein.toFixed(1)}%`}
                    color="success"
                    variant="outlined"
                  />
                  <Chip 
                    label={`Fat: ${macroPercentages.fat.toFixed(1)}%`}
                    color="warning"
                    variant="outlined"
                  />
                  <Chip 
                    label={`Carbs: ${macroPercentages.carbs.toFixed(1)}%`}
                    color="info"
                    variant="outlined"
                  />
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Usage Examples */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            3. Code Examples
          </Typography>
          
          <Typography variant="subtitle2" gutterBottom>
            Calculate ingredient nutrition:
          </Typography>
          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {`const nutrition = await calculateIngredientNutrition(
  ingredientId, 
  ${quantity}, 
  '${unit}'
);`}
          </Box>

          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            Convert units:
          </Typography>
          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {`const conversion = await convertUnits({
  ingredient_name: 'olive oil',
  quantity: ${quantity},
  from_unit: '${unit}',
  to_unit: 'grams'
});`}
          </Box>

          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            Get recipe nutrition analysis:
          </Typography>
          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {`const analysis = await getRecipeNutritionAnalysis(recipeId);
const macros = calculateMacroPercentages(analysis.nutrition);`}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default NutritionCalculatorExample; 