import React, { createContext, useState, useEffect, useContext } from 'react';
import supabase from '../supabaseClient';
import { useUser } from './UserContext';
import toast from 'react-hot-toast';

const InventoryContext = createContext();

export const useInventory = () => useContext(InventoryContext);

export const InventoryProvider = ({ children }) => {
  const { user } = useUser();
  const [inventoryItems, setInventoryItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);

  // Fetch all inventory items
  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*, inventory_categories(id, name)')
        .order('name');

      if (error) throw error;
      setInventoryItems(data || []);
      return data;
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      setError(error.message);
      toast.error('Failed to fetch inventory data from server');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch all categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
      return data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch all transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*, item:item_id(name, sku)')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
      return data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Add a new inventory item
  const addInventoryItem = async (itemData) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([itemData])
        .select('*, inventory_categories(id, name)')
        .single();

      if (error) throw error;
      
      setInventoryItems(prev => [...prev, data]);
      toast.success('Item added successfully');
      return { data, error: null };
    } catch (error) {
      console.error('Error adding inventory item:', error);
      setError(error.message);
      toast.error(`Failed to add item: ${error.message}`);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Update an existing inventory item
  const updateInventoryItem = async (id, itemData) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('inventory_items')
        .update(itemData)
        .eq('id', id)
        .select('*, inventory_categories(id, name)')
        .single();

      if (error) throw error;
      
      setInventoryItems(prev => prev.map(item => item.id === id ? data : item));
      toast.success('Item updated successfully');
      return { data, error: null };
    } catch (error) {
      console.error('Error updating inventory item:', error);
      setError(error.message);
      toast.error(`Failed to update item: ${error.message}`);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Delete an inventory item
  const deleteInventoryItem = async (id) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setInventoryItems(prev => prev.filter(item => item.id !== id));
      toast.success('Item deleted successfully');
      return { error: null };
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      setError(error.message);
      toast.error(`Failed to delete item: ${error.message}`);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Add a new category
  const addCategory = async (categoryData) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('inventory_categories')
        .insert([categoryData])
        .select()
        .single();

      if (error) throw error;
      
      setCategories(prev => [...prev, data]);
      toast.success('Category added successfully');
      return { data, error: null };
    } catch (error) {
      console.error('Error adding category:', error);
      setError(error.message);
      toast.error(`Failed to add category: ${error.message}`);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Update an existing category
  const updateCategory = async (id, categoryData) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('inventory_categories')
        .update(categoryData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setCategories(prev => prev.map(cat => cat.id === id ? data : cat));
      toast.success('Category updated successfully');
      return { data, error: null };
    } catch (error) {
      console.error('Error updating category:', error);
      setError(error.message);
      toast.error(`Failed to update category: ${error.message}`);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Delete a category
  const deleteCategory = async (id) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('inventory_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setCategories(prev => prev.filter(cat => cat.id !== id));
      toast.success('Category deleted successfully');
      return { error: null };
    } catch (error) {
      console.error('Error deleting category:', error);
      setError(error.message);
      toast.error(`Failed to delete category: ${error.message}`);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Add a new transaction
  const addTransaction = async (transactionData) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('inventory_transactions')
        .insert([transactionData])
        .select('*, item:item_id(name, sku)')
        .single();

      if (error) throw error;
      
      setTransactions(prev => [data, ...prev]);
      
      // Update inventory item stock level if it's a consumption or purchase
      if (transactionData.transaction_type === 'consumption' || transactionData.transaction_type === 'purchase') {
        const item = inventoryItems.find(i => i.id === transactionData.item_id);
        if (item) {
          const stockChange = transactionData.transaction_type === 'purchase' 
            ? transactionData.quantity 
            : -transactionData.quantity;
          
          await updateInventoryItem(item.id, {
            current_stock: item.current_stock + stockChange
          });
        }
      }
      
      toast.success('Transaction added successfully');
      return { data, error: null };
    } catch (error) {
      console.error('Error adding transaction:', error);
      setError(error.message);
      toast.error(`Failed to add transaction: ${error.message}`);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Update an existing transaction
  const updateTransaction = async (id, transactionData) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('inventory_transactions')
        .update(transactionData)
        .eq('id', id)
        .select('*, item:item_id(name, sku)')
        .single();

      if (error) throw error;
      
      setTransactions(prev => prev.map(trans => trans.id === id ? data : trans));
      toast.success('Transaction updated successfully');
      return { data, error: null };
    } catch (error) {
      console.error('Error updating transaction:', error);
      setError(error.message);
      toast.error(`Failed to update transaction: ${error.message}`);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Delete a transaction
  const deleteTransaction = async (id) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('inventory_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setTransactions(prev => prev.filter(trans => trans.id !== id));
      toast.success('Transaction deleted successfully');
      return { error: null };
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setError(error.message);
      toast.error(`Failed to delete transaction: ${error.message}`);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Check for low stock items
  const checkLowStockItems = () => {
    const lowStock = inventoryItems.filter(item => 
      item.current_stock <= item.reorder_point
    );
    setLowStockItems(lowStock);
  };

  // Initialize data on mount
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        fetchInventoryItems(),
        fetchCategories(),
        fetchTransactions()
      ]);
    };

    initializeData();
  }, [user]);

  // Check for low stock whenever inventory items change
  useEffect(() => {
    checkLowStockItems();
  }, [inventoryItems]);

  const value = {
    // State
    inventoryItems,
    categories,
    suppliers,
    transactions,
    purchaseOrders,
    loading,
    error,
    lowStockItems,
    
    // Functions
    fetchInventoryItems,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    checkLowStockItems
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};

export default InventoryContext;
