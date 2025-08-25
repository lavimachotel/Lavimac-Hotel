import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import toast from 'react-hot-toast';

const RestaurantContext = createContext();

export const useRestaurant = () => useContext(RestaurantContext);

export const RestaurantProvider = ({ children }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch menu categories
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching restaurant categories:', error);
      setError(error.message);
    }
  };

  // Add a new category
  const addCategory = async (category) => {
    try {
      const { data, error } = await supabase
        .from('restaurant_categories')
        .insert([category])
        .select();
      
      if (error) throw error;
      
      setCategories(prev => [...prev, data[0]]);
      toast.success('Category added successfully!');
      return data[0];
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error(`Failed to add category: ${error.message}`);
      throw error;
    }
  };

  // Update an existing category
  const updateCategory = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('restaurant_categories')
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      setCategories(prev => 
        prev.map(category => category.id === id ? data[0] : category)
      );
      toast.success('Category updated successfully!');
      return data[0];
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(`Failed to update category: ${error.message}`);
      throw error;
    }
  };

  // Delete a category
  const deleteCategory = async (id) => {
    try {
      // Check if category is in use by any menu items
      const { data: menuItemsWithCategory, error: checkError } = await supabase
        .from('restaurant_menu_items')
        .select('id')
        .eq('category_id', id);
      
      if (checkError) throw checkError;
      
      if (menuItemsWithCategory && menuItemsWithCategory.length > 0) {
        throw new Error('This category is in use by one or more menu items and cannot be deleted.');
      }
      
      // Delete the category if not in use
      const { error } = await supabase
        .from('restaurant_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setCategories(prev => prev.filter(category => category.id !== id));
      toast.success('Category deleted successfully!');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(`Failed to delete category: ${error.message}`);
      throw error;
    }
  };

  // Fetch menu items
  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_menu_items')
        .select('*, restaurant_categories(name)')
        .order('name');
      
      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add a new menu item
  const addMenuItem = async (menuItem) => {
    try {
      const { data, error } = await supabase
        .from('restaurant_menu_items')
        .insert([menuItem])
        .select();
      
      if (error) throw error;
      
      setMenuItems(prev => [...prev, data[0]]);
      toast.success('Menu item added successfully!');
      return data[0];
    } catch (error) {
      console.error('Error adding menu item:', error);
      toast.error(`Failed to add menu item: ${error.message}`);
      throw error;
    }
  };

  // Update an existing menu item
  const updateMenuItem = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('restaurant_menu_items')
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      setMenuItems(prev => 
        prev.map(item => item.id === id ? data[0] : item)
      );
      toast.success('Menu item updated successfully!');
      return data[0];
    } catch (error) {
      console.error('Error updating menu item:', error);
      toast.error(`Failed to update menu item: ${error.message}`);
      throw error;
    }
  };

  // Delete a menu item
  const deleteMenuItem = async (id) => {
    try {
      const { error } = await supabase
        .from('restaurant_menu_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setMenuItems(prev => prev.filter(item => item.id !== id));
      toast.success('Menu item deleted successfully!');
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.error(`Failed to delete menu item: ${error.message}`);
      throw error;
    }
  };

  // Initialize data
  useEffect(() => {
    fetchCategories();
    fetchMenuItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    menuItems,
    categories,
    orders,
    loading,
    error,
    fetchMenuItems,
    fetchCategories,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    addCategory,
    updateCategory,
    deleteCategory
  };

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
};

export default RestaurantContext;
