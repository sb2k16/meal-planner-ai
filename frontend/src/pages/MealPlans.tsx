import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const MealPlans: React.FC = () => {
  const navigate = useNavigate();

  const handleCreateMealPlan = () => {
    navigate('/meal-plans/create');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Meal Plans
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateMealPlan}>
          Create Meal Plan
        </Button>
      </Box>

      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No meal plans found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first meal plan to get started.
        </Typography>
      </Paper>
    </Box>
  );
};

export default MealPlans; 