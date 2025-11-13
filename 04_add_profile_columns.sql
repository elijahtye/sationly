-- ============================================
-- ADD AVATAR_URL AND PHONE_NUMBER TO PROFILES
-- ============================================
-- This adds the avatar_url and phone_number columns to the profiles table
-- for account management features.

-- Step 1: Add avatar_url column (nullable, stores URL or data URL)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Step 2: Add phone_number column (nullable, for password recovery)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Step 3: Add email column (nullable, for syncing with auth.users)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Success! The profiles table now supports avatars and phone numbers.



