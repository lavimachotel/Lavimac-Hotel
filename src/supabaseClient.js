import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://euycljxtoesitpjvszwk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eWNsanh0b2VzaXRwanZzendrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0NTExMTMsImV4cCI6MjA1NzAyNzExM30.5w5PSE3ccy1o4PYHmQfn-5XwAJiKouFqlSrCfzUY8eM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
