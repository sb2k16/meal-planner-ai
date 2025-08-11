import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Snackbar,
  Alert,
  Paper,
  IconButton,
  SelectChangeEvent,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import { 
  Add as AddIcon, 
  RemoveCircleOutline as RemoveIcon,
  AutoAwesome as AIIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { recipesApi, ingredientsApi, tagsApi, cuisinesApi } from '../services/api';
import { RecipeFormData, Ingredient, RecipeTag, Cuisine, AIGeneratedRecipe, AIGeneratedIngredient } from '../types';
import { useNavigate } from 'react-router-dom';
import AIRecipeGenerator from '../components/AIRecipeGenerator';
import AIRecipePreview from '../components/AIRecipePreview';

interface IngredientInput {
  ingredient_id: string;
  quantity: number;
  unit: string;
  notes: string;
  name?: string; // For display purposes
}

// Extended RecipeFormData with ingredient names for AI recipes
interface ExtendedRecipeFormData extends Omit<RecipeFormData, 'ingredients'> {
  ingredients: IngredientInput[];
}

const CreateRecipe: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);
  const [aiGeneratedRecipe, setAiGeneratedRecipe] = useState<AIGeneratedRecipe | null>(null);
  const [showAIPreview, setShowAIPreview] = useState(false);

  const [formData, setFormData] = useState<ExtendedRecipeFormData>({
    title: '',
    description: '',
    cuisine_id: '',
    instructions: '',
    prep_time_minutes: 0,
    cook_time_minutes: 0,
    servings: 1,
    difficulty_level: 'easy',
    ingredients: [],
    tags: [],
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });

  // Fetch necessary data for dropdowns/chips
  const { data: cuisines } = useQuery<Cuisine[]>('cuisines', async () => (await cuisinesApi.getAll()).data);
  const { data: allIngredients } = useQuery<Ingredient[]>('allIngredients', async () => (await ingredientsApi.getAll()).data.ingredients);
  const { data: allTags } = useQuery<RecipeTag[]>('allTags', async () => (await tagsApi.getAll()).data);

  const createRecipeMutation = useMutation(recipesApi.create, {
    onSuccess: (newRecipe) => {
      setSnackbar({
        open: true,
        message: 'Recipe created successfully!',
        severity: 'success',
      });
      queryClient.invalidateQueries('recipes');
      // Navigate to the new recipe's detail page or a success page
      navigate(`/recipes/${newRecipe.data.id}`);
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: `Error creating recipe: ${error.message || 'Unknown error'}`,
        severity: 'error',
      });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name as string]: value,
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name as string]: value,
    }));
  };

  const handleMultiSelectChange = (e: SelectChangeEvent<string[]>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name as string]: typeof value === 'string' ? value.split(',') : value,
    }));
  };

  const handleIngredientChange = (index: number, field: keyof IngredientInput, value: any) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setFormData((prev) => ({ ...prev, ingredients: newIngredients }));
  };

  const addIngredientField = () => {
    setFormData((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredient_id: '', quantity: 0, unit: '', notes: '' }],
    }));
  };

  const removeIngredientField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      tags: value as string[],
    }));
  };

  const mapDifficultyForBackend = (difficulty: 'easy' | 'medium' | 'hard'): 'Easy' | 'Medium' | 'Hard' => {
    switch (difficulty) {
      case 'easy': return 'Easy';
      case 'medium': return 'Medium';
      case 'hard': return 'Hard';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation
    if (!formData.title || !formData.instructions || formData.ingredients.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields (Title, Instructions, and at least one Ingredient).',
        severity: 'error',
      });
      return;
    }

    // Convert instructions from single string to array of strings (if needed by backend)
    // Assuming backend expects a single string for now based on models.go
    const payload = {
      ...formData,
      instructions: formData.instructions.split('\n').filter(step => step.trim() !== ''), // Split by newline and filter empty steps
      difficulty: mapDifficultyForBackend(formData.difficulty_level), // Map difficulty_level to difficulty
      prep_time_minutes: formData.prep_time_minutes || 0,
      cook_time_minutes: formData.cook_time_minutes || 0,
      // Map ingredient objects to only include IDs, quantity, unit, notes
      ingredients: formData.ingredients.map(ing => ({
        ingredient_id: ing.ingredient_id,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes,
      })),
    };
    
    createRecipeMutation.mutate(payload);
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // AI Recipe Generation Handlers
  const handleAIRecipeGenerated = (recipe: AIGeneratedRecipe) => {
    setAiGeneratedRecipe(recipe);
    setShowAIPreview(true);
    setSnackbar({
      open: true,
      message: 'AI recipe generated successfully! Review and save when ready.',
      severity: 'success',
    });
  };

  const handleAIError = (error: string) => {
    setSnackbar({
      open: true,
      message: error,
      severity: 'error',
    });
  };

  // Helper function to find ingredient by FDC ID or name
  const findIngredientByFdcIdOrName = (aiIngredient: AIGeneratedIngredient): string => {
    if (!allIngredients || allIngredients.length === 0) {
      return '';
    }

    // First try to find by FDC ID if available
    if (aiIngredient.fdc_id) {
      const foundByFdc = allIngredients.find(ing => ing.fdc_id === aiIngredient.fdc_id);
      if (foundByFdc) {
        return foundByFdc.id;
      }
    }

    // Fall back to finding by name (case-insensitive partial match)
    const normalizedName = aiIngredient.name.toLowerCase().trim();
    const foundByName = allIngredients.find(ing => {
      const ingName = ing.name.toLowerCase().trim();
      return ingName === normalizedName || 
             ingName.includes(normalizedName) || 
             normalizedName.includes(ingName);
    });

    return foundByName ? foundByName.id : '';
  };

  // Helper function to convert AI recipe to form data with proper ingredient mapping
  const convertAIRecipeToFormData = (aiRecipe: AIGeneratedRecipe): ExtendedRecipeFormData => {
    return {
      title: aiRecipe.title,
      description: aiRecipe.description,
      cuisine_id: '', // Will need to be mapped manually by user
      instructions: aiRecipe.instructions.join('\n'),
      prep_time_minutes: aiRecipe.prep_time_minutes,
      cook_time_minutes: aiRecipe.cook_time_minutes,
      servings: aiRecipe.servings,
      difficulty_level: aiRecipe.difficulty_level,
      ingredients: aiRecipe.ingredients.map(ing => ({
        ingredient_id: findIngredientByFdcIdOrName(ing),
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes || '',
        name: ing.name, // Keep name for display purposes
      })),
      tags: aiRecipe.tags || [],
    };
  };

  const handleSaveAIRecipe = (recipeData: RecipeFormData | ExtendedRecipeFormData) => {
    // If this is called from AIRecipePreview, the data should already be properly formatted
    // But let's make sure ingredients are properly mapped if it's an AI recipe
    if (aiGeneratedRecipe) {
      const properlyMappedData = convertAIRecipeToFormData(aiGeneratedRecipe);
      setFormData(properlyMappedData);
      
      // Check for unmapped ingredients
      const unmappedIngredients = properlyMappedData.ingredients.filter(ing => !ing.ingredient_id);
      if (unmappedIngredients.length > 0) {
        setSnackbar({
          open: true,
          message: `AI recipe loaded! Note: ${unmappedIngredients.length} ingredients need to be manually selected from the dropdowns.`,
          severity: 'warning',
        });
      } else {
        setSnackbar({
          open: true,
          message: 'AI recipe loaded with all ingredients properly mapped!',
          severity: 'success',
        });
      }
    } else {
      // Fall back to using the provided data
      setFormData(recipeData);
      setSnackbar({
        open: true,
        message: 'Recipe loaded into editor. You can now review and modify it.',
        severity: 'success',
      });
    }
    
    setActiveTab(1); // Switch to manual form
    setShowAIPreview(false);
  };

  const handleContinueEditingAI = () => {
    if (aiGeneratedRecipe) {
      // Convert AI recipe to form data using the helper function
      const recipeFormData = convertAIRecipeToFormData(aiGeneratedRecipe);
      
      setFormData(recipeFormData);
      setActiveTab(1);
      setShowAIPreview(false);
      
      // Show message about ingredient mapping
      const unmappedIngredients = recipeFormData.ingredients.filter(ing => !ing.ingredient_id);
      if (unmappedIngredients.length > 0) {
        setSnackbar({
          open: true,
          message: `AI recipe loaded! Note: ${unmappedIngredients.length} ingredients need to be manually selected from the dropdowns.`,
          severity: 'warning',
        });
      } else {
        setSnackbar({
          open: true,
          message: 'AI recipe loaded with all ingredients properly mapped!',
          severity: 'success',
        });
      }
    }
  };

  const handleDiscardAIRecipe = () => {
    setAiGeneratedRecipe(null);
    setShowAIPreview(false);
    setSnackbar({
      open: true,
      message: 'AI recipe discarded.',
      severity: 'info',
    });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Create New Recipe
      </Typography>
      
      {/* Show AI Preview if generated */}
      {showAIPreview && aiGeneratedRecipe && (
        <AIRecipePreview
          recipe={aiGeneratedRecipe}
          onSave={handleSaveAIRecipe}
          onEdit={handleContinueEditingAI}
          onDiscard={handleDiscardAIRecipe}
        />
      )}

      {/* Main Creation Interface */}
      {!showAIPreview && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="recipe creation tabs">
              <Tab 
                icon={<AIIcon />} 
                label="AI Generator" 
                sx={{ textTransform: 'none' }}
              />
              <Tab 
                icon={<EditIcon />} 
                label="Manual Entry" 
                sx={{ textTransform: 'none' }}
              />
            </Tabs>
          </Box>

          {/* AI Generator Tab */}
          {activeTab === 0 && (
            <AIRecipeGenerator
              onRecipeGenerated={handleAIRecipeGenerated}
              onError={handleAIError}
            />
          )}

          {/* Manual Entry Tab */}
          {activeTab === 1 && (
            <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Recipe Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Cuisine</InputLabel>
                <Select
                  name="cuisine_id"
                  value={formData.cuisine_id}
                  onChange={handleSelectChange}
                  label="Cuisine"
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {cuisines?.map((cuisine) => (
                    <MenuItem key={cuisine.id} value={cuisine.id}>
                      {cuisine.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Difficulty Level</InputLabel>
                <Select
                  name="difficulty_level"
                  value={formData.difficulty_level}
                  onChange={handleSelectChange}
                  label="Difficulty Level"
                >
                  <MenuItem value="Easy">Easy</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="Hard">Hard</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Prep Time (minutes)"
                name="prep_time_minutes"
                type="number"
                value={formData.prep_time_minutes}
                onChange={handleChange}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Cook Time (minutes)"
                name="cook_time_minutes"
                type="number"
                value={formData.cook_time_minutes}
                onChange={handleChange}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Servings"
                name="servings"
                type="number"
                value={formData.servings}
                onChange={handleChange}
                required
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Instructions"
                name="instructions"
                value={formData.instructions}
                onChange={handleChange}
                multiline
                rows={6}
                required
                placeholder="Enter cooking instructions step-by-step. Use new lines for each step."
              />
            </Grid>

            {/* Ingredients Section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Ingredients</Typography>
              {formData.ingredients.map((ingredient, index) => (
                <Paper 
                  key={index} 
                  elevation={1} 
                  sx={{ 
                    p: 2, 
                    mb: 2,
                    // Highlight unmapped AI ingredients
                    ...(ingredient.name && !ingredient.ingredient_id && {
                      border: '2px solid #ff9800',
                      backgroundColor: '#fff3e0'
                    })
                  }}
                >
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={5}>
                      <FormControl fullWidth>
                        <InputLabel>Ingredient</InputLabel>
                        <Select
                          value={ingredient.ingredient_id}
                          onChange={(e) => handleIngredientChange(index, 'ingredient_id', e.target.value)}
                          label="Ingredient"
                          required
                          error={Boolean(ingredient.name && !ingredient.ingredient_id)}
                        >
                          <MenuItem value="">
                            <em>
                              {ingredient.name 
                                ? `Select ingredient for: ${ingredient.name}` 
                                : 'Select Ingredient'
                              }
                            </em>
                          </MenuItem>
                          {allIngredients?.map((ing) => (
                            <MenuItem key={ing.id} value={ing.id}>
                              {ing.name}
                            </MenuItem>
                          ))}
                        </Select>
                        {ingredient.name && !ingredient.ingredient_id && (
                          <Typography variant="caption" color="warning.main" sx={{ mt: 1 }}>
                            AI suggested: {ingredient.name} - Please select from dropdown
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <TextField
                        fullWidth
                        label="Quantity"
                        type="number"
                        value={ingredient.quantity}
                        onChange={(e) => handleIngredientChange(index, 'quantity', parseFloat(e.target.value))}
                        inputProps={{ min: 0.01, step: 0.01 }}
                        required
                      />
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <TextField
                        fullWidth
                        label="Unit"
                        value={ingredient.unit}
                        onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid item xs={10} sm={2}>
                      <TextField
                        fullWidth
                        label="Notes (optional)"
                        value={ingredient.notes}
                        onChange={(e) => handleIngredientChange(index, 'notes', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={2} sm={1}>
                      <IconButton onClick={() => removeIngredientField(index)} color="error">
                        <RemoveIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={addIngredientField}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                Add Ingredient
              </Button>
            </Grid>

            {/* Tags Section */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tags</InputLabel>
                <Select
                  multiple
                  name="tags"
                  value={formData.tags}
                  onChange={handleMultiSelectChange}
                  label="Tags"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => {
                        const tag = allTags?.find(t => t.id === value);
                        return (
                          <Chip key={value} label={tag ? tag.name : value} />
                        );
                      })}
                    </Box>
                  )}
                >
                  {allTags?.map((tag) => (
                    <MenuItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={createRecipeMutation.isLoading}
              >
                {createRecipeMutation.isLoading ? 'Creating...' : 'Create Recipe'}
              </Button>
            </Grid>
          </Grid>
        </form>
            )}
          </Paper>
        )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateRecipe;