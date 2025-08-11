import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Divider,
  Badge,
  Rating,
} from '@mui/material';
import {
  Add as AddIcon,
  AccessTime as TimeIcon,
  People as ServingsIcon,
  Star as StarIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  RestaurantMenu as RecipeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { recommendationsApi, scrapedRecipesApi } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`recipe-tabpanel-${index}`}
      aria-labelledby={`recipe-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Recipes: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  // Fetch personalized recommendations
  const { 
    data: recommendationsData, 
    isLoading: recommendationsLoading, 
    error: recommendationsError,
    refetch: refetchRecommendations
  } = useQuery(
    'recommendations',
    () => recommendationsApi.getPersonalized({
      user_id: 'default',
      limit: 12,
      cooking_skill_level: 'medium'
    }),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Fetch all scraped recipes
  const { 
    data: allRecipesData, 
    isLoading: allRecipesLoading, 
    error: allRecipesError
  } = useQuery(
    'allScrapedRecipes',
    () => scrapedRecipesApi.getAll({ limit: 20 }),
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    }
  );

  // Fetch recommendation stats
  const { data: statsData } = useQuery(
    'recommendationStats',
    () => recommendationsApi.getStats(),
    {
      staleTime: 10 * 60 * 1000,
    }
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const parseTimeString = (timeStr: string): string => {
    if (!timeStr) return 'N/A';
    const minutes = timeStr.replace(/[^\d]/g, '');
    return minutes ? `${minutes} min` : timeStr;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 1.8) return '#4caf50'; // Green for high scores
    if (score >= 1.5) return '#ff9800'; // Orange for medium scores
    return '#757575'; // Gray for lower scores
  };

  const renderRecommendationCard = (recommendation: any) => (
    <Grid item xs={12} sm={6} lg={4} key={recommendation.recipe.id}>
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: (theme) => theme.shadows[8],
          }
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" component="h3" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              {recommendation.recipe.title}
            </Typography>
            <Tooltip title={`Recommendation Score: ${recommendation.recommendation_score.toFixed(1)}`}>
              <Badge 
                badgeContent={recommendation.recommendation_score.toFixed(1)} 
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: getScoreColor(recommendation.recommendation_score),
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                  }
                }}
              >
                <StarIcon sx={{ color: getScoreColor(recommendation.recommendation_score) }} />
              </Badge>
            </Tooltip>
          </Box>

          <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 2 }}>
            {recommendation.recipe.description}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<TimeIcon />}
              label={`Prep: ${parseTimeString(recommendation.recipe.prep_time)}`}
              size="small"
              variant="outlined"
              color="primary"
            />
            <Chip
              icon={<TimeIcon />}
              label={`Cook: ${parseTimeString(recommendation.recipe.cook_time)}`}
              size="small"
              variant="outlined"
              color="secondary"
            />
            <Chip
              icon={<ServingsIcon />}
              label={`${recommendation.recipe.servings} servings`}
              size="small"
              variant="outlined"
            />
          </Box>

          <Alert 
            severity="info" 
            sx={{ mb: 2 }}
            icon={<InfoIcon />}
          >
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
              Why recommended: {recommendation.match_reason}
            </Typography>
          </Alert>

          <Chip
            label={recommendation.recipe.source_site}
            size="small"
            color="default"
            sx={{ textTransform: 'capitalize' }}
          />
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => window.open(recommendation.recipe.source_url, '_blank')}
            disabled={!recommendation.recipe.source_url}
          >
            View Original
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<RecipeIcon />}
            // TODO: Navigate to recipe detail page
            onClick={() => {
              // For now, show an alert with recipe details
              alert(`Recipe: ${recommendation.recipe.title}\n\nInstructions:\n${recommendation.recipe.instructions}`);
            }}
          >
            View Recipe
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  const renderAllRecipesCard = (recipe: any) => (
    <Grid item xs={12} sm={6} lg={4} key={recipe.id}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="h3" gutterBottom>
            {recipe.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {recipe.description}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<TimeIcon />}
              label={`Prep: ${parseTimeString(recipe.prep_time)}`}
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<TimeIcon />}
              label={`Cook: ${parseTimeString(recipe.cook_time)}`}
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<ServingsIcon />}
              label={`${recipe.servings} servings`}
              size="small"
              variant="outlined"
            />
          </Box>

          <Chip
            label={recipe.source_site}
            size="small"
            color="default"
            sx={{ textTransform: 'capitalize' }}
          />
        </CardContent>

        <CardActions>
          <Button
            size="small"
            onClick={() => window.open(recipe.source_url, '_blank')}
            disabled={!recipe.source_url}
          >
            View Original
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              alert(`Recipe: ${recipe.title}\n\nInstructions:\n${recipe.instructions}`);
            }}
          >
            View Recipe
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Recipes
          </Typography>
          {statsData && (
            <Typography variant="body2" color="text.secondary">
              {statsData.data.total_recipes} recipes available • {statsData.data.recent_additions} added recently
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh recommendations">
            <IconButton onClick={() => refetchRecommendations()} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/recipes/create')}
          >
            Add Recipe
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StarIcon />
                Recommendations for You
                                 {recommendationsData && (
                   <Chip 
                     label={recommendationsData.data.total} 
                     size="small" 
                     color="primary"
                   />
                 )}
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RecipeIcon />
                All Recipes
                                 {allRecipesData && (
                   <Chip 
                     label={allRecipesData.data.total} 
                     size="small" 
                     color="default"
                   />
                 )}
               </Box>
             } 
           />
         </Tabs>
       </Paper>

       {/* Tab Panels */}
       <TabPanel value={activeTab} index={0}>
         {recommendationsLoading ? (
           <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
             <CircularProgress />
           </Box>
         ) : recommendationsError ? (
           <Alert severity="error" sx={{ mb: 3 }}>
             Failed to load recommendations. Please try again.
           </Alert>
         ) : recommendationsData?.data.recommendations.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No recommendations available yet
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Complete your user preferences to get personalized recipe recommendations.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/settings')}>
              Set Preferences
            </Button>
          </Paper>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                These recipes are personalized for you based on your preferences: medium cooking skill level, 
                preparation time under 45 minutes, and your taste preferences.
              </Typography>
            </Alert>
                         <Grid container spacing={3}>
               {recommendationsData?.data.recommendations.map(renderRecommendationCard)}
             </Grid>
           </>
         )}
       </TabPanel>

       <TabPanel value={activeTab} index={1}>
         {allRecipesLoading ? (
           <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
             <CircularProgress />
           </Box>
         ) : allRecipesError ? (
           <Alert severity="error" sx={{ mb: 3 }}>
             Failed to load recipes. Please try again.
           </Alert>
         ) : allRecipesData?.data.recipes.length === 0 ? (
           <Paper sx={{ p: 4, textAlign: 'center' }}>
             <Typography variant="h6" color="text.secondary" gutterBottom>
               No recipes available
             </Typography>
             <Typography variant="body2" color="text.secondary" paragraph>
               Start by creating your first recipe or wait for the scraper to add more recipes.
             </Typography>
             <Button variant="contained" onClick={() => navigate('/recipes/create')}>
               Create Recipe
             </Button>
           </Paper>
         ) : (
           <Grid container spacing={3}>
             {allRecipesData?.data.recipes.map(renderAllRecipesCard)}
           </Grid>
         )}
      </TabPanel>
    </Box>
  );
};

export default Recipes; 