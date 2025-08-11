import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Person as PersonIcon,
  Psychology as PsychologyIcon,
  Analytics as AnalyticsIcon,
  Security as SecurityIcon,
  NotificationsActive as NotificationsIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  AutoAwesome as AutoAwesomeIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import UserPreferencesDashboard from '../components/UserPreferencesDashboard';
import UserOnboardingWizard from '../components/UserOnboardingWizard';
import { useBehaviorTracking } from '../services/behaviorTrackingService';
import {
  UserPreferencesEnhanced,
  UserOnboardingProgress,
  UpdatePreferencesRequest,
  RecommendationRequest,
} from '../types';

// Mock user ID - in real app, this would come from auth context
const MOCK_USER_ID = 'user123';

// Mock API services
const settingsApi = {
  getUserPreferences: async (userId: string) => ({ data: {} as UserPreferencesEnhanced }),
  getOnboardingProgress: async (userId: string) => ({ data: {} as UserOnboardingProgress }),
  updatePreferences: async (userId: string, preferences: UpdatePreferencesRequest) => ({ data: preferences }),
  resetPreferences: async (userId: string) => ({ data: {} }),
  exportUserData: async (userId: string) => ({ data: {} }),
  deleteUserData: async (userId: string) => ({ data: {} }),
  generateRecommendations: async (request: RecommendationRequest) => ({ data: {} }),
};

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  
  const queryClient = useQueryClient();
  const { trackFeatureUsage, getSessionStats } = useBehaviorTracking();

  // Fetch user data
  const { data: userPreferences, isLoading } = useQuery(
    ['user-preferences', MOCK_USER_ID],
    () => settingsApi.getUserPreferences(MOCK_USER_ID)
  );

  const { data: onboardingProgress } = useQuery(
    ['onboarding-progress', MOCK_USER_ID],
    () => settingsApi.getOnboardingProgress(MOCK_USER_ID)
  );

  // Mutations
  const resetPreferencesMutation = useMutation(
    () => settingsApi.resetPreferences(MOCK_USER_ID),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['user-preferences', MOCK_USER_ID]);
        setSnackbar({ open: true, message: 'Preferences reset successfully!', severity: 'success' });
        setShowResetDialog(false);
      },
      onError: () => {
        setSnackbar({ open: true, message: 'Failed to reset preferences', severity: 'error' });
      },
    }
  );

  const exportDataMutation = useMutation(
    () => settingsApi.exportUserData(MOCK_USER_ID),
    {
      onSuccess: () => {
        setSnackbar({ open: true, message: 'Data export started! Check your downloads.', severity: 'success' });
      },
    }
  );

  const deleteDataMutation = useMutation(
    () => settingsApi.deleteUserData(MOCK_USER_ID),
    {
      onSuccess: () => {
        setSnackbar({ open: true, message: 'Account deleted successfully', severity: 'success' });
        setShowDeleteDialog(false);
      },
      onError: () => {
        setSnackbar({ open: true, message: 'Failed to delete account', severity: 'error' });
      },
    }
  );

  const generateRecommendationsMutation = useMutation(
    (request: RecommendationRequest) => settingsApi.generateRecommendations(request),
    {
      onSuccess: () => {
        setSnackbar({ open: true, message: 'New recommendations generated!', severity: 'success' });
      },
    }
  );

  // Track page view
  useEffect(() => {
    trackFeatureUsage('settings_page_viewed');
  }, [trackFeatureUsage]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    
    // Track tab usage
    const tabNames = ['preferences', 'privacy', 'notifications', 'advanced'];
    trackFeatureUsage('settings_tab_clicked', { tab: tabNames[newValue] });
  };

  const handleRefreshRecommendations = () => {
    const request: RecommendationRequest = {
      user_id: MOCK_USER_ID,
      max_results: 15,
      include_diversity: true,
    };
    generateRecommendationsMutation.mutate(request);
    trackFeatureUsage('recommendations_refreshed');
  };

  const handleResetPreferences = () => {
    resetPreferencesMutation.mutate();
    trackFeatureUsage('preferences_reset');
  };

  const handleExportData = () => {
    exportDataMutation.mutate();
    trackFeatureUsage('data_exported');
  };

  const handleDeleteAccount = () => {
    deleteDataMutation.mutate();
    trackFeatureUsage('account_deleted');
  };

  const handleRestartOnboarding = () => {
    setShowOnboarding(true);
    trackFeatureUsage('onboarding_restarted');
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    queryClient.invalidateQueries(['user-preferences', MOCK_USER_ID]);
    queryClient.invalidateQueries(['onboarding-progress', MOCK_USER_ID]);
    setSnackbar({ open: true, message: 'Onboarding completed successfully!', severity: 'success' });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Box sx={{ textAlign: 'center' }}>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography>Loading settings...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Onboarding Dialog */}
      {showOnboarding && (
        <Dialog open={showOnboarding} fullScreen>
          <UserOnboardingWizard
            userId={MOCK_USER_ID}
            onComplete={handleOnboardingComplete}
          />
        </Dialog>
      )}

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Settings & Preferences
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage your account, preferences, and personalization settings
        </Typography>

        {/* Quick Actions */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleRefreshRecommendations}
            disabled={generateRecommendationsMutation.isLoading}
          >
            Refresh Recommendations
          </Button>
          <Button
            variant="outlined"
            startIcon={<PersonIcon />}
            onClick={handleRestartOnboarding}
          >
            Restart Onboarding
          </Button>
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={() => setActiveTab(0)}
          >
            View Profile
          </Button>
        </Box>
      </Box>

      {/* Onboarding Status */}
      {onboardingProgress?.data && !onboardingProgress.data.onboarding_completed_at && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Complete your onboarding to get better personalized recommendations! 
            <Button size="small" onClick={handleRestartOnboarding} sx={{ ml: 1 }}>
              Continue Setup
            </Button>
          </Typography>
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="settings tabs">
          <Tab icon={<PersonIcon />} label="User Preferences" />
          <Tab icon={<SecurityIcon />} label="Privacy & Data" />
          <Tab icon={<NotificationsIcon />} label="Notifications" />
          <Tab icon={<AnalyticsIcon />} label="Advanced" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <UserPreferencesDashboard userId={MOCK_USER_ID} />
      )}

      {activeTab === 1 && (
        <PrivacyDataTab
          onExportData={handleExportData}
          onDeleteAccount={() => setShowDeleteDialog(true)}
          isExporting={exportDataMutation.isLoading}
          isDeleting={deleteDataMutation.isLoading}
        />
      )}

      {activeTab === 2 && (
        <NotificationsTab />
      )}

      {activeTab === 3 && (
        <AdvancedTab
          onResetPreferences={() => setShowResetDialog(true)}
          sessionStats={getSessionStats()}
          isResetting={resetPreferencesMutation.isLoading}
        />
      )}

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onClose={() => setShowResetDialog(false)}>
        <DialogTitle>Reset All Preferences?</DialogTitle>
        <DialogContent>
          <Typography>
            This will reset all your preferences, dietary restrictions, and learned behaviors back to default settings.
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResetDialog(false)}>Cancel</Button>
          <Button onClick={handleResetPreferences} color="error" variant="contained">
            Reset Everything
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Delete Account?</DialogTitle>
        <DialogContent>
          <Typography color="error" gutterBottom>
            <strong>This action is permanent and cannot be undone.</strong>
          </Typography>
          <Typography>
            Deleting your account will permanently remove all your data including:
          </Typography>
          <List dense>
            <ListItem>• All preferences and settings</ListItem>
            <ListItem>• Recipe history and ratings</ListItem>
            <ListItem>• Meal plans and shopping lists</ListItem>
            <ListItem>• Behavior and analytics data</ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error" variant="contained">
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>

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

// Privacy & Data Tab Component
const PrivacyDataTab: React.FC<{
  onExportData: () => void;
  onDeleteAccount: () => void;
  isExporting: boolean;
  isDeleting: boolean;
}> = ({ onExportData, onDeleteAccount, isExporting, isDeleting }) => {
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Data Privacy Controls
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Behavior Tracking"
                  secondary="Allow tracking of recipe interactions to improve recommendations"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={trackingEnabled}
                    onChange={(e) => setTrackingEnabled(e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Usage Analytics"
                  secondary="Share anonymous usage data to help improve the app"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={analyticsEnabled}
                    onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Data Sharing"
                  secondary="Allow sharing anonymized preference data for research"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={dataSharing}
                    onChange={(e) => setDataSharing(e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Data Management
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Export My Data"
                  secondary="Download all your data in JSON format"
                />
                <ListItemSecondaryAction>
                  <Button
                    startIcon={<DownloadIcon />}
                    onClick={onExportData}
                    disabled={isExporting}
                    size="small"
                  >
                    {isExporting ? 'Exporting...' : 'Export'}
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Delete Account"
                  secondary="Permanently delete your account and all data"
                />
                <ListItemSecondaryAction>
                  <Button
                    startIcon={<DeleteIcon />}
                    onClick={onDeleteAccount}
                    disabled={isDeleting}
                    color="error"
                    size="small"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Privacy Information
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Data We Collect:</strong> We collect information about your recipe preferences, 
              cooking behavior, and app usage to provide personalized recommendations.
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>How We Use It:</strong> Your data is used to improve recipe recommendations, 
              understand usage patterns, and enhance the app experience.
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Data Retention:</strong> Your data is retained as long as your account is active. 
              You can delete your account at any time to remove all data.
            </Typography>
            <Typography variant="body2">
              <strong>Third Parties:</strong> We do not sell or share your personal data with third parties 
              for marketing purposes.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Notifications Tab Component
const NotificationsTab: React.FC = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [newRecipeAlerts, setNewRecipeAlerts] = useState(false);
  const [mealPlanReminders, setMealPlanReminders] = useState(true);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Email Notifications
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Email Notifications"
                  secondary="Receive email notifications"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Weekly Recipe Digest"
                  secondary="Get personalized recipe recommendations weekly"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={weeklyDigest}
                    onChange={(e) => setWeeklyDigest(e.target.checked)}
                    disabled={!emailNotifications}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="New Recipe Alerts"
                  secondary="Get notified when new recipes match your preferences"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={newRecipeAlerts}
                    onChange={(e) => setNewRecipeAlerts(e.target.checked)}
                    disabled={!emailNotifications}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              App Notifications
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Push Notifications"
                  secondary="Allow browser notifications"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={pushNotifications}
                    onChange={(e) => setPushNotifications(e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Meal Plan Reminders"
                  secondary="Get reminded about upcoming meal plans"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={mealPlanReminders}
                    onChange={(e) => setMealPlanReminders(e.target.checked)}
                    disabled={!pushNotifications}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Advanced Tab Component
const AdvancedTab: React.FC<{
  onResetPreferences: () => void;
  sessionStats: any;
  isResetting: boolean;
}> = ({ onResetPreferences, sessionStats, isResetting }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Advanced Settings
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Reset All Preferences"
                  secondary="Clear all preferences and start fresh"
                />
                <ListItemSecondaryAction>
                  <Button
                    color="error"
                    onClick={onResetPreferences}
                    disabled={isResetting}
                    size="small"
                  >
                    {isResetting ? 'Resetting...' : 'Reset'}
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Clear Cache"
                  secondary="Clear cached recipes and recommendations"
                />
                <ListItemSecondaryAction>
                  <Button size="small">Clear</Button>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Debug Mode"
                  secondary="Enable debug logging for troubleshooting"
                />
                <ListItemSecondaryAction>
                  <Switch />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Session Statistics
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Session Duration"
                  secondary={`${Math.round(sessionStats.duration / 1000 / 60)} minutes`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Page Views"
                  secondary={sessionStats.page_views}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Events Tracked"
                  secondary={sessionStats.events_tracked}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Pending Events"
                  secondary={sessionStats.pending_events}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              App Information
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Version:</strong> 1.0.0
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>Personalization Engine:</strong> Advanced machine learning algorithms analyze your 
              cooking behavior and preferences to suggest recipes you'll love.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default Settings; 