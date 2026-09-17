-- Run this SQL in your Supabase SQL Editor if you get errors about missing columns.

-- Add admin_note column to books table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='books' AND column_name='admin_note') THEN
        ALTER TABLE public.books ADD COLUMN admin_note TEXT;
    END IF;
END $$;
