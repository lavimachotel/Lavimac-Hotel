require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runInventorySetup() {
  try {
    console.log('Starting inventory tables setup...');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('./db_scripts/create_inventory_tables.sql', 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });
    
    if (error) {
      console.error('Error setting up inventory tables:', error);
      return;
    }
    
    console.log('Inventory tables setup completed successfully!');
    
    // Create sample categories
    const categories = [
      { name: 'Cleaning Supplies', description: 'Products used for cleaning and maintenance' },
      { name: 'Guest Amenities', description: 'Items provided to guests in rooms' },
      { name: 'Office Supplies', description: 'General office materials' },
      { name: 'Kitchen Supplies', description: 'Items used in the kitchen and restaurant' },
      { name: 'Maintenance', description: 'Tools and materials for property maintenance' },
      { name: 'Linens', description: 'Bed sheets, towels, and other fabric items' }
    ];
    
    console.log('Adding sample inventory categories...');
    for (const category of categories) {
      const { error } = await supabase
        .from('inventory_categories')
        .insert([category]);
      
      if (error) {
        console.error(`Error adding category ${category.name}:`, error);
      }
    }
    
    // Create sample inventory items
    const items = [
      {
        name: 'Bath Towels',
        description: 'Standard white bath towels',
        category_id: null, // Will be set to Linens category
        sku: 'LIN-BT-001',
        unit_of_measure: 'piece',
        minimum_stock: 50,
        reorder_point: 100,
        current_stock: 250,
        unit_cost: 8.50,
        supplier: 'Luxury Linens Co.',
        location: 'Linen Storage Room'
      },
      {
        name: 'Toilet Paper',
        description: '2-ply toilet paper rolls',
        category_id: null, // Will be set to Guest Amenities category
        sku: 'AM-TP-002',
        unit_of_measure: 'roll',
        minimum_stock: 100,
        reorder_point: 200,
        current_stock: 450,
        unit_cost: 0.75,
        supplier: 'Hotel Supplies Inc.',
        location: 'Main Storage'
      },
      {
        name: 'Liquid Soap',
        description: 'Hand soap for dispensers',
        category_id: null, // Will be set to Cleaning Supplies category
        sku: 'CL-LS-003',
        unit_of_measure: 'liter',
        minimum_stock: 10,
        reorder_point: 20,
        current_stock: 35,
        unit_cost: 3.25,
        supplier: 'CleanPro Supplies',
        location: 'Cleaning Closet'
      },
      {
        name: 'Light Bulbs',
        description: 'LED light bulbs, 60W equivalent',
        category_id: null, // Will be set to Maintenance category
        sku: 'MT-LB-004',
        unit_of_measure: 'piece',
        minimum_stock: 30,
        reorder_point: 50,
        current_stock: 85,
        unit_cost: 2.50,
        supplier: 'Electrical Supply Co.',
        location: 'Maintenance Room'
      },
      {
        name: 'Coffee Pods',
        description: 'Single-serve coffee pods for in-room coffee makers',
        category_id: null, // Will be set to Guest Amenities category
        sku: 'AM-CP-005',
        unit_of_measure: 'piece',
        minimum_stock: 200,
        reorder_point: 350,
        current_stock: 500,
        unit_cost: 0.35,
        supplier: 'Gourmet Coffee Distributors',
        location: 'Pantry Storage'
      }
    ];
    
    // Get category IDs
    const { data: categoryData } = await supabase
      .from('inventory_categories')
      .select('id, name');
    
    if (categoryData) {
      const categoryMap = {};
      categoryData.forEach(cat => {
        categoryMap[cat.name] = cat.id;
      });
      
      // Assign category IDs to items
      items[0].category_id = categoryMap['Linens']; // Bath Towels
      items[1].category_id = categoryMap['Guest Amenities']; // Toilet Paper
      items[2].category_id = categoryMap['Cleaning Supplies']; // Liquid Soap
      items[3].category_id = categoryMap['Maintenance']; // Light Bulbs
      items[4].category_id = categoryMap['Guest Amenities']; // Coffee Pods
      
      console.log('Adding sample inventory items...');
      for (const item of items) {
        const { error } = await supabase
          .from('inventory_items')
          .insert([item]);
        
        if (error) {
          console.error(`Error adding item ${item.name}:`, error);
        }
      }
    }
    
    console.log('Inventory setup completed successfully!');
  } catch (error) {
    console.error('Error in inventory setup process:', error);
  }
}

runInventorySetup();
