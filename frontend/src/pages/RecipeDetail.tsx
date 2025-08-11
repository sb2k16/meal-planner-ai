import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Button,
  Snackbar,
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  RestaurantMenu as ServingsIcon,
  Category as CategoryIcon,
  LocalDining as CaloriesIcon,
  Kitchen as IngredientIcon,
  Assignment as InstructionsIcon,
  Label as TagIcon,
  Calculate as CalculateIcon,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { recipesApi } from '../services/api';
import { Recipe } from 'types';

const RecipeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const { data: recipe, isLoading, error } = useQuery<Recipe, Error>(
    ['recipe', id],
    async () => (await recipesApi.getById(id!)).data,
    { enabled: !!id } // Only run query if id is available
  );

  const calculateNutritionMutation = useMutation(
    () => recipesApi.calculateNutrition(id!),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['recipe', id]);
        setSnackbarMessage('Nutrition calculated successfully!');
        setSnackbarOpen(true);
      },
      onError: (error: any) => {
        setSnackbarMessage(`Error calculating nutrition: ${error.message || 'Unknown error'}`);
        setSnackbarOpen(true);
      }
    }
  );

  const handleCalculateNutrition = () => {
    calculateNutritionMutation.mutate();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">Error loading recipe: {error.message}</Alert>
      </Box>
    );
  }

  if (!recipe) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="info">Recipe not found.</Alert>
      </Box>
    );
  }

  const caloriesPerServing = recipe.total_calories && recipe.servings
    ? (recipe.total_calories / recipe.servings).toFixed(2)
    : 'N/A';

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {recipe.title}
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>Description</Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {recipe.description || 'No description provided.'}
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item>
                <Chip
                  icon={<CategoryIcon />}
                  label={recipe.cuisine?.name || 'General Cuisine'}
                  color="primary"
                />
              </Grid>
              <Grid item>
                <Chip
                  icon={<TimeIcon />}
                  label={`Prep: ${recipe.prep_time_minutes || 0} min`}
                  color="info"
                />
              </Grid>
              <Grid item>
                <Chip
                  icon={<TimeIcon />}
                  label={`Cook: ${recipe.cook_time_minutes || 0} min`}
                  color="info"
                />
              </Grid>
              <Grid item>
                <Chip
                  icon={<ServingsIcon />}
                  label={`Servings: ${recipe.servings}`}
                  color="success"
                />
              </Grid>
              <Grid item>
                <Chip
                  icon={<CaloriesIcon />}
                  label={`Calories/Serving: ${caloriesPerServing}`}
                  color="secondary"
                />
              </Grid>
            </Grid>

            {/* Nutrition Section */}
            <Paper elevation={1} sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Nutrition Information</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CalculateIcon />}
                  onClick={handleCalculateNutrition}
                  disabled={calculateNutritionMutation.isLoading}
                >
                  {calculateNutritionMutation.isLoading ? 'Calculating...' : 'Calculate Nutrition'}
                </Button>
              </Box>
              
              {recipe.total_calories ? (
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3} md={2}>
                    <Box textAlign="center">
                      <Typography variant="h6" color="error.main">
                        {Math.round((recipe.total_calories / recipe.servings) || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Calories
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <Box textAlign="center">
                      <Typography variant="h6" color="primary.main">
                        {recipe.total_protein ? Math.round((recipe.total_protein / recipe.servings) * 10) / 10 : 0}g
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Protein
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <Box textAlign="center">
                      <Typography variant="h6" color="warning.main">
                        {recipe.total_fat ? Math.round((recipe.total_fat / recipe.servings) * 10) / 10 : 0}g
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Fat
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <Box textAlign="center">
                      <Typography variant="h6" color="info.main">
                        {recipe.total_carbs ? Math.round((recipe.total_carbs / recipe.servings) * 10) / 10 : 0}g
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Carbs
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <Box textAlign="center">
                      <Typography variant="h6" color="success.main">
                        {recipe.total_fiber ? Math.round((recipe.total_fiber / recipe.servings) * 10) / 10 : 0}g
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Fiber
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <Box textAlign="center">
                      <Typography variant="h6" color="secondary.main">
                        {recipe.total_sodium ? Math.round((recipe.total_sodium / recipe.servings) * 10) / 10 : 0}mg
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Sodium
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Nutrition information not available. Click "Calculate Nutrition" to analyze this recipe's nutritional content.
                </Alert>
              )}
            </Paper>

            <Typography variant="h6" gutterBottom>Instructions</Typography>
            <List>
              {recipe.instructions.split('\n').map((step: string, index: number) => (
                <ListItem key={index} disableGutters>
                  <ListItemIcon>
                    <InstructionsIcon />
                  </ListItemIcon>
                  <ListItemText primary={step.trim()} />
                </ListItem>
              ))}
            </List>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>Ingredients</Typography>
            <List dense>
              {recipe.ingredients?.map((ri: { id: string; quantity: number; unit: string; ingredient?: { name: string; }; notes?: string; }) => (
                <ListItem key={ri.id} disableGutters>
                  <ListItemIcon>
                    <IngredientIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${ri.quantity} ${ri.unit} ${ri.ingredient?.name}`}
                    secondary={ri.notes ? `(${ri.notes})` : null}
                  />
                </ListItem>
              ))}
            </List>

            {recipe.tags && recipe.tags.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>Tags</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {recipe.tags.map((tag: { id: string; name: string; color: string; }) => (
                    <Chip key={tag.id} label={tag.name} sx={{ bgcolor: tag.color, color: 'white' }} />
                  ))}
                </Box>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default RecipeDetail;