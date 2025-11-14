-- ============================================
-- REFERRAL STATISTICS VIEW
-- ============================================
-- This creates a view that shows referral statistics in an easy-to-read format
-- You can view this in Supabase Table Editor like a regular table

-- Step 1: Create the referral statistics view
CREATE OR REPLACE VIEW public.referral_stats AS
SELECT 
  referral_code,
  COUNT(*) as total_purchases,
  COUNT(CASE WHEN tier = 'tier2' THEN 1 END) as tier2_purchases,
  COUNT(CASE WHEN tier = 'tier3' THEN 1 END) as tier3_purchases,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
  MIN(created_at) as first_purchase_date,
  MAX(created_at) as last_purchase_date
FROM public.subscriptions
WHERE referral_code IS NOT NULL
GROUP BY referral_code
ORDER BY total_purchases DESC;

-- Step 2: Grant access to the view
GRANT SELECT ON public.referral_stats TO authenticated;
GRANT SELECT ON public.referral_stats TO anon;

-- Step 3: Add comment for documentation
COMMENT ON VIEW public.referral_stats IS 'Shows referral statistics grouped by referral code. View this in Table Editor to see purchase counts.';

-- Success! You can now view referral_stats in Supabase Table Editor
-- The view will automatically update as new purchases come in
