import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Button,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Slider,
  Card,
  CardContent,
  CardActionArea,
  LinearProgress,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  Zoom,
} from '@mui/material';
import {
  RestaurantMenu as FoodIcon,
  Kitchen as KitchenIcon,
  FitnessCenter as FitnessIcon,
  Schedule as TimeIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckIcon,
  ArrowBack as BackIcon,
  ArrowForward as ForwardIcon,
  Info as InfoIcon,
  Star as StarIcon,
  Lightbulb as TipIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { 
  UserPreferencesEnhanced, 
  UpdatePreferencesRequest, 
  UserOnboardingProgress,
  CuisineScores,
} from '../types';

// Mock API services (these would be imported from actual API service)
const userApi = {
  updatePreferences: async (preferences: UpdatePreferencesRequest) => ({ data: preferences }),
  getOnboardingProgress: async (userId: string) => ({ data: {} as UserOnboardingProgress }),
  updateOnboardingProgress: async (userId: string, step: string, completed: boolean) => ({ data: {} }),
};

interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType<any>;
}

interface OnboardingWizardProps {
  userId: string;
  onComplete: () => void;
  skipOnboarding?: boolean;
}

const UserOnboardingWizard: React.FC<OnboardingWizardProps> = ({
  userId,
  onComplete,
  skipOnboarding = false,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeStep, setActiveStep] = useState(0);
  const [preferences, setPreferences] = useState<UpdatePreferencesRequest>({
    dietary_restrictions: [],
    allergies: [],
    favorite_cuisines: {},
    avoided_ingredients: [],
    favorite_ingredients: [],
    cooking_skill_level: 'beginner',
    max_prep_time_minutes: 45,
    max_cook_time_minutes: 60,
    preferred_meal_times: ['dinner'],
    daily_calorie_goal: undefined,
    available_equipment: [],
    kitchen_size: 'medium',
    meal_prep_style: 'fresh_daily',
    family_size: 2,
    recommendation_style: 'balanced',
  });

  const [showSkipDialog, setShowSkipDialog] = useState(skipOnboarding);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'warning' | 'info' 
  });
  const [tips, setTips] = useState<string[]>([]);

  // Get onboarding progress
  const { data: progress } = useQuery(
    ['onboarding-progress', userId],
    () => userApi.getOnboardingProgress(userId),
    { enabled: !!userId }
  );

  // Update preferences mutation
  const updatePreferencesMutation = useMutation(
    (prefs: UpdatePreferencesRequest) => userApi.updatePreferences(prefs),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['user-preferences', userId]);
        setSnackbar({ open: true, message: 'Preferences saved successfully!', severity: 'success' });
      },
      onError: () => {
        setSnackbar({ open: true, message: 'Failed to save preferences', severity: 'error' });
      },
    }
  );

  // Update onboarding progress mutation
  const updateProgressMutation = useMutation(
    ({ step, completed }: { step: string; completed: boolean }) => 
      userApi.updateOnboardingProgress(userId, step, completed)
  );

  const steps: OnboardingStep[] = [
    {
      key: 'basic_info',
      title: 'Personal Info',
      description: 'Tell us about yourself',
      icon: <PersonIcon color="primary" />,
      component: BasicInfoStep,
    },
    {
      key: 'dietary_preferences',
      title: 'Dietary Preferences',
      description: 'Your food preferences and restrictions',
      icon: <FoodIcon color="primary" />,
      component: DietaryPreferencesStep,
    },
    {
      key: 'cooking_preferences',
      title: 'Cooking Style',
      description: 'How do you like to cook?',
      icon: <KitchenIcon color="primary" />,
      component: CookingPreferencesStep,
    },
    {
      key: 'kitchen_setup',
      title: 'Kitchen Setup',
      description: 'What equipment do you have?',
      icon: <SettingsIcon color="primary" />,
      component: KitchenSetupStep,
    },
    {
      key: 'goal_setting',
      title: 'Health Goals',
      description: 'Set your nutrition targets',
      icon: <FitnessIcon color="primary" />,
      component: GoalSettingStep,
    },
  ];

  // Calculate progress percentage
  const progressPercentage = Math.round((activeStep / steps.length) * 100);

  const handleNext = async () => {
    const currentStep = steps[activeStep];
    
    // Save current step progress
    await updateProgressMutation.mutateAsync({
      step: currentStep.key,
      completed: true,
    });

    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      // Complete onboarding
      await completeOnboarding();
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      // Save final preferences
      await updatePreferencesMutation.mutateAsync(preferences);
      
      // Mark onboarding as complete
      await updateProgressMutation.mutateAsync({
        step: 'onboarding_complete',
        completed: true,
      });

      setSnackbar({ 
        open: true, 
        message: '🎉 Welcome to your personalized meal planning experience!', 
        severity: 'success' 
      });

      // Navigate to dashboard or call completion callback
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: 'Failed to complete onboarding. Please try again.', 
        severity: 'error' 
      });
    }
  };

  const handleSkipOnboarding = () => {
    setShowSkipDialog(false);
    // Set minimal preferences for skip
    const minimalPrefs: UpdatePreferencesRequest = {
      cooking_skill_level: 'beginner',
      max_prep_time_minutes: 45,
      recommendation_style: 'balanced',
      family_size: 2,
    };
    
    updatePreferencesMutation.mutate(minimalPrefs);
    onComplete();
  };

  const updatePreference = (key: keyof UpdatePreferencesRequest, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const getCurrentStepComponent = () => {
    const StepComponent = steps[activeStep].component;
    return (
      <StepComponent
        preferences={preferences}
        updatePreference={updatePreference}
        tips={tips}
        setTips={setTips}
      />
    );
  };

  if (showSkipDialog) {
    return (
      <Dialog open={showSkipDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Skip Onboarding?</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            The onboarding process helps us create personalized meal recommendations just for you.
            Skipping it means you'll get generic suggestions initially.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You can always set up your preferences later in Settings.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSkipDialog(false)}>
            Continue Onboarding
          </Button>
          <Button onClick={handleSkipOnboarding} color="error">
            Skip for Now
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome to Your Meal Planner! 🍽️
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Let's set up your personalized cooking experience
        </Typography>
        
        {/* Progress Bar */}
        <Box sx={{ mt: 3, mb: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={progressPercentage} 
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {progressPercentage}% Complete
          </Typography>
        </Box>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((step, index) => (
          <Step key={step.key}>
            <StepLabel
              icon={
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: index <= activeStep ? 'primary.main' : 'grey.300',
                    color: index <= activeStep ? 'white' : 'grey.600',
                  }}
                >
                  {index < activeStep ? <CheckIcon /> : step.icon}
                </Box>
              }
            >
              <Typography variant="body2" fontWeight={index === activeStep ? 'bold' : 'normal'}>
                {step.title}
              </Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Current Step Content */}
      <Fade in={true} key={activeStep}>
        <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            {steps[activeStep].icon}
            <Box sx={{ ml: 2 }}>
              <Typography variant="h5" gutterBottom>
                {steps[activeStep].title}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {steps[activeStep].description}
              </Typography>
            </Box>
          </Box>

          {getCurrentStepComponent()}
        </Paper>
      </Fade>

      {/* Tips Section */}
      {tips.length > 0 && (
        <Card sx={{ mb: 4, backgroundColor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TipIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" color="primary">
                Helpful Tips
              </Typography>
            </Box>
            {tips.map((tip, index) => (
              <Typography key={index} variant="body2" paragraph>
                • {tip}
              </Typography>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          startIcon={<BackIcon />}
          onClick={handleBack}
          disabled={activeStep === 0}
          variant="outlined"
        >
          Back
        </Button>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            onClick={() => setShowSkipDialog(true)}
            color="inherit"
          >
            Skip for Now
          </Button>
          
          <Button
            endIcon={activeStep === steps.length - 1 ? <CheckIcon /> : <ForwardIcon />}
            onClick={handleNext}
            variant="contained"
            disabled={updatePreferencesMutation.isLoading}
          >
            {activeStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
          </Button>
        </Box>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Step Components

interface StepProps {
  preferences: UpdatePreferencesRequest;
  updatePreference: (key: keyof UpdatePreferencesRequest, value: any) => void;
  tips: string[];
  setTips: (tips: string[]) => void;
}

const BasicInfoStep: React.FC<StepProps> = ({ preferences, updatePreference, setTips }) => {
  useEffect(() => {
    setTips([
      'Family size helps us suggest appropriate recipe portions',
      'Cooking skill level affects recipe complexity in recommendations',
      'We use this info to personalize your meal planning experience',
    ]);
  }, [setTips]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Family Size"
          type="number"
          value={preferences.family_size || 2}
          onChange={(e) => updatePreference('family_size', parseInt(e.target.value))}
          inputProps={{ min: 1, max: 10 }}
          helperText="How many people do you usually cook for?"
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Cooking Skill Level</InputLabel>
          <Select
            value={preferences.cooking_skill_level || 'beginner'}
            onChange={(e) => updatePreference('cooking_skill_level', e.target.value)}
            label="Cooking Skill Level"
          >
            <MenuItem value="beginner">
              <Box>
                <Typography variant="body1">Beginner</Typography>
                <Typography variant="caption" color="text.secondary">
                  Simple recipes with basic techniques
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem value="intermediate">
              <Box>
                <Typography variant="body1">Intermediate</Typography>
                <Typography variant="caption" color="text.secondary">
                  Comfortable with various cooking methods
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem value="advanced">
              <Box>
                <Typography variant="body1">Advanced</Typography>
                <Typography variant="caption" color="text.secondary">
                  Complex recipes and techniques welcome
                </Typography>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <FormControl component="fieldset">
          <Typography variant="subtitle1" gutterBottom>
            How would you describe your approach to meal planning?
          </Typography>
          <RadioGroup
            value={preferences.recommendation_style || 'balanced'}
            onChange={(e) => updatePreference('recommendation_style', e.target.value)}
          >
            <FormControlLabel 
              value="conservative" 
              control={<Radio />} 
              label={
                <Box>
                  <Typography variant="body1">Conservative</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Stick to familiar flavors and cuisines I know I like
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel 
              value="balanced" 
              control={<Radio />} 
              label={
                <Box>
                  <Typography variant="body1">Balanced</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Mix of familiar and new recipes to try
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel 
              value="adventurous" 
              control={<Radio />} 
              label={
                <Box>
                  <Typography variant="body1">Adventurous</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Always excited to try new cuisines and ingredients
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>
      </Grid>
    </Grid>
  );
};

const DietaryPreferencesStep: React.FC<StepProps> = ({ preferences, updatePreference, setTips }) => {
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  
  const commonCuisines = [
    'Italian', 'Mexican', 'Chinese', 'Indian', 'Thai', 'Japanese', 'Mediterranean',
    'American', 'French', 'Korean', 'Middle Eastern', 'Vietnamese', 'Greek'
  ];

  const commonDietaryRestrictions = [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo',
    'Low-Carb', 'Halal', 'Kosher', 'Pescatarian'
  ];

  const commonAllergies = [
    'Nuts', 'Peanuts', 'Shellfish', 'Fish', 'Eggs', 'Milk', 'Soy', 'Wheat', 'Sesame'
  ];

  useEffect(() => {
    setTips([
      'Select all cuisines you enjoy - we use this to personalize recommendations',
      'Dietary restrictions help us filter out incompatible recipes',
      'Allergy information ensures we never suggest dangerous ingredients',
    ]);
  }, [setTips]);

  const handleCuisineToggle = (cuisine: string) => {
    const newScores: CuisineScores = { ...(preferences.favorite_cuisines || {}) };
    
    if (selectedCuisines.includes(cuisine)) {
      // Remove cuisine
      delete newScores[cuisine.toLowerCase()];
      setSelectedCuisines(prev => prev.filter(c => c !== cuisine));
    } else {
      // Add cuisine with high preference
      newScores[cuisine.toLowerCase()] = 0.8;
      setSelectedCuisines(prev => [...prev, cuisine]);
    }
    
    updatePreference('favorite_cuisines', newScores);
  };

  return (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          What cuisines do you enjoy?
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Select all that apply - this helps us recommend recipes you'll love
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {commonCuisines.map((cuisine) => (
            <Chip
              key={cuisine}
              label={cuisine}
              onClick={() => handleCuisineToggle(cuisine)}
              color={selectedCuisines.includes(cuisine) ? 'primary' : 'default'}
              variant={selectedCuisines.includes(cuisine) ? 'filled' : 'outlined'}
              icon={selectedCuisines.includes(cuisine) ? <StarIcon /> : undefined}
            />
          ))}
        </Box>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Dietary Restrictions
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Select any dietary preferences or restrictions you follow
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {commonDietaryRestrictions.map((restriction) => (
            <Chip
              key={restriction}
              label={restriction}
              onClick={() => {
                const current = preferences.dietary_restrictions || [];
                const updated = current.includes(restriction)
                  ? current.filter(r => r !== restriction)
                  : [...current, restriction];
                updatePreference('dietary_restrictions', updated);
              }}
              color={(preferences.dietary_restrictions || []).includes(restriction) ? 'secondary' : 'default'}
              variant={(preferences.dietary_restrictions || []).includes(restriction) ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Food Allergies
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Select any food allergies - we'll make sure to exclude these ingredients
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {commonAllergies.map((allergy) => (
            <Chip
              key={allergy}
              label={allergy}
              onClick={() => {
                const current = preferences.allergies || [];
                const updated = current.includes(allergy)
                  ? current.filter(a => a !== allergy)
                  : [...current, allergy];
                updatePreference('allergies', updated);
              }}
              color={(preferences.allergies || []).includes(allergy) ? 'error' : 'default'}
              variant={(preferences.allergies || []).includes(allergy) ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Grid>
    </Grid>
  );
};

const CookingPreferencesStep: React.FC<StepProps> = ({ preferences, updatePreference, setTips }) => {
  useEffect(() => {
    setTips([
      'Time preferences help us suggest recipes that fit your schedule',
      'Meal prep style affects how we group and suggest recipes',
      'These settings can always be adjusted later in your preferences',
    ]);
  }, [setTips]);

  return (
    <Grid container spacing={4}>
      <Grid item xs={12} sm={6}>
        <Typography variant="subtitle1" gutterBottom>
          Maximum Prep Time (minutes)
        </Typography>
        <Box sx={{ px: 2 }}>
          <Slider
            value={preferences.max_prep_time_minutes || 45}
            onChange={(_, value) => updatePreference('max_prep_time_minutes', value)}
            min={15}
            max={120}
            step={15}
            marks={[
              { value: 15, label: '15m' },
              { value: 30, label: '30m' },
              { value: 60, label: '1h' },
              { value: 120, label: '2h' },
            ]}
            valueLabelDisplay="on"
            valueLabelFormat={(value) => `${value} min`}
          />
        </Box>
      </Grid>

      <Grid item xs={12} sm={6}>
        <Typography variant="subtitle1" gutterBottom>
          Maximum Cook Time (minutes)
        </Typography>
        <Box sx={{ px: 2 }}>
          <Slider
            value={preferences.max_cook_time_minutes || 60}
            onChange={(_, value) => updatePreference('max_cook_time_minutes', value)}
            min={15}
            max={180}
            step={15}
            marks={[
              { value: 15, label: '15m' },
              { value: 30, label: '30m' },
              { value: 60, label: '1h' },
              { value: 180, label: '3h' },
            ]}
            valueLabelDisplay="on"
            valueLabelFormat={(value) => `${value} min`}
          />
        </Box>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          When do you usually cook?
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {['breakfast', 'lunch', 'dinner', 'snack'].map((mealTime) => (
            <Chip
              key={mealTime}
              label={mealTime.charAt(0).toUpperCase() + mealTime.slice(1)}
              onClick={() => {
                const current = preferences.preferred_meal_times || [];
                const updated = current.includes(mealTime)
                  ? current.filter(t => t !== mealTime)
                  : [...current, mealTime];
                updatePreference('preferred_meal_times', updated);
              }}
              color={(preferences.preferred_meal_times || []).includes(mealTime) ? 'primary' : 'default'}
              variant={(preferences.preferred_meal_times || []).includes(mealTime) ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      </Grid>

      <Grid item xs={12}>
        <FormControl component="fieldset">
          <Typography variant="subtitle1" gutterBottom>
            What's your meal prep style?
          </Typography>
          <RadioGroup
            value={preferences.meal_prep_style || 'fresh_daily'}
            onChange={(e) => updatePreference('meal_prep_style', e.target.value)}
          >
            <FormControlLabel 
              value="fresh_daily" 
              control={<Radio />} 
              label={
                <Box>
                  <Typography variant="body1">Fresh Daily</Typography>
                  <Typography variant="caption" color="text.secondary">
                    I prefer to cook fresh meals each day
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel 
              value="batch_cook" 
              control={<Radio />} 
              label={
                <Box>
                  <Typography variant="body1">Batch Cooking</Typography>
                  <Typography variant="caption" color="text.secondary">
                    I like to prepare meals in advance for the week
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel 
              value="leftovers_friendly" 
              control={<Radio />} 
              label={
                <Box>
                  <Typography variant="body1">Leftovers Friendly</Typography>
                  <Typography variant="caption" color="text.secondary">
                    I cook larger portions and enjoy leftovers
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>
      </Grid>
    </Grid>
  );
};

const KitchenSetupStep: React.FC<StepProps> = ({ preferences, updatePreference, setTips }) => {
  const commonEquipment = [
    'Oven', 'Stovetop', 'Microwave', 'Blender', 'Food Processor', 'Stand Mixer',
    'Air Fryer', 'Slow Cooker', 'Pressure Cooker', 'Grill', 'Toaster Oven',
    'Immersion Blender', 'Rice Cooker', 'Bread Maker'
  ];

  useEffect(() => {
    setTips([
      'Equipment selection helps us suggest recipes you can actually make',
      'Kitchen size affects storage and prep recommendations',
      'Don\'t worry if you don\'t have fancy equipment - we have recipes for every setup!',
    ]);
  }, [setTips]);

  return (
    <Grid container spacing={4}>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Kitchen Size</InputLabel>
          <Select
            value={preferences.kitchen_size || 'medium'}
            onChange={(e) => updatePreference('kitchen_size', e.target.value)}
            label="Kitchen Size"
          >
            <MenuItem value="small">
              <Box>
                <Typography variant="body1">Small</Typography>
                <Typography variant="caption" color="text.secondary">
                  Limited counter space and storage
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem value="medium">
              <Box>
                <Typography variant="body1">Medium</Typography>
                <Typography variant="caption" color="text.secondary">
                  Adequate space for most cooking tasks
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem value="large">
              <Box>
                <Typography variant="body1">Large</Typography>
                <Typography variant="caption" color="text.secondary">
                  Spacious with room for multiple cooking projects
                </Typography>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          What kitchen equipment do you have?
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Select all the equipment you have available
        </Typography>
        <Grid container spacing={1}>
          {commonEquipment.map((equipment) => (
            <Grid item key={equipment}>
              <Chip
                label={equipment}
                onClick={() => {
                  const current = preferences.available_equipment || [];
                  const updated = current.includes(equipment)
                    ? current.filter(e => e !== equipment)
                    : [...current, equipment];
                  updatePreference('available_equipment', updated);
                }}
                color={(preferences.available_equipment || []).includes(equipment) ? 'primary' : 'default'}
                variant={(preferences.available_equipment || []).includes(equipment) ? 'filled' : 'outlined'}
              />
            </Grid>
          ))}
        </Grid>
      </Grid>
    </Grid>
  );
};

const GoalSettingStep: React.FC<StepProps> = ({ preferences, updatePreference, setTips }) => {
  useEffect(() => {
    setTips([
      'Nutrition goals are optional but help us suggest healthier options',
      'Calorie goals help with portion sizing and recipe selection',
      'You can always adjust these goals later as your needs change',
    ]);
  }, [setTips]);

  return (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Health & Nutrition Goals (Optional)
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Set targets to help us recommend recipes that align with your health goals
        </Typography>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Daily Calorie Goal"
          type="number"
          value={preferences.daily_calorie_goal || ''}
          onChange={(e) => updatePreference('daily_calorie_goal', e.target.value ? parseInt(e.target.value) : undefined)}
          inputProps={{ min: 1000, max: 5000 }}
          helperText="Leave blank if you don't track calories"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Weekly Budget Limit ($)"
          type="number"
          value={preferences.nutrition_goals?.weekly_budget_limit || ''}
          onChange={(e) => {
            const currentGoals = preferences.nutrition_goals || {};
            updatePreference('nutrition_goals', {
              ...currentGoals,
              weekly_budget_limit: e.target.value ? parseFloat(e.target.value) : undefined,
            });
          }}
          inputProps={{ min: 0 }}
          helperText="Optional budget for meal planning"
        />
      </Grid>

      <Grid item xs={12}>
        <FormControl component="fieldset">
          <Typography variant="subtitle1" gutterBottom>
            How often do you prefer to shop for groceries?
          </Typography>
          <RadioGroup
            value={preferences.preferred_shopping_frequency || 'weekly'}
            onChange={(e) => updatePreference('preferred_shopping_frequency', e.target.value)}
          >
            <FormControlLabel 
              value="daily" 
              control={<Radio />} 
              label="Daily - I like fresh ingredients each day"
            />
            <FormControlLabel 
              value="weekly" 
              control={<Radio />} 
              label="Weekly - Once a week shopping trip"
            />
            <FormControlLabel 
              value="biweekly" 
              control={<Radio />} 
              label="Bi-weekly - Every two weeks"
            />
          </RadioGroup>
        </FormControl>
      </Grid>
    </Grid>
  );
};

export default UserOnboardingWizard; 