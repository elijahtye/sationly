-- ============================================
-- TEST REFERRAL DATA
-- ============================================
-- Use this to insert test subscription data with referral codes
-- This simulates purchases without actually buying anything

-- Step 1: Insert test subscriptions with referral codes
-- Note: Replace 'YOUR_USER_ID' with an actual user ID from your auth.users table
-- You can get a user ID by going to Authentication → Users in Supabase

-- Example: Insert a test subscription for 'elijahtye' referral
INSERT INTO public.subscriptions (
  user_id,
  tier,
  status,
  referral_code,
  created_at,
  updated_at
) VALUES (
  'YOUR_USER_ID',  -- Replace with actual user ID
  'tier2',
  'active',
  'elijahtye',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
),
(
  'YOUR_USER_ID',  -- Replace with actual user ID (can be same or different)
  'tier3',
  'active',
  'elijahtye',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),
(
  'YOUR_USER_ID',  -- Replace with actual user ID
  'tier2',
  'active',
  'elijahtye',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 2: View the test data
SELECT * FROM public.subscriptions WHERE referral_code = 'elijahtye';

-- Step 3: After creating the view (07_create_referral_stats_view.sql), check stats
-- SELECT * FROM public.referral_stats;

-- To clean up test data later:
-- DELETE FROM public.subscriptions WHERE referral_code = 'elijahtye' AND created_at > NOW() - INTERVAL '7 days';

