import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  Paper,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  ShoppingCart as CartIcon,
  Store as StoreIcon,
  LocalGroceryStore as GroceryIcon,
  Launch as LaunchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { cartApi } from '../services/api';
import { ShoppingCartItem, GroceryStore } from '../types';
import CheckoutPane from '../components/CheckoutPane';

const ShoppingCartPage: React.FC = () => {
  const [editingItem, setEditingItem] = useState<ShoppingCartItem | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [checkoutPaneOpen, setCheckoutPaneOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedStoreName, setSelectedStoreName] = useState<string>('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', type: 'success' as 'success' | 'error' });
  const [checkoutSummary, setCheckoutSummary] = useState({
    open: false,
    storeName: '',
    checkoutUrl: '',
    instructions: '',
    shoppingList: [] as any[],
    itemCount: 0,
    sessionId: '',
  });

  const queryClient = useQueryClient();

  // Fetch cart
  const { data: cart, isLoading: cartLoading, error: cartError } = useQuery({
    queryKey: ['shopping-cart'],
    queryFn: () => cartApi.get(),
    onSuccess: (data) => {
      console.log('Cart loaded:', data?.data);
      console.log('Cart items count:', data?.data?.items?.length || 0);
    },
  });

  // Fetch available stores
  const { data: storesData, isLoading: storesLoading } = useQuery({
    queryKey: ['grocery-stores'],
    queryFn: () => cartApi.getStores(),
  });

  // Update cart item mutation
  const updateItemMutation = useMutation({
    mutationFn: ({ id, quantity, notes }: { id: string; quantity: number; notes: string }) =>
      cartApi.updateItem(id, { quantity, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-cart'] });
      setEditingItem(null);
      setSnackbar({ open: true, message: 'Item updated successfully!', type: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to update item', type: 'error' });
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: (id: string) => cartApi.removeItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-cart'] });
      setSnackbar({ open: true, message: 'Item removed from cart', type: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to remove item', type: 'error' });
    },
  });

  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: () => cartApi.clear(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-cart'] });
      setSnackbar({ open: true, message: 'Cart cleared', type: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to clear cart', type: 'error' });
    },
  });

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: (store: string) => cartApi.checkout(store),
    onSuccess: (data) => {
      console.log('Checkout success:', data);
      const checkoutData = data.data;
      
      // Show enhanced success message with store name
      setSnackbar({ 
        open: true, 
        message: `Redirecting to ${checkoutData.store_name}...`, 
        type: 'success' 
      });

      // If auto_redirect is enabled, open immediately
      if (checkoutData.auto_redirect) {
        // Small delay to show the success message
        setTimeout(() => {
          window.open(checkoutData.checkout_url, '_blank');
        }, 1000);
      }

      // Show checkout summary dialog with enhanced information
      setCheckoutSummary({
        open: true,
        storeName: checkoutData.store_name,
        checkoutUrl: checkoutData.checkout_url,
        instructions: checkoutData.instructions,
        shoppingList: checkoutData.shopping_list,
        itemCount: checkoutData.item_count,
        sessionId: checkoutData.session_id,
      });
      
      setCheckoutDialogOpen(false);
    },
    onError: (error) => {
      console.error('Checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSnackbar({ open: true, message: `Failed to initiate checkout: ${errorMessage}`, type: 'error' });
    },
  });

  const handleEditItem = (item: ShoppingCartItem) => {
    setEditingItem(item);
    setEditQuantity(item.quantity);
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = () => {
    if (editingItem) {
      updateItemMutation.mutate({
        id: editingItem.id,
        quantity: editQuantity,
        notes: editNotes,
      });
    }
  };

  const handleCheckout = (storeId: string) => {
    console.log('Attempting checkout with store:', storeId);
    console.log('Cart items:', cartItems.length);
    
    // Close the dialog first
    setCheckoutDialogOpen(false);
    
    // Show loading state
    setSnackbar({
      open: true,
      message: 'Preparing your shopping list...',
      type: 'success'
    });
    
    checkoutMutation.mutate(storeId);
  };

  const handleCheckoutPane = (storeId: string, storeName: string) => {
    console.log('Opening checkout pane for store:', storeId);
    
    // Close the dialog first
    setCheckoutDialogOpen(false);
    
    // Set selected store and open the pane
    setSelectedStore(storeId);
    setSelectedStoreName(storeName);
    setCheckoutPaneOpen(true);
  };

  const formatCurrency = (amount?: number) => {
    return amount ? `$${amount.toFixed(2)}` : 'N/A';
  };

  if (cartLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (cartError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load cart: {String((cartError as any)?.message || 'Unknown error')}
        </Alert>
      </Box>
    );
  }

  const cartItems = cart?.data.items || [];
  const totalCost = cart?.data.total_estimated_cost || 0;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <CartIcon sx={{ mr: 2, fontSize: 32 }} />
        <Typography variant="h4">
          Shopping Cart ({cartItems.length} items)
        </Typography>
      </Box>

      {cartItems.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <GroceryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Your cart is empty
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add some ingredients to get started!
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Cart Items */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Cart Items</Typography>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<ClearIcon />}
                  onClick={() => clearCartMutation.mutate()}
                  disabled={clearCartMutation.isLoading}
                >
                  Clear Cart
                </Button>
              </Box>
              
              <List>
                {cartItems.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {item.ingredient?.name || 'Unknown Ingredient'}
                            </Typography>
                            {item.ingredient?.category && (
                              <Chip size="small" label={item.ingredient.category} />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              Quantity: {item.quantity} {item.unit}
                            </Typography>
                            {item.estimated_cost && (
                              <Typography variant="body2" color="primary">
                                Cost: {formatCurrency(item.estimated_cost * item.quantity)}
                              </Typography>
                            )}
                            {item.notes && (
                              <Typography variant="body2" color="text.secondary">
                                Notes: {item.notes}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleEditItem(item)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          onClick={() => removeItemMutation.mutate(item.id)}
                          disabled={removeItemMutation.isLoading}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < cartItems.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Cart Summary & Checkout */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Items:</Typography>
                <Typography>{cartItems.length}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography>Estimated Total:</Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(totalCost)}
                </Typography>
              </Box>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<StoreIcon />}
                onClick={() => setCheckoutDialogOpen(true)}
                disabled={cartItems.length === 0}
              >
                Checkout
              </Button>
            </Paper>

            {/* Quick Store Links */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Quick Checkout
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose your preferred grocery store:
              </Typography>
              
              {storesLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {storesData?.data.stores.map((store) => (
                    <Button
                      key={store.id}
                      variant="outlined"
                      onClick={() => handleCheckout(store.id)}
                      disabled={checkoutMutation.isLoading || cartItems.length === 0}
                      startIcon={<LaunchIcon />}
                      sx={{ justifyContent: 'flex-start' }}
                    >
                      {store.name}
                    </Button>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onClose={() => setEditingItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Item</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            {editingItem?.ingredient?.name}
          </Typography>
          <TextField
            fullWidth
            label="Quantity"
            type="number"
            value={editQuantity}
            onChange={(e) => setEditQuantity(Number(e.target.value))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Notes"
            multiline
            rows={3}
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Add any special notes or preferences..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingItem(null)}>Cancel</Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={updateItemMutation.isLoading}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Checkout Store Selection Dialog */}
      <Dialog open={checkoutDialogOpen} onClose={() => setCheckoutDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Choose Grocery Store</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>How this works:</strong> We'll open the grocery store's website with your ingredients pre-searched. 
              You'll need to manually add the items to your cart and complete checkout on their site.
            </Typography>
          </Alert>
          <Typography variant="body1" gutterBottom>
            Select where you'd like to purchase these items:
          </Typography>
          
          {storesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {storesData?.data.stores.map((store) => (
                <Grid item xs={12} sm={6} key={store.id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 4 },
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          <StoreIcon />
                        </Avatar>
                        <Typography variant="h6">{store.name}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {store.description}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<LaunchIcon />}
                        disabled={checkoutMutation.isLoading}
                        onClick={() => handleCheckoutPane(store.id, store.name)}
                        sx={{ mr: 1 }}
                      >
                        Shop In-App
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<LaunchIcon />}
                        disabled={checkoutMutation.isLoading}
                        onClick={() => handleCheckout(store.id)}
                      >
                        External Site
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckoutDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Checkout Summary Dialog */}
      <Dialog 
        open={checkoutSummary.open} 
        onClose={() => setCheckoutSummary({ ...checkoutSummary, open: false })} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <StoreIcon sx={{ mr: 2 }} />
            Checkout with {checkoutSummary.storeName}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Success!</strong> {checkoutSummary.instructions}
            </Typography>
          </Alert>

          {/* Shopping List */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Your Shopping List ({checkoutSummary.itemCount} items)
            </Typography>
            <List dense>
              {checkoutSummary.shoppingList.map((item, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={item.name}
                    secondary={`Quantity: ${item.quantity} ${item.unit}${item.notes ? ` • ${item.notes}` : ''}`}
                  />
                  {item.estimated_cost && (
                    <Chip 
                      label={formatCurrency(item.estimated_cost)} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                    />
                  )}
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Checkout Instructions */}
          <Paper sx={{ p: 2, bgcolor: 'info.main', color: 'info.contrastText' }}>
            <Typography variant="body2">
              <strong>What happens next:</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              1. We've opened {checkoutSummary.storeName} in a new tab<br/>
              2. Search for each item using the optimized search<br/>
              3. Add items to your cart manually<br/>
              4. Complete checkout on their website
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => window.open(checkoutSummary.checkoutUrl, '_blank')} variant="outlined">
            Open Store Again
          </Button>
          <Button 
            onClick={() => setCheckoutSummary({ ...checkoutSummary, open: false })} 
            variant="contained"
          >
            Got It
          </Button>
        </DialogActions>
      </Dialog>

      {/* Checkout Pane */}
      {checkoutPaneOpen && selectedStore && (
        <CheckoutPane
          open={checkoutPaneOpen}
          onClose={() => setCheckoutPaneOpen(false)}
          store={selectedStore}
          storeName={selectedStoreName}
        />
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.type} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ShoppingCartPage; 