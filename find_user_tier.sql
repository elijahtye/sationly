-- ============================================
-- FIND USER AND THEIR CURRENT TIER
-- ============================================
-- Replace 'user@example.com' with the email you're looking for

SELECT 
  u.email,
  u.id as user_id,
  COALESCE(s.tier, 'no tier') as tier,
  COALESCE(s.status, 'no subscription') as status,
  s.updated_at as last_updated
FROM auth.users u
LEFT JOIN public.subscriptions s ON u.id = s.user_id
WHERE u.email = 'user@example.com';  -- Replace with actual email

