import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  LinearProgress,
  FormControlLabel,
  Switch,
  Slider,
  Step,
  Stepper,
  StepLabel,
  StepContent,
  Fab,
  Zoom,
  useTheme,
  useMediaQuery,
  Divider,
  Collapse,
  Badge,
  Paper,
  Avatar,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  VolumeUp as VolumeUpIcon,
  ExpandMore as ExpandMoreIcon,
  RestaurantMenu as RecipeIcon,
  Schedule as TimeIcon,
  People as ServingsIcon,
  TrendingUp as DifficultyIcon,
  Person as PersonIcon,
  Restaurant as VoiceIcon,
  Settings as SettingsIcon,
  Celebration as OccasionIcon,
  Kitchen as MealPrepIcon,
  Favorite as FavoriteIcon,
  Block as AvoidIcon,
  Bookmark as SaveIcon,
  Refresh as ResetIcon,
  PlayArrow as NextIcon,
  ArrowBack as BackIcon,
  CheckCircle as CheckIcon,
  Timer as TimerIcon,
  FiberManualRecord as RecordingIcon,
} from '@mui/icons-material';
import { useMutation } from 'react-query';
import { recipesApi } from '../services/api';
import { 
  RecipeGenerationRequest, 
  RecipeGenerationResponse, 
  AIGeneratedRecipe,
  VoiceRecognitionResult,
  UserPreferencesForRecipe
} from '../types';

interface AIRecipeGeneratorProps {
  onRecipeGenerated: (recipe: AIGeneratedRecipe) => void;
  onError: (error: string) => void;
}

const AIRecipeGenerator: React.FC<AIRecipeGeneratorProps> = ({
  onRecipeGenerated,
  onError,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Step management
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  
  const [prompt, setPrompt] = useState('');
  const [characterCount, setCharacterCount] = useState(0);
  const maxCharacters = 200;
  
  const [advancedOptions, setAdvancedOptions] = useState({
    servings: 4,
    max_prep_time: 60,
    max_cook_time: 120,
    dietary_restrictions: [] as string[],
    cuisine_preference: '',
    difficulty_level: 'medium' as 'easy' | 'medium' | 'hard',
    include_nutrition: true,
    include_cost_estimate: true,
  });
  
  // Enhanced personalization state
  const [personalizationOptions, setPersonalizationOptions] = useState({
    voice_style: 'home_cook' as 'chef_pro' | 'food_blogger' | 'home_cook' | 'funny_friend' | 'grandma_voice',
    include_chef_notes: true,
    include_variations: true,
    occasion: '' as 'weeknight' | 'date_night' | 'family_dinner' | 'meal_prep' | '',
    user_preferences: {
      cooking_level: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
      avoided_ingredients: [] as string[],
      favorite_ingredients: [] as string[],
      meal_prep_style: '' as 'batch_cook' | 'fresh_daily' | 'leftovers_friendly' | '',
      family_size: 2,
    } as UserPreferencesForRecipe,
  });
  
  // Voice recognition state with enhanced feedback
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const recognitionRef = useRef<any>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced voice style options with icons and descriptions
  const voiceStyles = [
    { 
      value: 'chef_pro', 
      label: 'Professional Chef', 
      description: 'Precise, expert techniques',
      icon: '👨‍🍳',
      color: '#1976d2'
    },
    { 
      value: 'food_blogger', 
      label: 'Food Blogger', 
      description: 'Friendly, enthusiastic stories',
      icon: '📱',
      color: '#e91e63'
    },
    { 
      value: 'home_cook', 
      label: 'Home Cook', 
      description: 'Practical, family-tested',
      icon: '🏠',
      color: '#388e3c'
    },
    { 
      value: 'funny_friend', 
      label: 'Funny Friend', 
      description: 'Light humor, relatable',
      icon: '😄',
      color: '#ff9800'
    },
    { 
      value: 'grandma_voice', 
      label: 'Grandma\'s Wisdom', 
      description: 'Warm, nostalgic traditions',
      icon: '👵',
      color: '#9c27b0'
    },
  ];

  // Enhanced occasion options with emojis
  const occasions = [
    { value: '', label: 'Any Occasion', emoji: '🍽️' },
    { value: 'weeknight', label: 'Busy Weeknight', emoji: '⏰' },
    { value: 'date_night', label: 'Date Night', emoji: '💕' },
    { value: 'family_dinner', label: 'Family Dinner', emoji: '👨‍👩‍👧‍👦' },
    { value: 'meal_prep', label: 'Meal Prep', emoji: '📦' },
  ];

  // Enhanced example prompts with emojis
  const examplePrompts = [
    { text: "Romantic 30-min pasta for date night", emoji: "🍝", category: "date" },
    { text: "Teen-friendly nutritious lunch", emoji: "🍱", category: "family" },
    { text: "High-protein vegan curry kids will eat", emoji: "🌱", category: "healthy" },
    { text: "Make-ahead breakfast for busy mornings", emoji: "🌅", category: "prep" },
    { text: "Comfort food casserole that freezes well", emoji: "🥘", category: "comfort" },
    { text: "Mediterranean dish with pantry ingredients", emoji: "🫒", category: "simple" },
  ];

  const dietaryOptions = [
    'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'low-carb',
    'paleo', 'Mediterranean', 'low-sodium', 'diabetic-friendly',
  ];

  const cuisineOptions = [
    'Italian', 'Mexican', 'Asian', 'Mediterranean', 'Indian', 'American',
    'French', 'Thai', 'Japanese', 'Middle Eastern',
  ];

  const commonIngredients = [
    'garlic', 'onions', 'tomatoes', 'bell peppers', 'mushrooms', 'spinach',
    'chicken', 'salmon', 'tofu', 'beans', 'rice', 'pasta', 'quinoa',
    'cheese', 'eggs', 'avocado', 'lemon', 'herbs', 'olive oil',
  ];

  // Steps configuration
  const steps = [
    {
      label: 'Recipe Prompt',
      description: 'Describe your dish idea',
      icon: <RecipeIcon />,
    },
    {
      label: 'Personalization',
      description: 'Choose your style & preferences',
      icon: <PersonIcon />,
    },
    {
      label: 'Dietary Preferences',
      description: 'Set restrictions & preferences',
      icon: <FavoriteIcon />,
    },
  ];

  // Initialize voice recognition with enhanced features
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setVoiceSupported(true);
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          const newPrompt = prompt + ' ' + finalTranscript;
          setPrompt(newPrompt);
          setCharacterCount(newPrompt.length);
          setTranscript('');
        } else {
          setTranscript(interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setTranscript('');
        stopRecordingTimer();
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        stopRecordingTimer();
      };
    }
  }, [prompt]);

  // Recording timer functions
  const startRecordingTimer = () => {
    setRecordingTime(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecordingTime(0);
  };

  const generateRecipeMutation = useMutation(recipesApi.generateFromPrompt, {
    onSuccess: (response) => {
      if (response.data.success && response.data.recipe) {
        onRecipeGenerated(response.data.recipe);
      } else {
        onError(response.data.error || 'Failed to generate recipe');
      }
    },
    onError: (error: any) => {
      onError(error.response?.data?.error || 'Failed to generate recipe');
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim()) {
      onError('Please enter a recipe description');
      return;
    }

    const request: RecipeGenerationRequest = {
      prompt: prompt.trim(),
      ...advancedOptions,
      voice_style: personalizationOptions.voice_style,
      include_chef_notes: personalizationOptions.include_chef_notes,
      include_variations: personalizationOptions.include_variations,
      occasion: personalizationOptions.occasion || undefined,
      user_preferences: {
        ...personalizationOptions.user_preferences,
        meal_prep_style: personalizationOptions.user_preferences.meal_prep_style || undefined,
      },
    };

    generateRecipeMutation.mutate(request);
  };

  const toggleVoiceRecognition = () => {
    if (!voiceSupported) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      stopRecordingTimer();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
      startRecordingTimer();
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
    setCharacterCount(example.length);
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= maxCharacters) {
      setPrompt(value);
      setCharacterCount(value.length);
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && !prompt.trim()) {
      onError('Please enter a recipe description before proceeding');
      return;
    }

    setCompletedSteps(prev => new Set(prev).add(activeStep));
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex === 0 || completedSteps.has(stepIndex - 1)) {
      setActiveStep(stepIndex);
    }
  };

  // Save preferences to localStorage
  const saveDefaults = () => {
    localStorage.setItem('aiRecipeDefaults', JSON.stringify({
      personalizationOptions,
      advancedOptions,
    }));
    // Show success message
    onError('Preferences saved as defaults!'); // Using onError for now, could add onSuccess prop
  };

  // Load saved preferences
  useEffect(() => {
    const saved = localStorage.getItem('aiRecipeDefaults');
    if (saved) {
      try {
        const { personalizationOptions: savedPersonalization, advancedOptions: savedAdvanced } = JSON.parse(saved);
        setPersonalizationOptions(savedPersonalization);
        setAdvancedOptions(savedAdvanced);
      } catch (error) {
        console.error('Failed to load saved preferences:', error);
      }
    }
  }, []);

  // Dynamic preview text
  const getPreviewText = () => {
    const style = voiceStyles.find(vs => vs.value === personalizationOptions.voice_style);
    const occasion = occasions.find(occ => occ.value === personalizationOptions.occasion);
    const { cooking_level, family_size, meal_prep_style } = personalizationOptions.user_preferences;
    
    let preview = `You're generating a ${style?.label.toLowerCase() || 'home cook'} style recipe`;
    if (occasion?.label && occasion.value) preview += ` for ${occasion.label.toLowerCase()}`;
    if (family_size && family_size > 1) preview += ` serving ${family_size} people`;
    if (cooking_level !== 'intermediate') preview += ` at ${cooking_level} level`;
    if (meal_prep_style) preview += ` with ${meal_prep_style.replace('_', ' ')} approach`;
    preview += '...';
    
    return preview;
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              {/* Enhanced Prompt Input */}
              <Box mb={3}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RecipeIcon color="primary" />
                  Describe Your Dish Idea
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="e.g., Make a healthy dinner with chicken and vegetables that takes less than 45 minutes..."
                  value={prompt + (transcript ? ` ${transcript}` : '')}
                  onChange={handlePromptChange}
                  variant="outlined"
                  helperText={`${characterCount}/${maxCharacters} characters • Be specific about flavors, ingredients, or cooking style`}
                  error={characterCount >= maxCharacters}
                  InputProps={{
                    endAdornment: voiceSupported && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        {isListening && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <RecordingIcon 
                              color="error" 
                              sx={{ 
                                animation: 'pulse 1s infinite',
                                '@keyframes pulse': {
                                  '0%': { opacity: 1 },
                                  '50%': { opacity: 0.5 },
                                  '100%': { opacity: 1 },
                                }
                              }} 
                            />
                            <Typography variant="caption" color="error">
                              {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                            </Typography>
                          </Box>
                        )}
                        <Tooltip title={isListening ? "Stop recording" : "Start voice input"}>
                          <IconButton
                            onClick={toggleVoiceRecognition}
                            color={isListening ? "error" : "primary"}
                            disabled={generateRecipeMutation.isLoading}
                            sx={{
                              bgcolor: isListening ? 'error.light' : 'primary.light',
                              color: 'white',
                              '&:hover': {
                                bgcolor: isListening ? 'error.main' : 'primary.main',
                              }
                            }}
                          >
                            {isListening ? <MicOffIcon /> : <MicIcon />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ),
                  }}
                />
                {transcript && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Listening: "{transcript}"
                  </Alert>
                )}
              </Box>

              {/* Enhanced Example Prompts */}
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AIIcon color="primary" />
                  Or try these examples:
                </Typography>
                <Grid container spacing={1}>
                  {examplePrompts.map((example, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Chip
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{example.emoji}</span>
                            <span>{example.text}</span>
                          </Box>
                        }
                        variant="outlined"
                        clickable
                        onClick={() => handleExampleClick(example.text)}
                        sx={{
                          width: '100%',
                          height: 'auto',
                          py: 1,
                          px: 2,
                          '& .MuiChip-label': {
                            whiteSpace: 'normal',
                            textAlign: 'left',
                          },
                          '&:hover': {
                            bgcolor: 'primary.light',
                            color: 'white',
                          }
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        );

      case 1:
        return (
          <Box>
            {/* Dynamic Preview Panel */}
            <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'primary.light', color: 'white' }}>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckIcon />
                {getPreviewText()}
              </Typography>
            </Paper>

            <Grid container spacing={3}>
              {/* Voice Style Card */}
              <Grid item xs={12} md={6}>
                <Card elevation={2} sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VoiceIcon color="primary" />
                      Voice & Style
                    </Typography>
                    <Grid container spacing={2}>
                      {voiceStyles.map((style) => (
                        <Grid item xs={12} key={style.value}>
                          <Paper
                            elevation={personalizationOptions.voice_style === style.value ? 3 : 1}
                            sx={{
                              p: 2,
                              cursor: 'pointer',
                              border: personalizationOptions.voice_style === style.value ? 
                                `2px solid ${style.color}` : '1px solid transparent',
                              '&:hover': { bgcolor: 'action.hover' }
                            }}
                            onClick={() => setPersonalizationOptions(prev => ({
                              ...prev,
                              voice_style: style.value as any,
                            }))}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar sx={{ bgcolor: style.color }}>
                                {style.icon}
                              </Avatar>
                              <Box>
                                <Typography variant="body1" fontWeight="medium">
                                  {style.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {style.description}
                                </Typography>
                              </Box>
                            </Box>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Cooking Preferences Card */}
              <Grid item xs={12} md={6}>
                <Card elevation={2} sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon color="primary" />
                      Cooking Level & Family
                    </Typography>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Cooking Level</InputLabel>
                      <Select
                        value={personalizationOptions.user_preferences.cooking_level}
                        onChange={(e) => setPersonalizationOptions(prev => ({
                          ...prev,
                          user_preferences: {
                            ...prev.user_preferences,
                            cooking_level: e.target.value as any,
                          },
                        }))}
                        label="Cooking Level"
                        startAdornment={<DifficultyIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                      >
                        <MenuItem value="beginner">🌱 Beginner</MenuItem>
                        <MenuItem value="intermediate">👨‍🍳 Intermediate</MenuItem>
                        <MenuItem value="advanced">⭐ Advanced</MenuItem>
                      </Select>
                    </FormControl>

                    <Typography gutterBottom>
                      Family Size: {personalizationOptions.user_preferences.family_size} people
                    </Typography>
                    <Slider
                      value={personalizationOptions.user_preferences.family_size || 2}
                      onChange={(_, value) => setPersonalizationOptions(prev => ({
                        ...prev,
                        user_preferences: {
                          ...prev.user_preferences,
                          family_size: value as number,
                        },
                      }))}
                      min={1}
                      max={8}
                      marks={[
                        { value: 1, label: '1' },
                        { value: 4, label: '4' },
                        { value: 8, label: '8+' },
                      ]}
                      valueLabelDisplay="auto"
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Occasion & Meal Prep Card */}
              <Grid item xs={12}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <OccasionIcon color="primary" />
                      Occasion & Meal Prep Style
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Occasion</InputLabel>
                          <Select
                            value={personalizationOptions.occasion}
                            onChange={(e) => setPersonalizationOptions(prev => ({
                              ...prev,
                              occasion: e.target.value as any,
                            }))}
                            label="Occasion"
                          >
                            {occasions.map((occasion) => (
                              <MenuItem key={occasion.value} value={occasion.value}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <span>{occasion.emoji}</span>
                                  <span>{occasion.label}</span>
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Meal Prep Style</InputLabel>
                          <Select
                            value={personalizationOptions.user_preferences.meal_prep_style}
                            onChange={(e) => setPersonalizationOptions(prev => ({
                              ...prev,
                              user_preferences: {
                                ...prev.user_preferences,
                                meal_prep_style: e.target.value as any,
                              },
                            }))}
                            label="Meal Prep Style"
                            startAdornment={<MealPrepIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                          >
                            <MenuItem value="">No Preference</MenuItem>
                            <MenuItem value="batch_cook">📦 Batch Cook & Freeze</MenuItem>
                            <MenuItem value="leftovers_friendly">🍱 Leftovers Friendly</MenuItem>
                            <MenuItem value="fresh_daily">🌿 Fresh Daily</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            {/* Favorite Ingredients Card */}
            <Grid item xs={12} md={6}>
              <Card elevation={2} sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FavoriteIcon color="primary" />
                    Favorite Ingredients
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel>Choose favorites</InputLabel>
                    <Select
                      multiple
                      value={personalizationOptions.user_preferences.favorite_ingredients}
                      onChange={(e) => setPersonalizationOptions(prev => ({
                        ...prev,
                        user_preferences: {
                          ...prev.user_preferences,
                          favorite_ingredients: e.target.value as string[],
                        },
                      }))}
                      label="Choose favorites"
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((value) => (
                            <Chip key={value} label={`🥦 ${value}`} size="small" color="primary" />
                          ))}
                        </Box>
                      )}
                    >
                      {commonIngredients.map((ingredient) => (
                        <MenuItem key={ingredient} value={ingredient}>
                          🥦 {ingredient}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>

            {/* Avoided Ingredients Card */}
            <Grid item xs={12} md={6}>
              <Card elevation={2} sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AvoidIcon color="secondary" />
                    Ingredients to Avoid
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel>Choose to avoid</InputLabel>
                    <Select
                      multiple
                      value={personalizationOptions.user_preferences.avoided_ingredients}
                      onChange={(e) => setPersonalizationOptions(prev => ({
                        ...prev,
                        user_preferences: {
                          ...prev.user_preferences,
                          avoided_ingredients: e.target.value as string[],
                        },
                      }))}
                      label="Choose to avoid"
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((value) => (
                            <Chip key={value} label={`🚫 ${value}`} size="small" color="secondary" />
                          ))}
                        </Box>
                      )}
                    >
                      {commonIngredients.map((ingredient) => (
                        <MenuItem key={ingredient} value={ingredient}>
                          🚫 {ingredient}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </CardContent>
              </Card>
            </Grid>

            {/* Dietary Restrictions & Cuisine */}
            <Grid item xs={12}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SettingsIcon color="primary" />
                    Dietary Restrictions & Cuisine
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Dietary Restrictions</InputLabel>
                        <Select
                          multiple
                          value={advancedOptions.dietary_restrictions}
                          onChange={(e) => setAdvancedOptions(prev => ({
                            ...prev,
                            dietary_restrictions: e.target.value as string[],
                          }))}
                          label="Dietary Restrictions"
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {(selected as string[]).map((value) => (
                                <Chip key={value} label={value} size="small" />
                              ))}
                            </Box>
                          )}
                        >
                          {dietaryOptions.map((diet) => (
                            <MenuItem key={diet} value={diet}>
                              {diet}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Cuisine Preference</InputLabel>
                        <Select
                          value={advancedOptions.cuisine_preference}
                          onChange={(e) => setAdvancedOptions(prev => ({
                            ...prev,
                            cuisine_preference: e.target.value,
                          }))}
                          label="Cuisine Preference"
                        >
                          <MenuItem value="">Any Cuisine</MenuItem>
                          {cuisineOptions.map((cuisine) => (
                            <MenuItem key={cuisine} value={cuisine}>
                              {cuisine}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Advanced Options */}
            <Grid item xs={12}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimeIcon color="primary" />
                    Time & Servings
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Servings"
                        value={advancedOptions.servings}
                        onChange={(e) => setAdvancedOptions(prev => ({
                          ...prev,
                          servings: parseInt(e.target.value) || 4,
                        }))}
                        inputProps={{ min: 1, max: 20 }}
                        InputProps={{
                          startAdornment: <ServingsIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Max Prep Time (min)"
                        value={advancedOptions.max_prep_time}
                        onChange={(e) => setAdvancedOptions(prev => ({
                          ...prev,
                          max_prep_time: parseInt(e.target.value) || 60,
                        }))}
                        inputProps={{ min: 5, max: 240 }}
                        InputProps={{
                          startAdornment: <TimeIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Max Cook Time (min)"
                        value={advancedOptions.max_cook_time}
                        onChange={(e) => setAdvancedOptions(prev => ({
                          ...prev,
                          max_cook_time: parseInt(e.target.value) || 120,
                        }))}
                        inputProps={{ min: 5, max: 480 }}
                        InputProps={{
                          startAdornment: <TimeIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth>
                        <InputLabel>Difficulty</InputLabel>
                        <Select
                          value={advancedOptions.difficulty_level}
                          onChange={(e) => setAdvancedOptions(prev => ({
                            ...prev,
                            difficulty_level: e.target.value as 'easy' | 'medium' | 'hard',
                          }))}
                          label="Difficulty"
                          startAdornment={<DifficultyIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                        >
                          <MenuItem value="easy">🌱 Easy</MenuItem>
                          <MenuItem value="medium">⚡ Medium</MenuItem>
                          <MenuItem value="hard">🔥 Hard</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Feature Toggles */}
            <Grid item xs={12}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recipe Features
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={personalizationOptions.include_chef_notes}
                          onChange={(e) => setPersonalizationOptions(prev => ({
                            ...prev,
                            include_chef_notes: e.target.checked,
                          }))}
                        />
                      }
                      label="📝 Include Chef's Notes & Stories"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={personalizationOptions.include_variations}
                          onChange={(e) => setPersonalizationOptions(prev => ({
                            ...prev,
                            include_variations: e.target.checked,
                          }))}
                        />
                      }
                      label="🔄 Include Recipe Variations & Tips"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={advancedOptions.include_nutrition}
                          onChange={(e) => setAdvancedOptions(prev => ({
                            ...prev,
                            include_nutrition: e.target.checked,
                          }))}
                        />
                      }
                      label="📊 Include Nutrition Information"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={advancedOptions.include_cost_estimate}
                          onChange={(e) => setAdvancedOptions(prev => ({
                            ...prev,
                            include_cost_estimate: e.target.checked,
                          }))}
                        />
                      }
                      label="💰 Include Cost Estimate"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Header with progress */}
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center">
              <AIIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
              <Typography variant="h5" component="h2">
                AI Recipe Generator
              </Typography>
              <Chip 
                label="Powered by AI" 
                color="primary" 
                size="small" 
                sx={{ ml: 2 }}
              />
            </Box>
            
            <Box display="flex" gap={1}>
              <Tooltip title="Save current settings as defaults">
                <IconButton onClick={saveDefaults} color="primary">
                  <SaveIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" mb={3}>
            Create personalized recipes with our AI. Follow the steps to get the perfect recipe for your needs.
          </Typography>

          {/* Progress Stepper */}
          <Stepper activeStep={activeStep} orientation={isMobile ? "vertical" : "horizontal"}>
            {steps.map((step, index) => (
              <Step key={step.label} completed={completedSteps.has(index)}>
                <StepLabel 
                  onClick={() => handleStepClick(index)}
                  sx={{ cursor: index === 0 || completedSteps.has(index - 1) ? 'pointer' : 'default' }}
                  StepIconComponent={({ active, completed }) => (
                    <Avatar 
                      sx={{ 
                        bgcolor: completed ? 'success.main' : active ? 'primary.main' : 'grey.300',
                        width: 32,
                        height: 32
                      }}
                    >
                      {completed ? <CheckIcon /> : step.icon}
                    </Avatar>
                  )}
                >
                  <Box>
                    <Typography variant="body1" fontWeight={activeStep === index ? 'bold' : 'normal'}>
                      {step.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {step.description}
                    </Typography>
                  </Box>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Box mb={3}>
        {renderStepContent(activeStep)}
      </Box>

      {/* Navigation Buttons */}
      <Card elevation={2}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Button
              onClick={handleBack}
              disabled={activeStep === 0}
              startIcon={<BackIcon />}
              variant="outlined"
            >
              Back
            </Button>

            <Box display="flex" alignItems="center" gap={2}>
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGenerate}
                  disabled={generateRecipeMutation.isLoading || !prompt.trim()}
                  startIcon={generateRecipeMutation.isLoading ? <CircularProgress size={20} /> : <AIIcon />}
                  sx={{ px: 4, py: 1.5 }}
                >
                  {generateRecipeMutation.isLoading ? 'Generating Recipe...' : 'Generate Recipe'}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  variant="contained"
                  endIcon={<NextIcon />}
                  disabled={activeStep === 0 && !prompt.trim()}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Floating Action Button for Mobile */}
      {isMobile && activeStep === steps.length - 1 && (
        <Zoom in={true}>
          <Fab
            color="primary"
            aria-label="generate recipe"
            onClick={handleGenerate}
            disabled={generateRecipeMutation.isLoading || !prompt.trim()}
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              zIndex: 1000,
            }}
          >
            {generateRecipeMutation.isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              <AIIcon />
            )}
          </Fab>
        </Zoom>
      )}

      {/* Loading Progress */}
      {generateRecipeMutation.isLoading && (
        <Card elevation={2} sx={{ mt: 2 }}>
          <CardContent>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" align="center">
              🤖 AI is analyzing your request and creating the perfect recipe...
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AIRecipeGenerator; 