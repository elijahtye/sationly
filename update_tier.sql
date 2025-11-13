-- ============================================
-- UPDATE USER TIER BY EMAIL
-- ============================================
-- Step 1: Replace 'user@example.com' with the actual email
-- Step 2: Replace 'tier2' with tier1, tier2, or tier3
-- Step 3: Run this in Supabase SQL Editor

-- Update or create subscription for user
INSERT INTO public.subscriptions (user_id, tier, status, stripe_subscription_id)
SELECT 
  id as user_id,
  'tier2' as tier,  -- Change this to tier1, tier2, or tier3
  'active' as status,
  'manual_' || id::text as stripe_subscription_id
FROM auth.users
WHERE email = 'user@example.com'  -- Replace with actual email
ON CONFLICT (user_id) DO UPDATE
SET 
  tier = 'tier2',  -- Change this to match the tier above
  status = 'active',
  updated_at = NOW();

-- Verify the update worked
SELECT 
  u.email,
  s.tier,
  s.status,
  s.updated_at
FROM auth.users u
JOIN public.subscriptions s ON u.id = s.user_id
WHERE u.email = 'user@example.com';  -- Replace with actual email

