# Time Entries Database Setup

This document provides instructions on setting up the Time Entries functionality in your hotel management system, which allows staff to clock in and out and for managers to track staff attendance.

## Prerequisites

Before running the script to create the time entries table, you need:

1. A Supabase account with a project set up
2. The staff table must already exist in your database
3. The UUID extension must be enabled in your Supabase project

## Setting Up the Time Entries Table

To store staff clock in/out records in Supabase (instead of just keeping them in memory or browser localStorage), follow these steps:

### 1. Log in to your Supabase Dashboard

- Navigate to [https://app.supabase.com/](https://app.supabase.com/)
- Select your project

### 2. Navigate to the SQL Editor

- Click on "SQL Editor" in the left sidebar
- Click "New Query"

### 3. Run the Time Entries Table Creation Script

- Open the `create_time_entries_table.sql` file from this directory
- Copy the entire contents of the file
- Paste it into the Supabase SQL Editor
- Click "Run" to execute the SQL statements

### 4. Verify Table Creation

- Go to the "Table Editor" in the left sidebar
- You should see a new table named "time_entries"
- You should also see a new view named "staff_work_hours"

## Table Structure

The time_entries table has the following structure:

- `id`: UUID - Primary key, automatically generated
- `staff_id`: UUID - Foreign key reference to the staff table
- `entry_type`: TEXT - Type of entry ('in' or 'out')
- `entry_date`: DATE - Date of the entry
- `entry_time`: TIME - Time of the entry
- `notes`: TEXT - Optional notes for the entry
- `location`: TEXT - Location where the entry was made
- `created_at`: TIMESTAMP - When the record was created
- `updated_at`: TIMESTAMP - When the record was last updated

## How the Time Entries System Works

1. Staff members use the Time Attendance page to clock in at the start of their shift
2. They clock out at the end of their shift
3. The system records the time, date, and duration of each shift
4. Managers can view reports showing staff attendance and hours worked

## Row Level Security (RLS)

The script includes Row Level Security (RLS) policies that:

1. Allow anyone to view time entries
2. Allow authenticated users to insert and update time entries

You can adjust these policies based on your security requirements.

## Staff Work Hours View

The `staff_work_hours` view calculates the total hours worked by each staff member on each date by finding the first clock-in and last clock-out for that day.

## Troubleshooting

If you encounter an error related to `public.notify_table_changes()` function not existing, you will need to create this function first. Here's the code to do so:

```sql
CREATE OR REPLACE FUNCTION public.notify_table_changes()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'table_change',
    json_build_object(
      'table', TG_TABLE_NAME,
      'action', TG_OP,
      'record', CASE
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
      END
    )::text
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

Run this in the SQL Editor before running the time entries table creation script. 