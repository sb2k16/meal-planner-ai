import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Paper,
  Switch,
  FormControlLabel,
  Tooltip,
  Badge,
  Alert,
  Snackbar,
  Divider,
} from '@mui/material';
import {
  Person as PersonIcon,
  Restaurant as RestaurantIcon,
  Kitchen as KitchenIcon,
  FitnessCenter as FitnessIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Edit as EditIcon,
  TrendingUp as TrendingUpIcon,
  Favorite as FavoriteIcon,
  Schedule as ScheduleIcon,
  LocalDining as LocalDiningIcon,
  Psychology as PsychologyIcon,
  Insights as InsightsIcon,
  AutoAwesome as AutoAwesomeIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  UserPreferencesEnhanced,
  UserPreferenceProfile,
  RecommendationRequest,
  PersonalizedRecommendationResponse,
  BehaviorTrackingRequest,
  UserBehaviorEvent,
  UpdatePreferencesRequest,
} from '../types';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  BarElement
);

// Mock API services
const preferencesApi = {
  getUserPreferences: async (userId: string) => ({ data: {} as UserPreferencesEnhanced }),
  getUserProfile: async (userId: string) => ({ data: {} as UserPreferenceProfile }),
  updatePreferences: async (userId: string, preferences: UpdatePreferencesRequest) => ({ data: preferences }),
  getUserBehavior: async (userId: string) => ({ data: [] as UserBehaviorEvent[] }),
  getRecommendationPerformance: async (userId: string) => ({ 
    data: {
      totalRecommendations: 45,
      clickedRecommendations: 32,
      cookedRecommendations: 12,
      clickThroughRate: 71.1,
      cookingConversionRate: 26.7,
      averageRating: 4.3,
      topReasons: ['matches_cuisine_preference', 'quick_meal', 'healthy_choice'],
    }
  }),
  generateRecommendations: async (request: RecommendationRequest) => ({ data: {} as PersonalizedRecommendationResponse }),
  trackBehavior: async (request: BehaviorTrackingRequest) => ({ data: {} }),
};

interface UserPreferencesDashboardProps {
  userId: string;
}

const UserPreferencesDashboard: React.FC<UserPreferencesDashboardProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [insightsDialogOpen, setInsightsDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'warning' | 'info' 
  });
  const queryClient = useQueryClient();

  // Fetch user data
  const { data: userPreferences, isLoading: preferencesLoading } = useQuery(
    ['user-preferences', userId],
    () => preferencesApi.getUserPreferences(userId)
  );

  const { data: userProfile, isLoading: profileLoading } = useQuery(
    ['user-profile', userId],
    () => preferencesApi.getUserProfile(userId)
  );

  const { data: behaviorData } = useQuery(
    ['user-behavior', userId],
    () => preferencesApi.getUserBehavior(userId)
  );

  const { data: recommendationPerformance } = useQuery(
    ['recommendation-performance', userId],
    () => preferencesApi.getRecommendationPerformance(userId)
  );

  // Mutations
  const updatePreferencesMutation = useMutation(
    (preferences: UpdatePreferencesRequest) => preferencesApi.updatePreferences(userId, preferences),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['user-preferences', userId]);
        queryClient.invalidateQueries(['user-profile', userId]);
        setSnackbar({ open: true, message: 'Preferences updated successfully!', severity: 'success' });
      },
      onError: () => {
        setSnackbar({ open: true, message: 'Failed to update preferences', severity: 'error' });
      },
    }
  );

  const generateRecommendationsMutation = useMutation(
    (request: RecommendationRequest) => preferencesApi.generateRecommendations(request),
    {
      onSuccess: () => {
        setSnackbar({ open: true, message: 'New recommendations generated!', severity: 'success' });
      },
    }
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleGenerateRecommendations = () => {
    const request: RecommendationRequest = {
      user_id: userId,
      max_results: 10,
      include_diversity: true,
    };
    generateRecommendationsMutation.mutate(request);
  };

  if (preferencesLoading || profileLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Box sx={{ textAlign: 'center' }}>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography>Loading your preferences...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Your Preferences Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your preferences and see how they improve your recommendations
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="preferences tabs">
          <Tab icon={<PersonIcon />} label="Profile Overview" />
          <Tab icon={<AnalyticsIcon />} label="Behavior Insights" />
          <Tab icon={<AutoAwesomeIcon />} label="Recommendations" />
          <Tab icon={<SettingsIcon />} label="Settings" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && <ProfileOverviewTab userProfile={userProfile?.data} />}
      {activeTab === 1 && <BehaviorInsightsTab behaviorData={behaviorData?.data || []} />}
      {activeTab === 2 && (
        <RecommendationsTab 
          performance={recommendationPerformance?.data}
          onGenerateRecommendations={handleGenerateRecommendations}
          isGenerating={generateRecommendationsMutation.isLoading}
        />
      )}
      {activeTab === 3 && (
        <SettingsTab 
          preferences={userPreferences?.data}
          onUpdatePreferences={(prefs) => updatePreferencesMutation.mutate(prefs)}
          isUpdating={updatePreferencesMutation.isLoading}
        />
      )}

      {/* Floating Action Button for Quick Actions */}
      <Box sx={{ position: 'fixed', bottom: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Tooltip title="Get fresh recommendations">
          <IconButton
            color="primary"
            sx={{ backgroundColor: 'primary.main', color: 'white', '&:hover': { backgroundColor: 'primary.dark' } }}
            onClick={handleGenerateRecommendations}
            disabled={generateRecommendationsMutation.isLoading}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="View insights">
          <IconButton
            color="secondary"
            sx={{ backgroundColor: 'secondary.main', color: 'white', '&:hover': { backgroundColor: 'secondary.dark' } }}
            onClick={() => setInsightsDialogOpen(true)}
          >
            <InsightsIcon />
          </IconButton>
        </Tooltip>
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

// Profile Overview Tab Component
const ProfileOverviewTab: React.FC<{ userProfile?: UserPreferenceProfile }> = ({ userProfile }) => {
  if (!userProfile) return <Typography>No profile data available</Typography>;

  return (
    <Grid container spacing={3}>
      {/* Profile Completeness */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ backgroundColor: 'primary.main', mr: 2 }}>
                <PersonIcon />
              </Avatar>
              <Typography variant="h6">Profile Completeness</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={userProfile.profile_completeness} 
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {userProfile.profile_completeness}%
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {userProfile.profile_completeness === 100 
                ? 'Your profile is complete! 🎉' 
                : `${100 - userProfile.profile_completeness}% left to complete`}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Top Cuisines */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Your Favorite Cuisines
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {userProfile.top_cuisines && userProfile.top_cuisines.length > 0 ? (
                userProfile.top_cuisines.map((cuisine, index) => (
                  <Chip
                    key={cuisine.name}
                    label={`${cuisine.name} (${Math.round(cuisine.score * 100)}%)`}
                    color={index === 0 ? 'primary' : 'default'}
                    icon={index === 0 ? <FavoriteIcon /> : undefined}
                    sx={{ mb: 1 }}
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No cuisine preferences set yet
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Dietary Information */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <RestaurantIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Dietary Preferences
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText 
                  primary="Cooking Skill" 
                  secondary={userProfile.cooking_skill_level ? 
                    userProfile.cooking_skill_level.charAt(0).toUpperCase() + userProfile.cooking_skill_level.slice(1) : 
                    'Not specified'
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Preferred Cooking Time" 
                  secondary={userProfile.preferred_cooking_time || 'Not specified'}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Recommendation Style" 
                  secondary={userProfile.recommendation_style ? 
                    userProfile.recommendation_style.charAt(0).toUpperCase() + userProfile.recommendation_style.slice(1) : 
                    'Not specified'
                  }
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Restrictions & Allergies */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <FitnessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Health Information
            </Typography>
            
            {userProfile.dietary_restrictions && userProfile.dietary_restrictions.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Dietary Restrictions:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {userProfile.dietary_restrictions.map((restriction) => (
                    <Chip key={restriction} label={restriction} size="small" color="secondary" />
                  ))}
                </Box>
              </Box>
            )}

            {userProfile.allergies && userProfile.allergies.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Allergies:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {userProfile.allergies.map((allergy) => (
                    <Chip key={allergy} label={allergy} size="small" color="error" />
                  ))}
                </Box>
              </Box>
            )}

            {(!userProfile.dietary_restrictions || userProfile.dietary_restrictions.length === 0) && 
             (!userProfile.allergies || userProfile.allergies.length === 0) && (
              <Typography variant="body2" color="text.secondary">
                No restrictions or allergies specified
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Activity Status */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Activity Status
              </Typography>
              <Chip 
                label={userProfile.onboarding_completed ? 'Setup Complete' : 'Setup Incomplete'} 
                color={userProfile.onboarding_completed ? 'success' : 'warning'}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Last activity: {userProfile.last_activity_date ? new Date(userProfile.last_activity_date).toLocaleDateString() : 'Never'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Behavior Insights Tab Component
const BehaviorInsightsTab: React.FC<{ behaviorData: UserBehaviorEvent[] }> = ({ behaviorData }) => {
  // Process behavior data for charts
  const eventTypeCounts = behaviorData.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const doughnutData = {
    labels: Object.keys(eventTypeCounts),
    datasets: [
      {
        data: Object.values(eventTypeCounts),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
        ],
      },
    ],
  };

  // Daily activity chart
  const dailyActivity = behaviorData.reduce((acc, event) => {
    const date = new Date(event.timestamp).toLocaleDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const lineData = {
    labels: Object.keys(dailyActivity).slice(-7), // Last 7 days
    datasets: [
      {
        label: 'Daily Activity',
        data: Object.values(dailyActivity).slice(-7),
        borderColor: '#36A2EB',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        fill: true,
      },
    ],
  };

  return (
    <Grid container spacing={3}>
      {/* Activity Summary */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Activity Summary
            </Typography>
            <Box sx={{ height: 300 }}>
              <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Weekly Activity */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Weekly Activity Trend
            </Typography>
            <Box sx={{ height: 300 }}>
              <Line data={lineData} options={{ maintainAspectRatio: false }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Behavior Insights */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Behavior Insights
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {behaviorData.filter(e => e.event_type === 'recipe_viewed').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Recipes Viewed
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {behaviorData.filter(e => e.event_type === 'recipe_saved').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Recipes Saved
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {behaviorData.filter(e => e.event_type === 'recipe_cooked').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Recipes Cooked
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {behaviorData.filter(e => e.event_type === 'search_performed').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Searches Performed
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Activity */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List>
              {behaviorData.slice(0, 10).map((event, index) => (
                <ListItem key={index} divider>
                  <ListItemAvatar>
                    <Avatar sx={{ backgroundColor: getEventColor(event.event_type) }}>
                      {getEventIcon(event.event_type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={formatEventType(event.event_type)}
                    secondary={`${new Date(event.timestamp).toLocaleString()} • ${event.source}`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Recommendations Tab Component
const RecommendationsTab: React.FC<{
  performance?: any;
  onGenerateRecommendations: () => void;
  isGenerating: boolean;
}> = ({ performance, onGenerateRecommendations, isGenerating }) => {
  return (
    <Grid container spacing={3}>
      {/* Performance Metrics */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                <AutoAwesomeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Recommendation Performance
              </Typography>
              <Button
                variant="contained"
                onClick={onGenerateRecommendations}
                disabled={isGenerating}
                startIcon={<RefreshIcon />}
              >
                {isGenerating ? 'Generating...' : 'Get New Recommendations'}
              </Button>
            </Box>

            {performance && (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {performance.totalRecommendations}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Recommendations
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {performance.clickThroughRate}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Click Through Rate
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {performance.cookingConversionRate}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cooking Conversion
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {performance.averageRating}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Average Rating
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Top Recommendation Reasons */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Why We Recommend
            </Typography>
            <List>
              {performance?.topReasons.map((reason: string, index: number) => (
                <ListItem key={reason}>
                  <ListItemText
                    primary={formatRecommendationReason(reason)}
                    secondary={`Appears in ${Math.round(Math.random() * 40 + 20)}% of recommendations`}
                  />
                  <Chip size="small" label={`#${index + 1}`} color="primary" />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Recommendation Settings */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recommendation Settings
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Include Diversity"
                  secondary="Mix familiar and new cuisines"
                />
                <Switch defaultChecked />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Seasonal Preferences"
                  secondary="Favor seasonal ingredients"
                />
                <Switch defaultChecked />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Smart Notifications"
                  secondary="Notify when new recommendations are available"
                />
                <Switch />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Settings Tab Component
const SettingsTab: React.FC<{
  preferences?: UserPreferencesEnhanced;
  onUpdatePreferences: (preferences: UpdatePreferencesRequest) => void;
  isUpdating: boolean;
}> = ({ preferences, onUpdatePreferences, isUpdating }) => {
  const [editingSection, setEditingSection] = useState<string | null>(null);

  if (!preferences) return <Typography>Loading preferences...</Typography>;

  return (
    <Grid container spacing={3}>
      {/* Quick Settings */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Settings
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Family Size"
                  secondary={`Currently set to ${preferences.family_size} people`}
                />
                <Button size="small" onClick={() => setEditingSection('family_size')}>
                  Edit
                </Button>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Cooking Skill Level"
                  secondary={preferences.cooking_skill_level.charAt(0).toUpperCase() + preferences.cooking_skill_level.slice(1)}
                />
                <Button size="small" onClick={() => setEditingSection('skill_level')}>
                  Edit
                </Button>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Maximum Prep Time"
                  secondary={`${preferences.max_prep_time_minutes} minutes`}
                />
                <Button size="small" onClick={() => setEditingSection('prep_time')}>
                  Edit
                </Button>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Recommendation Style"
                  secondary={preferences.recommendation_style.charAt(0).toUpperCase() + preferences.recommendation_style.slice(1)}
                />
                <Button size="small" onClick={() => setEditingSection('rec_style')}>
                  Edit
                </Button>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Data & Privacy */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Data & Privacy
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Behavior Tracking"
                  secondary="Help improve recommendations by tracking recipe interactions"
                />
                <Switch defaultChecked />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Analytics"
                  secondary="Allow anonymous usage analytics"
                />
                <Switch defaultChecked />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Email Notifications"
                  secondary="Receive weekly recipe recommendations"
                />
                <Switch />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Advanced Settings */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Advanced Settings
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Reset Preferences"
                  secondary="Start fresh with clean preferences"
                />
                <Button size="small" color="error">
                  Reset
                </Button>
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Export Data"
                  secondary="Download your preferences and activity data"
                />
                <Button size="small">
                  Export
                </Button>
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Delete Account"
                  secondary="Permanently delete your account and all data"
                />
                <Button size="small" color="error">
                  Delete
                </Button>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Helper functions
const getEventColor = (eventType: string): string => {
  const colors: Record<string, string> = {
    recipe_viewed: '#2196F3',
    recipe_saved: '#4CAF50',
    recipe_cooked: '#FF9800',
    search_performed: '#9C27B0',
    default: '#757575',
  };
  return colors[eventType] || colors.default;
};

const getEventIcon = (eventType: string): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    recipe_viewed: <LocalDiningIcon />,
    recipe_saved: <FavoriteIcon />,
    recipe_cooked: <KitchenIcon />,
    search_performed: <AnalyticsIcon />,
    default: <RestaurantIcon />,
  };
  return icons[eventType] || icons.default;
};

const formatEventType = (eventType: string): string => {
  const formatted: Record<string, string> = {
    recipe_viewed: 'Viewed a recipe',
    recipe_saved: 'Saved a recipe',
    recipe_cooked: 'Cooked a recipe',
    search_performed: 'Performed a search',
    default: 'Unknown activity',
  };
  return formatted[eventType] || formatted.default;
};

const formatRecommendationReason = (reason: string): string => {
  const formatted: Record<string, string> = {
    matches_cuisine_preference: 'Matches your favorite cuisines',
    quick_meal: 'Quick and easy preparation',
    healthy_choice: 'Aligns with your health goals',
    seasonal_ingredient: 'Features seasonal ingredients',
    popular_recipe: 'Popular among similar users',
    default: reason,
  };
  return formatted[reason] || formatted.default;
};

export default UserPreferencesDashboard; 