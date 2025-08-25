// Supabase Configuration
// This file contains the Supabase configuration for the Lavimac HMS project
// You can import this file to use the configuration in your scripts

const SUPABASE_CONFIG = {
  // Supabase Project URL
  SUPABASE_URL: 'https://bviglsgfbwjhioeyhnin.supabase.co',
  
  // Supabase Anonymous Key (public)
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWdsc2dmYndqaGlvZXlobmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjgzOTEsImV4cCI6MjA3MTcwNDM5MX0.qge5aoUragEUNQbXSO1oheiW0Cog_JUBogrOKj0OoTA',
  
  // Supabase Service Role Key (private - use only in server-side scripts)
  SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWdsc2dmYndqaGlvZXlobmluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEyODM5MSwiZXhwIjoyMDcxNzA0MzkxfQ.lC27GFNAA61dvCwPVBEK2ios7JHPcGE_qivrbVF4vnA',
  
  // React App Environment Variables
  REACT_APP_SUPABASE_URL: 'https://bviglsgfbwjhioeyhnin.supabase.co',
  REACT_APP_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWdsc2dmYndqaGlvZXlobmluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjgzOTEsImV4cCI6MjA3MTcwNDM5MX0.qge5aoUragEUNQbXSO1oheiW0Cog_JUBogrOKj0OoTA'
};

// Export for CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SUPABASE_CONFIG;
}

// Export for ES6 modules
if (typeof exports !== 'undefined') {
  exports.SUPABASE_CONFIG = SUPABASE_CONFIG;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = SUPABASE_CONFIG;
}
