import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  Rating,
  IconButton,
  Grid,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  Badge
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  ShoppingCart as ShoppingCartIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  ShoppingBag as ShoppingBagIcon
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { cartApi } from '../services/api';
import { CheckoutPaneData, StoreProduct, CartItemProducts } from '../types';

interface CheckoutPaneProps {
  open: boolean;
  onClose: () => void;
  store: string;
  storeName: string;
}

interface AddedProduct {
  productId: string;
  cartItemId: string;
  addedAt: Date;
}

const CheckoutPane: React.FC<CheckoutPaneProps> = ({ open, onClose, store, storeName }) => {
  const [addedProducts, setAddedProducts] = useState<AddedProduct[]>([]);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [checkoutDialog, setCheckoutDialog] = useState<{
    open: boolean;
    items: (StoreProduct & { cartItemId: string; addedAt: string })[];
    totalCost: number;
  }>({ open: false, items: [], totalCost: 0 });
  const [noItemsDialog, setNoItemsDialog] = useState(false);
  const [demoWarningDialog, setDemoWarningDialog] = useState(false);

  // Load previously added products from localStorage on component mount
  useEffect(() => {
    if (open) {
      const storedItems: (StoreProduct & { cartItemId: string; addedAt: string })[] = JSON.parse(localStorage.getItem(`${store}_cart_items`) || '[]');
      const addedProductsFromStorage = storedItems.map((item: StoreProduct & { cartItemId: string; addedAt: string }) => ({
        productId: item.id,
        cartItemId: item.cartItemId,
        addedAt: new Date(item.addedAt)
      }));
      setAddedProducts(addedProductsFromStorage);
    }
  }, [open, store]);

  // Fetch checkout pane data
  const { data: checkoutData, isLoading, error } = useQuery<CheckoutPaneData, Error>(
    ['checkout-pane', store],
    () => cartApi.checkoutPane(store).then(res => res.data),
    {
      enabled: open && !!store,
      refetchOnWindowFocus: false,
    }
  );

  // Auto-expand first item by default
  useEffect(() => {
    if (checkoutData?.items && checkoutData.items.length > 0 && expandedItems.length === 0) {
      setExpandedItems([checkoutData.items[0].cart_item_id]);
    }
  }, [checkoutData, expandedItems.length]);

  const handleAddToCart = (product: StoreProduct, cartItemId: string) => {
    // In a real implementation, this would make an API call to add the product to the external store's cart
    console.log(`Adding product ${product.id} to ${storeName} cart`);
    
    // For demo purposes, simulate adding to cart with localStorage
    // In production, this would call Amazon Fresh API or equivalent
    setAddedProducts(prev => [...prev, {
      productId: product.id,
      cartItemId: cartItemId,
      addedAt: new Date()
    }]);

    // Store added products in localStorage for checkout simulation
    const addedItems = JSON.parse(localStorage.getItem(`${store}_cart_items`) || '[]');
    addedItems.push({
      ...product,
      cartItemId,
      addedAt: new Date().toISOString()
    });
    localStorage.setItem(`${store}_cart_items`, JSON.stringify(addedItems));
    
    console.log(`✅ Product ${product.name} added to ${storeName} cart simulation`);
  };

  const isProductAdded = (productId: string) => {
    return addedProducts.some(p => p.productId === productId);
  };

  const handleToggleExpand = (cartItemId: string) => {
    setExpandedItems(prev => 
      prev.includes(cartItemId) 
        ? prev.filter(id => id !== cartItemId)
        : [...prev, cartItemId]
    );
  };

  const handleConfirmCheckout = () => {
    // Show the demo warning dialog first
    setDemoWarningDialog(true);
  };

  const handleActualCheckout = () => {
    // Clear the demo cart after "checkout"
    localStorage.removeItem(`${store}_cart_items`);
    setAddedProducts([]); // Clear visual state
    setCheckoutDialog({ open: false, items: [], totalCost: 0 });
    setDemoWarningDialog(false);
    
    // Open the actual store website
    const storeUrls = {
      'amazon_fresh': 'https://www.amazon.com/cart',
      'walmart_grocery': 'https://www.walmart.com/cart',
      'instacart': 'https://www.instacart.com/store/cart',
      'kroger': 'https://www.kroger.com/cart'
    };
    
    window.open(storeUrls[store as keyof typeof storeUrls] || 'https://www.amazon.com/cart', '_blank');
  };

  const ProductCard: React.FC<{ product: StoreProduct; cartItemId: string }> = ({ product, cartItemId }) => {
    const isAdded = isProductAdded(product.id);

    return (
      <Card 
        sx={{ 
          mb: 2, 
          position: 'relative',
          border: isAdded ? '2px solid #4caf50' : '1px solid #e0e0e0',
          transition: 'all 0.3s ease'
        }}
      >
        {isAdded && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              backgroundColor: '#4caf50',
              borderRadius: '50%',
              p: 0.5
            }}
          >
            <CheckCircleIcon sx={{ color: 'white', fontSize: 20 }} />
          </Box>
        )}
        
        <Grid container>
          <Grid item xs={3}>
            <CardMedia
              component="img"
              sx={{ 
                height: 120, 
                objectFit: 'cover',
                backgroundColor: '#f5f5f5'
              }}
              image={product.image_url}
              alt={product.name}
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                e.currentTarget.src = `https://via.placeholder.com/120x120/f5f5f5/999999?text=${product.name.substring(0, 2)}`;
              }}
            />
          </Grid>
          
          <Grid item xs={9}>
            <CardContent sx={{ pl: 2, pr: 2, py: 1.5 }}>
              <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 0.5 }}>
                {product.name}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {product.brand} • {product.size}
              </Typography>
              
              {product.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {product.description}
                </Typography>
              )}
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mr: 2 }}>
                  ${product.price.toFixed(2)}
                </Typography>
                
                {product.rating && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                    <Rating value={product.rating} precision={0.1} size="small" readOnly />
                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                      ({product.review_count})
                    </Typography>
                  </Box>
                )}
                
                <Chip 
                  size="small" 
                  label={product.in_stock ? 'In Stock' : 'Out of Stock'}
                  color={product.in_stock ? 'success' : 'error'}
                  variant="outlined"
                />
              </Box>
              
              <Button
                variant={isAdded ? "outlined" : "contained"}
                color={isAdded ? "success" : "primary"}
                startIcon={isAdded ? <CheckCircleIcon /> : <ShoppingCartIcon />}
                onClick={() => handleAddToCart(product, cartItemId)}
                disabled={!product.in_stock || isAdded}
                sx={{ mt: 1 }}
              >
                {isAdded ? 'Added to Cart' : `Add to ${storeName} Cart`}
              </Button>
            </CardContent>
          </Grid>
        </Grid>
      </Card>
    );
  };

  const CartItemSection: React.FC<{ item: CartItemProducts }> = ({ item }) => {
    const isExpanded = expandedItems.includes(item.cart_item_id);
    const addedCount = addedProducts.filter(p => p.cartItemId === item.cart_item_id).length;

    return (
      <Accordion 
        expanded={isExpanded} 
        onChange={() => handleToggleExpand(item.cart_item_id)}
        sx={{ mb: 2, '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>
              {item.ingredient_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
              Need: {item.requested_qty} {item.requested_unit}
            </Typography>
            {addedCount > 0 && (
              <Badge badgeContent={addedCount} color="success">
                <ShoppingBagIcon color="action" />
              </Badge>
            )}
          </Box>
        </AccordionSummary>
        
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Search results for "{item.search_query}":
          </Typography>
          
          {item.products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              cartItemId={item.cart_item_id}
            />
          ))}
          
          {item.products.length === 0 && (
            <Alert severity="info">
              No products found for this ingredient. Try searching manually on {storeName}.
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ShoppingCartIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Shop at {storeName}</Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load products. Please try again.
          </Alert>
        )}

        {checkoutData && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              {checkoutData.instructions}
            </Alert>
            
            <Alert severity="warning" sx={{ mb: 3 }}>
              <strong>🚧 DEMO MODE:</strong> This is a mock shopping experience. Products shown are simulated and will not actually be added to your real {storeName} account. In production, this would integrate with {storeName}'s API.
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Shopping List ({checkoutData.item_count} items)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Estimated total: ${checkoutData.estimated_total.toFixed(2)}
              </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {checkoutData.items.map((item) => (
              <CartItemSection key={item.cart_item_id} item={item} />
            ))}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Continue Shopping Later
        </Button>
        <Button 
          variant="contained" 
          color="primary"
          startIcon={<ShoppingCartIcon />}
                      onClick={() => {
              // Get the items that were added to cart
              const addedItems: (StoreProduct & { cartItemId: string; addedAt: string })[] = JSON.parse(localStorage.getItem(`${store}_cart_items`) || '[]');
              
              if (addedItems.length > 0) {
                const totalCost = addedItems.reduce((sum: number, item: StoreProduct) => sum + item.price, 0);
                setCheckoutDialog({ open: true, items: addedItems, totalCost });
              } else {
                setNoItemsDialog(true);
              }
            }}
        >
          Demo Checkout ({storeName})
        </Button>
      </DialogActions>

      {/* Checkout Confirmation Dialog */}
      <Dialog
        open={checkoutDialog.open}
        onClose={() => setCheckoutDialog({ open: false, items: [], totalCost: 0 })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ShoppingCartIcon sx={{ mr: 1 }} />
            Items Added to {storeName} Cart
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            The following items have been added to your {storeName} cart:
          </Typography>
          
          {checkoutDialog.items.map((item, index) => (
            <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2">
                • {item.name} - <strong>${item.price.toFixed(2)}</strong>
              </Typography>
            </Box>
          ))}
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" sx={{ mb: 2 }}>
            Total: ${checkoutDialog.totalCost.toFixed(2)}
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            🚧 <strong>DEMO MODE:</strong> This is a simulation! In a real implementation, these items would be automatically added to your {storeName} cart via API integration. Currently, Amazon's cart will appear empty because this is a mock demo.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCheckoutDialog({ open: false, items: [], totalCost: 0 })}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmCheckout}
            variant="contained"
            color="primary"
          >
            Demo: Visit {storeName} Website
          </Button>
        </DialogActions>
      </Dialog>

      {/* No Items Dialog */}
      <Dialog
        open={noItemsDialog}
        onClose={() => setNoItemsDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>No Items Added</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            No items have been added to your cart yet. Please add some products first!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setNoItemsDialog(false)}
            variant="contained"
            color="primary"
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Demo Warning Dialog */}
      <Dialog
        open={demoWarningDialog}
        onClose={() => setDemoWarningDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
              🚧 DEMO MODE WARNING
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            You simulated adding <strong>{checkoutDialog.items.length} items</strong> (Total: <strong>${checkoutDialog.totalCost.toFixed(2)}</strong>) to your {storeName} cart.
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>IMPORTANT:</strong> The {storeName} website will show an <strong>EMPTY cart</strong> because this is a demo simulation.
          </Alert>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            In a real implementation:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <li>Items would be added via {storeName} API integration</li>
            <li>You'd be redirected with a pre-populated cart</li>
            <li>OAuth authentication would handle the user session</li>
            <li>Real products would be added to your actual account</li>
          </Box>
          
          <Typography variant="body2">
            Would you like to visit {storeName} anyway? (Remember: the cart will be empty)
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDemoWarningDialog(false)}
            variant="outlined"
          >
            Stay Here
          </Button>
          <Button 
            onClick={handleActualCheckout}
            variant="contained"
            color="primary"
          >
            Visit {storeName} Anyway
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default CheckoutPane; 