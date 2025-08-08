const { createClient } = require('@supabase/supabase-js');

// Supabase connection details
const supabaseUrl = 'https://vdaxvoyowsjkyvjpperm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkYXh2b3lvd3Nqa3l2anBwZXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxNjQwMTEsImV4cCI6MjA1Nzc0MDAxMX0.Ex17J4uwp-rXIiQSPbi8iTDNyxk9oKtHZBW6roilkTk';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function listInvoices() {
  console.log('=== LISTING INVOICES ===');
  
  try {
    console.log('Fetching invoices from Supabase...');
    const { data, error } = await supabase
      .from('invoices')
      .select('*');
    
    if (error) {
      console.error('Error fetching invoices:', error);
      return;
    }
    
    console.log(`Found ${data.length} invoices:`);
    
    if (data.length > 0) {
      data.forEach(invoice => {
        console.log(`------------------------------`);
        console.log(`ID: ${invoice.id}`);
        console.log(`Guest: ${invoice.guest_name}`);
        console.log(`Room: ${invoice.room_number}`);
        console.log(`Check-in: ${invoice.check_in_date}`);
        console.log(`Check-out: ${invoice.check_out_date}`);
        console.log(`Amount: GH₵${invoice.amount}`);
        console.log(`Status: ${invoice.status}`);
        console.log(`Room Type: ${invoice.room_type || 'N/A'}`);
        console.log(`Nights: ${invoice.nights || 'N/A'}`);
        console.log(`Room Rate: GH₵${invoice.room_rate || 'N/A'}`);
        console.log(`Created: ${invoice.created_at}`);
        console.log(`Updated: ${invoice.updated_at}`);
      });
    } else {
      console.log('No invoices found.');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the function
listInvoices(); 