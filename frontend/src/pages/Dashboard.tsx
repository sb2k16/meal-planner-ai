import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { 
  Plus, 
  Calendar, 
  ChefHat, 
  ShoppingCart, 
  List, 
  Settings, 
  Heart, 
  Clock, 
  Users, 
  Search, 
  Filter, 
  Star,
  TrendingUp,
  Activity,
  Target,
  DollarSign
} from 'lucide-react';
import { ingredientsApi, recipesApi, mealPlansApi, shoppingListsApi } from '../services/api';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data for statistics
  const { data: recipesData } = useQuery('recipes-dashboard', 
    () => recipesApi.getAll({ limit: 1 }), 
    { 
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  );

  const { data: ingredientsData } = useQuery('ingredients-dashboard', 
    () => ingredientsApi.getAll({ limit: 1 }), 
    { 
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000
    }
  );

  const { data: mealPlansData } = useQuery('meal-plans-dashboard', 
    () => mealPlansApi.getAll(), 
    { 
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000
    }
  );

  const { data: shoppingListsData } = useQuery('shopping-lists-dashboard', 
    () => shoppingListsApi.getAll(), 
    { 
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000
    }
  );

  // Quick action buttons
  const quickActions = [
    {
      title: 'Create Recipe',
      description: 'Add a new recipe to your collection',
      icon: ChefHat,
      color: 'from-emerald-500 to-teal-600',
      hoverColor: 'from-emerald-600 to-teal-700',
      action: () => navigate('/recipes/create'),
    },
    {
      title: 'Add Ingredient',
      description: 'Manage your ingredient database',
      icon: List,
      color: 'from-amber-500 to-orange-600',
      hoverColor: 'from-amber-600 to-orange-700',
      action: () => navigate('/ingredients'),
    },
    {
      title: 'Plan Meals',
      description: 'Create a new meal plan',
      icon: Calendar,
      color: 'from-blue-500 to-indigo-600',
      hoverColor: 'from-blue-600 to-indigo-700',
      action: () => navigate('/meal-plans/create'),
    },
    {
      title: 'Shopping List',
      description: 'View your shopping lists',
      icon: ShoppingCart,
      color: 'from-purple-500 to-violet-600',
      hoverColor: 'from-purple-600 to-violet-700',
      action: () => navigate('/shopping-lists'),
    },
  ];

  // Stats with real data
  const stats = [
    { 
      label: 'Total Recipes', 
      value: recipesData?.data.total?.toString() || '0', 
      change: '+12', 
      color: 'emerald',
      icon: ChefHat
    },
    { 
      label: 'Ingredients', 
      value: ingredientsData?.data.total?.toString() || '0', 
      change: '+8', 
      color: 'amber',
      icon: List
    },
    { 
      label: 'Active Meal Plans', 
      value: mealPlansData?.data?.length?.toString() || '0', 
      change: '+2', 
      color: 'blue',
      icon: Calendar
    },
    { 
      label: 'Shopping Lists', 
      value: shoppingListsData?.data?.length?.toString() || '0', 
      change: '+3', 
      color: 'purple',
      icon: ShoppingCart
    },
  ];

  // Recent activities (mock data - can be replaced with real activity log)
  const recentActivities = [
    { 
      action: 'Created new recipe', 
      item: 'Mediterranean Pasta', 
      time: '2 hours ago',
      icon: ChefHat,
      color: 'text-emerald-600'
    },
    { 
      action: 'Added ingredient', 
      item: 'Organic Quinoa', 
      time: '4 hours ago',
      icon: List,
      color: 'text-amber-600'
    },
    { 
      action: 'Generated meal plan', 
      item: 'Week 1 Healthy Eating', 
      time: '1 day ago',
      icon: Calendar,
      color: 'text-blue-600'
    },
    { 
      action: 'Updated shopping list', 
      item: 'Weekly Groceries', 
      time: '2 days ago',
      icon: ShoppingCart,
      color: 'text-purple-600'
    }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/recipes?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-4 w-96 h-96 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
              Dashboard
            </h1>
            <p className="text-slate-600 text-lg">
              Welcome back! Let's plan some delicious meals.
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search recipes, ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 w-80 bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 placeholder-slate-400"
              />
            </form>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="group bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50 hover:shadow-xl hover:bg-white/80 transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${
                    stat.color === 'emerald' ? 'from-emerald-500/20 to-teal-500/20' :
                    stat.color === 'amber' ? 'from-amber-500/20 to-orange-500/20' :
                    stat.color === 'blue' ? 'from-blue-500/20 to-indigo-500/20' :
                    'from-purple-500/20 to-violet-500/20'
                  }`}>
                    <IconComponent className={`w-6 h-6 ${
                      stat.color === 'emerald' ? 'text-emerald-600' :
                      stat.color === 'amber' ? 'text-amber-600' :
                      stat.color === 'blue' ? 'text-blue-600' :
                      'text-purple-600'
                    }`} />
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                    stat.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                    stat.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {stat.change}
                  </div>
                </div>
                <div>
                  <p className="text-slate-600 text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50">
              <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickActions.map((action, index) => {
                  const IconComponent = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={action.action}
                      className={`group p-6 bg-gradient-to-r ${action.color} rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-left ${action.hoverColor}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors duration-300">
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{action.title}</h3>
                          <p className="text-white/80 text-sm">{action.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Getting Started Section */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-green-600" />
                Getting Started
              </h2>
              <p className="text-slate-600 mb-4">
                Welcome to your meal planning application! Here's how to get started:
              </p>
              <div className="space-y-3">
                {[
                  "Start by adding ingredients to build your database",
                  "Create recipes using your ingredients",
                  "Generate meal plans based on your preferences", 
                  "Create shopping lists from your meal plans"
                ].map((step, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{index + 1}</span>
                    </div>
                    <p className="text-slate-700">{step}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/ingredients')}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
              >
                Start with Ingredients
              </button>
            </div>
          </div>

          {/* Recent Activity Sidebar */}
          <div className="space-y-6">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50">
              <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-indigo-600" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => {
                  const IconComponent = activity.icon;
                  return (
                    <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50/50 transition-colors duration-200">
                      <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                        <IconComponent className={`w-4 h-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 font-medium text-sm">{activity.action}</p>
                        <p className="text-slate-600 text-sm truncate">{activity.item}</p>
                        <p className="text-slate-500 text-xs mt-1">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/50">
              <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-gray-600" />
                Quick Links
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'View All Recipes', path: '/recipes', icon: ChefHat },
                  { label: 'Manage Ingredients', path: '/ingredients', icon: List },
                  { label: 'Meal Plans', path: '/meal-plans', icon: Calendar },
                  { label: 'Shopping Lists', path: '/shopping-lists', icon: ShoppingCart }
                ].map((link, index) => {
                  const IconComponent = link.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => navigate(link.path)}
                      className="w-full flex items-center space-x-3 p-3 text-left text-slate-700 hover:text-slate-900 hover:bg-slate-50/50 rounded-lg transition-colors duration-200"
                    >
                      <IconComponent className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium">{link.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 