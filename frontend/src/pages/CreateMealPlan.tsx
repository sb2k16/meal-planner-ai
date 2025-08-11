import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper } from '@mui/material';
import { AutoAwesome as AIIcon, Edit as ManualIcon } from '@mui/icons-material';
import AIMealPlanGenerator from '../components/AIMealPlanGenerator';

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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const CreateMealPlan: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Create Meal Plan
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Create personalized meal plans using AI or manual planning tools.
      </Typography>

      <Paper elevation={2} sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="meal plan creation tabs">
            <Tab 
              icon={<AIIcon />} 
              label="AI Generator" 
              sx={{ textTransform: 'none' }}
            />
            <Tab 
              icon={<ManualIcon />} 
              label="Manual Planning" 
              sx={{ textTransform: 'none' }}
              disabled
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <AIMealPlanGenerator />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              Manual Meal Planning
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Coming soon - manual meal plan creation tools
            </Typography>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default CreateMealPlan; 