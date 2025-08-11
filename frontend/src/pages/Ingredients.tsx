import React, { useState } from 'react';
import { 
  Search, 
  Download, 
  Flame, 
  Tag, 
  Filter, 
  ShoppingCart, 
  TrendingUp, 
  Zap, 
  AlertCircle,
  Check,
  X,
  Sparkles,
  ChefHat
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { ingredientsApi, cartApi } from '../services/api';
import { USDAFood } from '../types';

interface TabPanelProps {
  children?: any;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div className={`transition-all duration-300 ${value !== index ? 'hidden' : 'animate-fade-in'}`}>
    {value === index && children}
  </div>
);

const ModernIngredientsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [calorieRange, setCalorieRange] = useState<[number, number]>([0, 1000]);
  const [showFilters, setShowFilters] = useState(false);
  const [usdaSearchTerm, setUsdaSearchTerm] = useState('');
  const [selectedUSDAFood, setSelectedUSDAFood] = useState<USDAFood | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

  const queryClient = useQueryClient();

  // Fetch ingredients with filters
  const { data: ingredientsData, isLoading: ingredientsLoading } = useQuery({
    queryKey: ['ingredients', searchTerm, category, calorieRange],
    queryFn: () => ingredientsApi.searchWithCalories({
      search: searchTerm || undefined,
      category: category || undefined,
      minCalories: calorieRange[0],
      maxCalories: calorieRange[1],
      limit: 50
    }),
    enabled: activeTab === 0
  });

  // Fetch calorie ranges
  const { data: calorieRangesData, isLoading: calorieRangesLoading } = useQuery({
    queryKey: ['ingredients-calorie-ranges'],
    queryFn: () => ingredientsApi.getByCalorieRanges(),
    enabled: activeTab === 1
  });

  // Fetch nutrition summary
  const { data: nutritionSummaryData } = useQuery({
    queryKey: ['ingredients-nutrition-summary'],
    queryFn: () => ingredientsApi.getNutritionSummary()
  });

  // USDA search
  const { data: usdaSearchData, isLoading: usdaSearchLoading, refetch: searchUSDA } = useQuery({
    queryKey: ['usda-search', usdaSearchTerm],
    queryFn: () => ingredientsApi.searchUSDA(usdaSearchTerm, 20),
    enabled: false
  });

  // Import USDA ingredient mutation
  const importUSDAMutation = useMutation({
    mutationFn: (fdcId: number) => ingredientsApi.importFromUSDA(fdcId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      setImportDialogOpen(false);
      showNotification('Ingredient imported successfully!', 'success');
    },
    onError: () => {
      showNotification('Failed to import ingredient', 'error');
    }
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: (params: { ingredientId: string; quantity: number; unit: string }) => 
      cartApi.addItem({
        ingredient_id: params.ingredientId,
        quantity: params.quantity,
        unit: params.unit,
        notes: ''
      }),
    onSuccess: () => {
      showNotification('Added to cart successfully!', 'success');
    },
    onError: () => {
      showNotification('Failed to add to cart', 'error');
    }
  });

  const nutritionSummary = nutritionSummaryData?.data || {
    total_ingredients: 0,
    ingredients_with_calories: 0,
    avg_calories: 0,
    min_calories: 0,
    max_calories: 0
  };

  const getCalorieColor = (calories?: number) => {
    if (!calories) return 'from-gray-400 to-gray-500';
    if (calories <= 100) return 'from-emerald-400 to-teal-500';
    if (calories <= 300) return 'from-amber-400 to-orange-500';
    return 'from-rose-400 to-red-500';
  };

  const getCalorieTextColor = (calories?: number) => {
    if (!calories) return 'text-gray-600';
    if (calories <= 100) return 'text-emerald-600';
    if (calories <= 300) return 'text-amber-600';
    return 'text-rose-600';
  };

  const formatCalories = (calories?: number) => calories ? `${Math.round(calories)} cal/100g` : 'N/A';

  const categories = ['Protein', 'Vegetable', 'Fruit', 'Grain', 'Dairy', 'Oil', 'Seasoning', 'Other'];

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type }), 3000);
  };

  const handleAddToCart = (ingredientId: string, ingredientName: string) => {
    addToCartMutation.mutate({
      ingredientId,
      quantity: 100,
      unit: 'gram'
    });
  };

  const handleImport = (food: USDAFood) => {
    setSelectedUSDAFood(food);
    setImportDialogOpen(true);
  };

  const confirmImport = () => {
    if (selectedUSDAFood) {
      importUSDAMutation.mutate(selectedUSDAFood.fdcId);
    }
  };

  const handleUsdaSearch = () => {
    if (usdaSearchTerm.trim()) {
      searchUSDA();
    }
  };

  const ingredients = ingredientsData?.data?.ingredients || [];
  const calorieRanges = calorieRangesData?.data || { low: [], medium: [], high: [] };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg">
            <ChefHat className="w-8 h-8 text-indigo-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Ingredients Hub
            </h1>
            <Sparkles className="w-6 h-6 text-purple-500 animate-pulse" />
          </div>
          <p className="text-slate-600 text-lg">Discover, analyze, and manage your culinary ingredients</p>
        </div>

        {/* Nutrition Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Ingredients', value: nutritionSummary.total_ingredients, icon: Tag, color: 'from-blue-500 to-cyan-500' },
            { label: 'With Nutrition Data', value: nutritionSummary.ingredients_with_calories, icon: Zap, color: 'from-emerald-500 to-teal-500' },
            { label: 'Average Calories', value: Math.round(nutritionSummary.avg_calories), icon: TrendingUp, color: 'from-amber-500 to-orange-500' },
            { label: 'Calorie Range', value: `${nutritionSummary.min_calories}-${nutritionSummary.max_calories}`, icon: Flame, color: 'from-rose-500 to-pink-500' }
          ].map((stat, idx) => (
            <div 
              key={idx} 
              className="group relative bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-white/20"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}></div>
              <div className="relative z-10">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${stat.color} mb-3`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-slate-600 text-sm font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Modern Tab Navigation */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-2 mb-8 shadow-lg border border-white/20">
          <div className="flex gap-2">
            {['Browse Ingredients', 'Calorie Categories', 'USDA Discovery'].map((tab, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === idx
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-white/50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Browse Ingredients Tab */}
        <TabPanel value={activeTab} index={0}>
          {/* Search and Filters */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-lg border border-white/20">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search ingredients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/70 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-4 py-3 bg-white/70 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                  showFilters 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' 
                    : 'bg-white/70 text-slate-600 hover:bg-white border border-white/30'
                }`}
              >
                <Filter className="w-5 h-5" />
                Filters
              </button>
            </div>

            {showFilters && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200/50 animate-fade-in">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Calories per 100g</label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={calorieRange[1]}
                  onChange={(e) => setCalorieRange([0, parseInt(e.target.value)])}
                  className="w-full h-2 bg-gradient-to-r from-emerald-200 to-rose-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-slate-600 mt-1">
                  <span>0</span>
                  <span className="font-semibold">{calorieRange[1]} cal</span>
                  <span>1000</span>
                </div>
              </div>
            )}
          </div>

          {/* Ingredients Grid */}
          {ingredientsLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ingredients.map((ingredient, idx) => (
                <div 
                  key={ingredient.id}
                  className="group bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-white/20"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors duration-200">
                      {ingredient.name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getCalorieColor(ingredient.calories_per_100g)} text-white`}>
                      {ingredient.category}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className={`w-5 h-5 ${getCalorieTextColor(ingredient.calories_per_100g)}`} />
                    <span className={`font-bold ${getCalorieTextColor(ingredient.calories_per_100g)}`}>
                      {formatCalories(ingredient.calories_per_100g)}
                    </span>
                  </div>

                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                    {ingredient.description || 'No description available'}
                  </p>

                  <button
                    onClick={() => handleAddToCart(ingredient.id, ingredient.name)}
                    disabled={addToCartMutation.isLoading}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabPanel>

        {/* Calorie Categories Tab */}
        <TabPanel value={activeTab} index={1}>
          {calorieRangesLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {[
                { title: 'Low Calorie', subtitle: '0-100 cal', data: calorieRanges.low, color: 'from-emerald-400 to-teal-500', bgColor: 'from-emerald-50 to-teal-50', borderColor: 'border-emerald-200' },
                { title: 'Medium Calorie', subtitle: '100-300 cal', data: calorieRanges.medium, color: 'from-amber-400 to-orange-500', bgColor: 'from-amber-50 to-orange-50', borderColor: 'border-amber-200' },
                { title: 'High Calorie', subtitle: '300+ cal', data: calorieRanges.high, color: 'from-rose-400 to-red-500', bgColor: 'from-rose-50 to-red-50', borderColor: 'border-rose-200' }
              ].map((category, idx) => (
                <div key={idx} className={`bg-gradient-to-br ${category.bgColor} rounded-2xl p-6 border ${category.borderColor} shadow-lg`}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{category.title}</h3>
                      <p className="text-slate-600">{category.subtitle}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${category.color} flex items-center justify-center`}>
                      <span className="text-white font-bold text-lg">{category.data.length}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {category.data.slice(0, 5).map((ingredient) => (
                      <div key={ingredient.id} className="flex items-center justify-between bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-white/30">
                        <div>
                          <p className="font-semibold text-slate-800">{ingredient.name}</p>
                          <p className="text-sm text-slate-600">{formatCalories(ingredient.calories_per_100g)}</p>
                        </div>
                        <button
                          onClick={() => handleAddToCart(ingredient.id, ingredient.name)}
                          className={`p-2 rounded-lg bg-gradient-to-r ${category.color} text-white hover:shadow-lg transition-all duration-200 transform hover:scale-110`}
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabPanel>

        {/* USDA Discovery Tab */}
        <TabPanel value={activeTab} index={2}>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-lg border border-white/20">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search USDA database..."
                  value={usdaSearchTerm}
                  onChange={(e) => setUsdaSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/70 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  onKeyPress={(e) => e.key === 'Enter' && handleUsdaSearch()}
                />
              </div>
              <button 
                onClick={handleUsdaSearch}
                disabled={usdaSearchLoading || !usdaSearchTerm.trim()}
                className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50"
              >
                {usdaSearchLoading ? 'Searching...' : 'Search USDA'}
              </button>
            </div>
          </div>

          {usdaSearchLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(usdaSearchData?.data?.foods || []).map((food, idx) => (
                <div 
                  key={food.fdcId}
                  className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-white/20"
                >
                  <h3 className="font-bold text-slate-800 text-lg mb-3">{food.description}</h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Flame className={`w-4 h-4 ${getCalorieTextColor(food.foodNutrients?.find(n => n.nutrientName === 'Energy')?.value)}`} />
                      <span className="text-sm text-slate-600">
                        {food.foodNutrients?.find(n => n.nutrientName === 'Energy')?.value || 0} cal/100g
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-slate-600">
                        {food.foodNutrients?.find(n => n.nutrientName === 'Protein')?.value || 0}g protein
                      </span>
                    </div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getCalorieColor(food.foodNutrients?.find(n => n.nutrientName === 'Energy')?.value)} text-white`}>
                      USDA Food
                    </span>
                  </div>

                  <button
                    onClick={() => handleImport(food)}
                    disabled={importUSDAMutation.isLoading}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    <Download className="w-5 h-5" />
                    Import
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabPanel>

        {/* Import Dialog */}
        {importDialogOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full shadow-2xl border border-white/20">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Import from USDA</h3>
              <p className="text-slate-600 mb-2">Are you sure you want to import:</p>
              <p className="font-semibold text-slate-800 mb-6">{selectedUSDAFood?.description}</p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setImportDialogOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmImport}
                  disabled={importUSDAMutation.isLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-5 h-5" />
                  {importUSDAMutation.isLoading ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modern Notification */}
        {notification.show && (
          <div className="fixed top-6 right-6 z-50 animate-slide-in">
            <div className={`bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-xl border-l-4 ${
              notification.type === 'success' ? 'border-emerald-500' : 'border-rose-500'
            } flex items-center gap-3`}>
              {notification.type === 'success' ? (
                <Check className="w-6 h-6 text-emerald-500" />
              ) : (
                <AlertCircle className="w-6 h-6 text-rose-500" />
              )}
              <span className="text-slate-800 font-medium">{notification.message}</span>
              <button
                onClick={() => setNotification({ show: false, message: '', type: 'success' })}
                className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default ModernIngredientsPage; 