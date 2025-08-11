import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const ShoppingLists: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Shopping Lists
      </Typography>

      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No shopping lists found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Shopping lists are generated from your meal plans.
        </Typography>
      </Paper>
    </Box>
  );
};

export default ShoppingLists; 