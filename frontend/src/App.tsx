import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

// Layout components
import Layout from './components/Layout/Layout';

// Page components
import Dashboard from './pages/Dashboard';
import Recipes from './pages/Recipes';
import RecipeDetail from './pages/RecipeDetail';
import CreateRecipe from './pages/CreateRecipe';
import Ingredients from './pages/Ingredients';
import MealPlans from './pages/MealPlans';
import MealPlanDetail from './pages/MealPlanDetail';
import CreateMealPlan from './pages/CreateMealPlan';
import ShoppingLists from './pages/ShoppingLists';
import ShoppingCart from './pages/ShoppingCart';
import Settings from './pages/Settings';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Recipe routes */}
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/recipes/create" element={<CreateRecipe />} />
              <Route path="/recipes/:id" element={<RecipeDetail />} />
              
              {/* Ingredient routes */}
              <Route path="/ingredients" element={<Ingredients />} />
              
              {/* Meal plan routes */}
              <Route path="/meal-plans" element={<MealPlans />} />
              <Route path="/meal-plans/create" element={<CreateMealPlan />} />
              <Route path="/meal-plans/:id" element={<MealPlanDetail />} />
              
              {/* Shopping list routes */}
              <Route path="/shopping-lists" element={<ShoppingLists />} />
              
              {/* Shopping cart routes */}
              <Route path="/cart" element={<ShoppingCart />} />
              
              {/* Settings routes */}
              <Route path="/settings" element={<Settings />} />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        </Router>
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App; 