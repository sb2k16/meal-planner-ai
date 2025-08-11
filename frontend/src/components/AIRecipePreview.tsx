import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Button,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Divider,
  Alert,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Schedule as TimeIcon,
  People as PeopleIcon,
  TrendingUp as DifficultyIcon,
  Restaurant as RestaurantIcon,
  LocalDining as CuisineIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AutoAwesome as AIIcon,
  Fastfood as CalorieIcon,
  FitnessCenter as ProteinIcon,
  Opacity as FatIcon,
  Grain as CarbIcon,
  LocalFlorist as FiberIcon,
  Warning as SodiumIcon,
} from '@mui/icons-material';
import { AIGeneratedRecipe, RecipeFormData } from '../types';

interface AIRecipePreviewProps {
  recipe: AIGeneratedRecipe;
  onSave: (recipeData: RecipeFormData) => void;
  onEdit: () => void;
  onDiscard: () => void;
}

const AIRecipePreview: React.FC<AIRecipePreviewProps> = ({
  recipe,
  onSave,
  onEdit,
  onDiscard,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState<AIGeneratedRecipe>(recipe);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleSave = () => {
    // Convert AI recipe to RecipeFormData format for the existing form
    const recipeFormData: RecipeFormData = {
      title: editedRecipe.title,
      description: editedRecipe.description,
      cuisine_id: '', // Will need to be mapped
      instructions: editedRecipe.instructions.join('\n'),
      prep_time_minutes: editedRecipe.prep_time_minutes,
      cook_time_minutes: editedRecipe.cook_time_minutes,
      servings: editedRecipe.servings,
      difficulty_level: editedRecipe.difficulty_level,
      ingredients: editedRecipe.ingredients.map(ing => ({
        ingredient_id: '', // Will need to be resolved
        quantity: ing.quantity,
        unit: ing.unit,
        notes: ing.notes || '',
      })),
      tags: editedRecipe.tags,
    };

    onSave(recipeFormData);
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      setEditedRecipe(recipe); // Reset changes if canceling
    }
  };

  const updateRecipe = (field: keyof AIGeneratedRecipe, value: any) => {
    setEditedRecipe(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateInstruction = (index: number, value: string) => {
    const newInstructions = [...editedRecipe.instructions];
    newInstructions[index] = value;
    updateRecipe('instructions', newInstructions);
  };

  const addInstruction = () => {
    updateRecipe('instructions', [...editedRecipe.instructions, '']);
  };

  const removeInstruction = (index: number) => {
    const newInstructions = editedRecipe.instructions.filter((_, i) => i !== index);
    updateRecipe('instructions', newInstructions);
  };

  const currentRecipe = isEditing ? editedRecipe : recipe;

  return (
    <Card elevation={4} sx={{ mt: 3 }}>
      <CardContent>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" flex={1}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <AIIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" component="h2">
                {currentRecipe.title}
              </Typography>
              <Box display="flex" alignItems="center" mt={1}>
                <Chip 
                  icon={<AIIcon />}
                  label="AI Generated" 
                  color="primary" 
                  size="small" 
                  sx={{ mr: 1 }}
                />
                <Chip 
                  label={`${Math.round(recipe.confidence_score * 100)}% confidence`} 
                  size="small" 
                  color={recipe.confidence_score > 0.8 ? 'success' : 'warning'}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Description */}
        <Typography variant="body1" color="text.secondary" mb={3}>
          {currentRecipe.description}
        </Typography>

        {/* Quick Stats */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} sm={3}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <TimeIcon color="primary" sx={{ mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Prep Time
              </Typography>
              <Typography variant="h6">
                {formatTime(currentRecipe.prep_time_minutes)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <RestaurantIcon color="primary" sx={{ mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Cook Time
              </Typography>
              <Typography variant="h6">
                {formatTime(currentRecipe.cook_time_minutes)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <PeopleIcon color="primary" sx={{ mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Servings
              </Typography>
              <Typography variant="h6">
                {currentRecipe.servings}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <DifficultyIcon color="primary" sx={{ mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Difficulty
              </Typography>
              <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                {currentRecipe.difficulty_level}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Nutrition Summary */}
        {currentRecipe.nutrition_summary && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Nutrition Information</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={2}>
                  <Box textAlign="center">
                    <CalorieIcon color="error" />
                    <Typography variant="h6">
                      {Math.round(currentRecipe.nutrition_summary.calories_per_serving)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Calories
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <Box textAlign="center">
                    <ProteinIcon color="primary" />
                    <Typography variant="h6">
                      {Math.round(currentRecipe.nutrition_summary.protein_per_serving)}g
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Protein
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <Box textAlign="center">
                    <FatIcon color="warning" />
                    <Typography variant="h6">
                      {Math.round(currentRecipe.nutrition_summary.fat_per_serving)}g
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Fat
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <Box textAlign="center">
                    <CarbIcon color="info" />
                    <Typography variant="h6">
                      {Math.round(currentRecipe.nutrition_summary.carbs_per_serving)}g
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Carbs
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <Box textAlign="center">
                    <FiberIcon color="success" />
                    <Typography variant="h6">
                      {Math.round(currentRecipe.nutrition_summary.fiber_per_serving)}g
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Fiber
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={2}>
                  <Box textAlign="center">
                    <SodiumIcon color="secondary" />
                    <Typography variant="h6">
                      {Math.round(currentRecipe.nutrition_summary.sodium_per_serving)}mg
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Sodium
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Ingredients */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Ingredients ({currentRecipe.ingredients.length})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {currentRecipe.ingredients.map((ingredient, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={
                      <Typography variant="body1">
                        <strong>{ingredient.quantity} {ingredient.unit}</strong> {ingredient.name}
                      </Typography>
                    }
                    secondary={ingredient.notes}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>

        {/* Instructions */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Instructions ({currentRecipe.instructions.length} steps)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {currentRecipe.instructions.map((instruction, index) => (
                <ListItem key={index} alignItems="flex-start">
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 24, height: 24, fontSize: '0.875rem' }}>
                      {index + 1}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography variant="body1">{instruction}</Typography>}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>

        {/* Cost Estimate */}
        {currentRecipe.cost_estimate && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Estimated Cost:</strong> {currentRecipe.cost_estimate.currency}{currentRecipe.cost_estimate.total_cost.toFixed(2)} total 
              ({currentRecipe.cost_estimate.currency}{currentRecipe.cost_estimate.cost_per_serving.toFixed(2)} per serving)
            </Typography>
          </Alert>
        )}

        {/* Action Buttons */}
        <Box display="flex" justifyContent="space-between" mt={4}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={onDiscard}
          >
            Discard Recipe
          </Button>
          
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              onClick={onEdit}
            >
              Continue Editing
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              startIcon={<SaveIcon />}
            >
              Save Recipe
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AIRecipePreview; 