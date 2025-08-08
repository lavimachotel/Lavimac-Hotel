# Database Setup for Hotel Management System

This directory contains SQL scripts for setting up and migrating the database for the Hotel Management System.

## Available Database Scripts

- `create_reports_table.sql`: Sets up the reports table for storing report history
- `create_time_entries_table.sql`: Sets up the time entries table for staff clock in/out records
- `populate_time_entries_sample_data.sql`: Adds sample time entry data for testing

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

## Setting Up the Time Entries Table

To store staff clock in/out records in Supabase, follow these steps:

1. **Log in to your Supabase Dashboard** and select your project

2. **Navigate to the SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Create a New Query**
   - Click "New Query"
   - Paste the contents of `create_time_entries_table.sql` into the editor

4. **Run the Query**
   - Click "Run" to execute the SQL statements
   - You should see a success message

5. **Optional: Add Sample Data**
   - Create another New Query
   - Paste the contents of `populate_time_entries_sample_data.sql` into the editor
   - Click "Run" to add sample time entries data for testing

6. **Verify the Table Creation**
   - Go to the "Table Editor" in the left sidebar
   - You should see a new table named "time_entries"
   - You should also see a new view named "staff_work_hours"

See `README-TIME-ENTRIES.md` for more detailed information about the time entries system.

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

The scripts include Row Level Security (RLS) policies that:

1. Allow authenticated users to perform operations based on their roles
2. Allow anonymous users to view certain data

You can adjust these policies based on your security requirements. 