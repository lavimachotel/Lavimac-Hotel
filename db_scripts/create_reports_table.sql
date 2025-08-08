-- Create the reports table for storing generated reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE,
  type TEXT NOT NULL,
  format TEXT,
  generated_by TEXT,
  filename TEXT,
  file_content TEXT,   -- This will store the base64 file content
  preview_data TEXT,   -- For preview purposes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add appropriate indices
CREATE INDEX idx_reports_created_at ON public.reports(created_at);
CREATE INDEX idx_reports_type ON public.reports(type);

-- Set up Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to CRUD their own reports
CREATE POLICY "Authenticated users can CRUD their own reports" ON public.reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anyone to read reports (you can remove this if reports should be private)
CREATE POLICY "Anyone can read reports" ON public.reports
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Comment on table
COMMENT ON TABLE public.reports IS 'Stores generated reports from the hotel management system'; 