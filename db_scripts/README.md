# Database Setup for Hotel Management System

This directory contains SQL scripts for setting up and migrating the database for the Hotel Management System.

## Setting Up the Reports Table

To store report history in Supabase instead of browser localStorage (which has size limitations), you need to create a reports table.

### Steps to create the Reports table:

1. **Log in to your Supabase Dashboard** and select your project

2. **Navigate to the SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Create a New Query**
   - Click "New Query"
   - Paste the contents of `create_reports_table.sql` into the editor

4. **Run the Query**
   - Click "Run" to execute the SQL statements
   - You should see a success message

5. **Verify the Table Creation**
   - Go to the "Table Editor" in the left sidebar
   - You should see a new table named "reports"
   - Click on it to view its structure

## Table Structure

The reports table has the following structure:

- `id`: UUID - Primary key
- `name`: TEXT - Report name
- `date`: TIMESTAMP WITH TIME ZONE - Report generation date
- `type`: TEXT - Report type (PDF, EXCEL, CSV)
- `format`: TEXT - Report format (pdf, excel, csv)
- `generated_by`: TEXT - User who generated the report
- `filename`: TEXT - Name of the report file
- `file_content`: TEXT - Base64-encoded file content
- `preview_data`: TEXT - Preview data (for display purposes)
- `created_at`: TIMESTAMP WITH TIME ZONE - Creation timestamp

## Row Level Security (RLS)

The script includes Row Level Security (RLS) policies that:

1. Allow authenticated users to perform all operations (CRUD)
2. Allow anonymous users to view reports

You can adjust these policies based on your security requirements. 