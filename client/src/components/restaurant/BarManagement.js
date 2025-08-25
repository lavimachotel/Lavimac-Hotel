import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import supabase from '../../supabaseClient';
import { FaCocktail, FaWineGlassAlt, FaBeer, FaSearch, FaPlus } from 'react-icons/fa';
import toast from 'react-hot-toast';

const BarManagement = () => {
  const { theme } = useTheme();
  const [drinks, setDrinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Fetch drinks from the database (using menu items with beverage categories)
  const fetchDrinks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_menu_items')
        .select('*, restaurant_categories(name)')
        .in('category_id', ['beverage-category-id', 'cocktails-category-id', 'wine-category-id', 'beer-category-id'])
        .order('name');
      
      if (error) throw error;
      
      // For demonstration purposes, let's create some sample drinks if none exist
      if (!data || data.length === 0) {
        setDrinks(getSampleDrinks());
      } else {
        setDrinks(data);
      }
    } catch (error) {
      console.error('Error fetching drinks:', error);
      setError(error.message);
      toast.error('Failed to load drinks');
      
      // For demonstration, show sample drinks on error
      setDrinks(getSampleDrinks());
    } finally {
      setLoading(false);
    }
  };

  // Initialize data
  useEffect(() => {
    fetchDrinks();
  }, []);

  // Filter drinks based on search and category
  const filteredDrinks = drinks.filter(drink => {
    const matchesSearch = drink.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (drink.description && drink.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter ? 
      (drink.category === categoryFilter || 
       (drink.restaurant_categories && drink.restaurant_categories.name === categoryFilter)) : true;
    
    return matchesSearch && matchesCategory;
  });

  // Get icon based on drink category
  const getDrinkIcon = (category) => {
    if (category === 'Wine' || (category.restaurant_categories && category.restaurant_categories.name === 'Wine')) {
      return <FaWineGlassAlt className="text-xl" />;
    } else if (category === 'Beer' || (category.restaurant_categories && category.restaurant_categories.name === 'Beer')) {
      return <FaBeer className="text-xl" />;
    } else {
      return <FaCocktail className="text-xl" />;
    }
  };

  // Sample drinks for demonstration
  const getSampleDrinks = () => {
    return [
      {
        id: '1',
        name: 'Classic Mojito',
        description: 'Rum, mint, lime, sugar, and soda water',
        price: 12.99,
        category: 'Cocktails',
        image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87',
        is_available: true,
        preparation_time: 5,
        ingredients: 'White rum, fresh mint, lime juice, sugar syrup, soda water'
      },
      {
        id: '2',
        name: 'Cabernet Sauvignon',
        description: 'Full-bodied red wine with rich flavors',
        price: 9.99,
        category: 'Wine',
        image_url: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d',
        is_available: true,
        preparation_time: 2,
        ingredients: 'Cabernet Sauvignon grapes'
      },
      {
        id: '3',
        name: 'Craft IPA',
        description: 'Hoppy India Pale Ale with citrus notes',
        price: 7.99,
        category: 'Beer',
        image_url: 'https://images.unsplash.com/photo-1566633806327-68e152aaf26d',
        is_available: true,
        preparation_time: 2,
        ingredients: 'Water, malted barley, hops, yeast'
      },
      {
        id: '4',
        name: 'Espresso Martini',
        description: 'Vodka, coffee liqueur, and fresh espresso',
        price: 13.99,
        category: 'Cocktails',
        image_url: 'https://images.unsplash.com/photo-1545438102-799c3991ffb2',
        is_available: true,
        preparation_time: 4,
        ingredients: 'Vodka, coffee liqueur, espresso, simple syrup'
      },
      {
        id: '5',
        name: 'Chardonnay',
        description: 'Medium-bodied white wine with apple and pear notes',
        price: 8.99,
        category: 'Wine',
        image_url: 'https://images.unsplash.com/photo-1508253730651-e5ace80a7025',
        is_available: true,
        preparation_time: 2,
        ingredients: 'Chardonnay grapes'
      },
      {
        id: '6',
        name: 'Stout',
        description: 'Dark, rich beer with coffee and chocolate notes',
        price: 6.99,
        category: 'Beer',
        image_url: 'https://images.unsplash.com/photo-1567696911980-2c295b5df157',
        is_available: true,
        preparation_time: 2,
        ingredients: 'Water, malted barley, roasted barley, hops, yeast'
      }
    ];
  };

  return (
    <div className="bar-management">
      {/* Search and filter controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className={`flex-1 min-w-[300px] relative ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
          <FaSearch 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
          />
          <input
            type="text"
            placeholder="Search drinks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
            } border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
          />
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`w-full px-4 py-2 rounded-lg appearance-none ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-800'
            } border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
          >
            <option value="">All Categories</option>
            <option value="Cocktails">Cocktails</option>
            <option value="Wine">Wine</option>
            <option value="Beer">Beer</option>
            <option value="Non-Alcoholic">Non-Alcoholic</option>
          </select>
        </div>
        
        <button
          className={`px-4 py-2 rounded-lg flex items-center ${
            theme === 'dark' 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          <FaPlus className="mr-2" />
          Add Drink
        </button>
      </div>
      
      {/* Drinks grid */}
      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : error && drinks.length === 0 ? (
        <div className={`p-6 text-center ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
          <p>Error loading drinks. Please try again later.</p>
        </div>
      ) : filteredDrinks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDrinks.map(drink => (
            <DrinkCard key={drink.id} drink={drink} theme={theme} />
          ))}
        </div>
      ) : (
        <div className={`p-12 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          <FaSearch className="mx-auto text-4xl mb-4" />
          <p className="text-xl font-medium mb-2">No drinks found</p>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      )}
    </div>
  );
};

// Drink Card Component
const DrinkCard = ({ drink, theme }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl shadow-sm overflow-hidden ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}
    >
      {drink.image_url && (
        <div className="h-48 overflow-hidden">
          <img 
            src={drink.image_url} 
            alt={drink.name} 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center">
            {drink.category === 'Cocktails' ? (
              <FaCocktail className={`mr-2 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
            ) : drink.category === 'Wine' ? (
              <FaWineGlassAlt className={`mr-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
            ) : (
              <FaBeer className={`mr-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
            )}
            <h3 className="text-lg font-bold">{drink.name}</h3>
          </div>
          <span className={`font-medium ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
            ${drink.price.toFixed(2)}
          </span>
        </div>
        
        {drink.description && (
          <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {drink.description}
          </p>
        )}
        
        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`px-2 py-1 text-xs rounded-full ${
            drink.category === 'Cocktails'
              ? theme === 'dark' ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-800'
              : drink.category === 'Wine'
              ? theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'
              : theme === 'dark' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {drink.category}
          </span>
          
          {drink.is_available && (
            <span className={`px-2 py-1 text-xs rounded-full ${
              theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
            }`}>
              Available
            </span>
          )}
        </div>
        
        <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            {drink.preparation_time ? `${drink.preparation_time} mins prep` : 'Prep time varies'}
          </span>
          
          <div className="flex space-x-2">
            <button 
              className={`p-2 rounded-full ${
                theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              title="Edit"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            <button 
              className={`p-2 rounded-full ${
                theme === 'dark' ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'
              }`}
              title="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BarManagement;
