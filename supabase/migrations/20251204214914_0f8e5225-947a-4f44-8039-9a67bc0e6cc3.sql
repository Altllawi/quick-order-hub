-- Add background_url to restaurants table
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS background_url TEXT DEFAULT NULL;

-- We keep banner_url and background_color columns but will stop using them in code
-- This preserves data integrity while removing functionality