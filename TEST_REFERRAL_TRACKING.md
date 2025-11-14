# 🧪 Testing Referral Tracking (Without Purchasing)

## Quick Test Methods

### Method 1: Test Referral Link Storage (Easiest)

1. **Open the test page**:
   - Go to `http://localhost:5000/test-referral-tracking.html`
   - Or deploy it and visit `https://sationly.com/test-referral-tracking.html`

2. **Test the referral link**:
   - Click "Test /elijahtye Link"
   - Check if code is stored
   - View stored code to verify

3. **Test checkout payload**:
   - Click "Show Checkout Payload"
   - Verify `referralCode` is included

### Method 2: Manual Browser Test

1. **Visit referral link**:
   ```
   http://localhost:5000/elijahtye
   ```
   or
   ```
   https://sationly.com/elijahtye
   ```

2. **Check localStorage**:
   - Open browser DevTools (F12)
   - Go to Application → Local Storage
   - Look for `sationly_referral_code` and `sationly_referral_timestamp`
   - Should see: `sationly_referral_code: "elijahtye"`

3. **Test checkout flow** (without completing payment):
   - Sign up or sign in
   - Go to tier selection
   - Open DevTools → Network tab
   - Click a tier button
   - Check the `/api/create-checkout-session` request
   - In the request payload, verify `referralCode: "elijahtye"` is included

### Method 3: Insert Test Data in Database

1. **Get a user ID**:
   - Go to Supabase Dashboard → Authentication → Users
   - Copy any user ID (or create a test user)

2. **Run test SQL**:
   - Go to Supabase Dashboard → SQL Editor
   - Open `08_test_referral_data.sql`
   - Replace `'YOUR_USER_ID'` with the actual user ID
   - Run the SQL

3. **View results**:
   - Go to Table Editor → `subscriptions` table
   - Filter by `referral_code = 'elijahtye'`
   - You should see test subscriptions

4. **View stats** (after creating the view):
   - Run `07_create_referral_stats_view.sql` first
   - Go to Table Editor → `referral_stats` view
   - See aggregated statistics

### Method 4: Use Stripe Test Mode

1. **Use Stripe test cards**:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

2. **Complete test checkout**:
   - Visit `/elijahtye` first (to store referral)
   - Sign up/sign in
   - Select a tier
   - Use test card to complete checkout
   - Check database for `referral_code`

3. **Verify in database**:
   ```sql
   SELECT * FROM subscriptions 
   WHERE referral_code = 'elijahtye' 
   ORDER BY created_at DESC;
   ```

## Verification Checklist

- [ ] Referral link stores code in localStorage
- [ ] Code persists across page navigation
- [ ] Code expires after 30 days (or can be cleared)
- [ ] Checkout session includes `referralCode` in payload
- [ ] Stripe metadata includes `referral_code`
- [ ] Database subscription record has `referral_code` column populated
- [ ] `referral_stats` view shows correct counts

## Clean Up Test Data

To remove test subscriptions:

```sql
-- Remove test subscriptions (be careful!)
DELETE FROM subscriptions 
WHERE referral_code = 'elijahtye' 
  AND created_at > NOW() - INTERVAL '7 days';
```

Or filter by specific user:

```sql
DELETE FROM subscriptions 
WHERE user_id = 'YOUR_USER_ID' 
  AND referral_code = 'elijahtye';
```

## Troubleshooting

**Referral code not storing:**
- Check browser console for errors
- Verify `referral-tracker.js` is loaded
- Check that code is in `VALID_REFERRAL_CODES` array

**Checkout not including referral:**
- Verify localStorage has the code
- Check Network tab for `/api/create-checkout-session` request
- Verify `select-tier.js` is calling `getReferralCode()`

**Database not updating:**
- Check Stripe webhook logs in Vercel
- Verify webhook is receiving `checkout.session.completed` events
- Check Supabase logs for errors

