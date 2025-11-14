-- ============================================
-- REFERRAL TRACKING SETUP
-- ============================================
-- This adds referral tracking to subscriptions to track influencer links

-- Step 1: Add referral_code column to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- Step 2: Create index for faster queries on referral codes
CREATE INDEX IF NOT EXISTS idx_subscriptions_referral_code ON public.subscriptions(referral_code);

-- Step 3: Add comment for documentation
COMMENT ON COLUMN public.subscriptions.referral_code IS 'Tracks which influencer/referral code was used when subscription was created';

-- Success! Referral tracking is now set up.
-- Use referral_code to track purchases from influencer links like /elijahtye

