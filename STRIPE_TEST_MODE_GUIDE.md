# 🧪 Testing Purchases with Stripe Test Mode

## Overview

Stripe Test Mode allows you to simulate purchases **without charging real money**. Perfect for testing referral tracking!

## Step-by-Step Test Process

### Step 1: Visit Your Referral Link

1. Open an **incognito/private browser window** (to simulate a new user)
2. Visit: `https://sationly.com/elijahtye` (or `http://localhost:5000/elijahtye` locally)
3. **Verify referral code is stored**:
   - Open DevTools (F12)
   - Go to **Application** → **Local Storage**
   - Look for `sationly_referral_code: "elijahtye"` ✅

### Step 2: Sign Up or Sign In

1. Click **"Get Started"** or **"Sign Up"**
2. Create a test account (use a test email like `test@example.com`)
3. Or sign in with an existing test account

### Step 3: Select a Tier

1. After signup/login, you'll be redirected to tier selection
2. Click **"Select Tier 2"** or **"Select Lifetime Plan"** (Tier 3)
3. This will redirect you to Stripe Checkout

### Step 4: Use Stripe Test Card

In the Stripe Checkout page, use these **test card details**:

#### ✅ Success Test Cards

**Card Number**: `4242 4242 4242 4242`
- **Expiry**: Any future date (e.g., `12/34`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP**: Any 5 digits (e.g., `12345`)
- **Result**: ✅ Payment succeeds, no real charge

**Card Number**: `4000 0000 0000 0002` (Requires authentication)
- **Expiry**: Any future date
- **CVC**: Any 3 digits
- **ZIP**: Any 5 digits
- **Result**: ✅ Payment succeeds after authentication

#### ❌ Failure Test Cards (Optional - for error testing)

**Card Number**: `4000 0000 0000 9995`
- **Result**: ❌ Card declined

**Card Number**: `4000 0000 0000 0069`
- **Result**: ❌ Expired card

### Step 5: Complete Checkout

1. Enter the test card details above
2. Click **"Pay"** or **"Subscribe"**
3. If using `4000 0000 0000 0002`, complete 3D Secure authentication
4. You'll be redirected back to your dashboard
5. **No real money is charged!** 💰

### Step 6: Verify Referral Tracking

#### Option A: Check Database (Supabase)

1. Go to **Supabase Dashboard** → **Table Editor**
2. Open the **`subscriptions`** table
3. Find your test user's subscription
4. Check the **`referral_code`** column
5. Should show: `elijahtye` ✅

Or run SQL:
```sql
SELECT user_id, tier, referral_code, created_at, status
FROM subscriptions
WHERE referral_code = 'elijahtye'
ORDER BY created_at DESC
LIMIT 10;
```

#### Option B: Check Referral Stats View

1. Make sure you've run `07_create_referral_stats_view.sql`
2. Go to **Table Editor** → **`referral_stats`** view
3. Look for `elijahtye` row
4. Check `total_purchases` count ✅

#### Option C: Check Stripe Dashboard

1. Go to **Stripe Dashboard** → **Test Mode** (toggle in top right)
2. Navigate to **Payments** or **Subscriptions**
3. Find your test payment
4. Click on it to see details
5. Check **Metadata** section
6. Should show: `referral_code: elijahtye` ✅

## Quick Test Checklist

- [ ] Visit referral link (`/elijahtye`)
- [ ] Verify code stored in localStorage
- [ ] Sign up/sign in
- [ ] Select a tier
- [ ] Use test card `4242 4242 4242 4242`
- [ ] Complete checkout
- [ ] Check database for `referral_code`
- [ ] Verify in Stripe dashboard metadata

## Important Notes

### Stripe Test Mode vs Live Mode

- **Test Mode**: Uses test cards, no real charges
- **Live Mode**: Uses real cards, real charges
- Make sure you're in **Test Mode** when testing!

### Test Cards Only Work in Test Mode

- Test cards (`4242 4242 4242 4242`) only work when Stripe is in **Test Mode**
- If you're in Live Mode, test cards will be declined
- Check your Stripe dashboard to confirm mode

### Webhook Testing

The referral code is saved when Stripe sends a `checkout.session.completed` webhook to your server. Make sure:
- Webhook endpoint is configured in Stripe Dashboard
- Webhook secret is set in Vercel environment variables
- Webhook is receiving events (check Vercel logs)

## Troubleshooting

### Test Card Not Working

1. **Check Stripe Mode**: Make sure Stripe Dashboard shows "Test Mode"
2. **Check API Keys**: Verify you're using test keys (`sk_test_...` and `pk_test_...`)
3. **Check Card Number**: Use exactly `4242 4242 4242 4242` (no spaces in some cases)

### Referral Code Not Saved

1. **Check localStorage**: Verify code was stored before checkout
2. **Check Network Tab**: Look at `/api/create-checkout-session` request payload
3. **Check Stripe Metadata**: Verify metadata includes `referral_code`
4. **Check Webhook Logs**: Make sure webhook received and processed the event

### Can't See Test Payment

1. **Check Stripe Mode**: Toggle to "Test Mode" in Stripe Dashboard
2. **Refresh**: Payments may take a few seconds to appear
3. **Check Filters**: Make sure no date/status filters are applied

## Clean Up Test Data

After testing, you can clean up:

```sql
-- Delete test subscriptions (be careful!)
DELETE FROM subscriptions 
WHERE referral_code = 'elijahtye' 
  AND created_at > NOW() - INTERVAL '1 day';
```

Or filter by your test user ID:

```sql
DELETE FROM subscriptions 
WHERE user_id = 'YOUR_TEST_USER_ID';
```

---

**Remember**: Test Mode = No Real Charges! 🎉

