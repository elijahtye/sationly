# 🔍 Troubleshooting Referral Tracking

## Issue: Nothing Appearing in Database

If purchases aren't showing up with referral codes, follow these steps:

### Step 1: Verify Database Migration

**Check if `referral_code` column exists:**

1. Go to Supabase Dashboard → Table Editor
2. Open `subscriptions` table
3. Check if `referral_code` column exists
4. If **NOT**, run this SQL:

```sql
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS referral_code TEXT;
```

### Step 2: Verify Referral Code is Stored Before Checkout

1. **Before selecting tier**, open DevTools (F12)
2. Go to **Application** → **Local Storage**
3. Verify you see: `sationly_referral_code: "elijahtye"`
4. If **NOT**, visit `/elijahtye` again first

### Step 3: Check Checkout Session Metadata

1. Go through checkout flow
2. Open DevTools → **Network** tab
3. Find `/api/create-checkout-session` request
4. Click on it → **Payload** tab
5. Verify `referralCode: "elijahtye"` is included
6. If **NOT**, the referral code wasn't passed

### Step 4: Verify Stripe Webhook is Working

#### Check Vercel Logs:

1. Go to **Vercel Dashboard** → Your Project
2. Click **Functions** tab
3. Find `api/stripe-webhook`
4. Check **Logs** for recent webhook calls
5. Look for errors or success messages

#### Check Stripe Dashboard:

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Find your webhook endpoint
3. Click on it → **Recent events**
4. Check if `checkout.session.completed` events are being sent
5. Click on an event → **Response** tab
6. Check if it returned `200 OK` or an error

### Step 5: Manually Check Stripe Metadata

1. Go to **Stripe Dashboard** → **Payments** (Test Mode)
2. Find your test payment
3. Click on it
4. Scroll to **Metadata** section
5. Verify `referral_code: elijahtye` is present
6. If **NOT**, the referral code wasn't included in checkout session

### Step 6: Test Webhook Manually

You can manually trigger a webhook to test:

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Click **Send test webhook**
4. Select `checkout.session.completed`
5. Use this test payload (update with your actual data):

```json
{
  "id": "evt_test_webhook",
  "object": "event",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_123",
      "object": "checkout.session",
      "metadata": {
        "userId": "YOUR_USER_ID",
        "tier": "tier2",
        "referral_code": "elijahtye"
      },
      "subscription": "sub_test_123"
    }
  }
}
```

### Step 7: Check Database Directly

Run this SQL to see ALL subscriptions:

```sql
-- See all subscriptions
SELECT 
  id,
  user_id,
  tier,
  referral_code,
  status,
  created_at
FROM subscriptions
ORDER BY created_at DESC
LIMIT 20;
```

If subscriptions exist but `referral_code` is NULL:
- The webhook is working, but referral code wasn't passed
- Check Step 3 and Step 5

If NO subscriptions exist:
- The webhook isn't firing or is failing
- Check Step 4

### Step 8: Common Issues & Fixes

#### Issue: Webhook returns 500 error

**Check Vercel logs for:**
- Missing environment variables
- Database connection errors
- Invalid user_id

**Fix:**
```bash
# Verify environment variables in Vercel:
# - STRIPE_SECRET_KEY
# - STRIPE_WEBHOOK_SECRET
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
```

#### Issue: Webhook returns 400 (signature verification failed)

**Fix:**
- Verify `STRIPE_WEBHOOK_SECRET` in Vercel matches Stripe Dashboard
- Make sure webhook secret is from the correct endpoint

#### Issue: Referral code is NULL in database

**Possible causes:**
1. Referral code not stored in localStorage before checkout
2. Referral code not passed to checkout session
3. Webhook metadata doesn't include referral_code

**Fix:**
- Visit `/elijahtye` FIRST before selecting tier
- Check Network tab to verify `referralCode` in checkout request
- Check Stripe metadata to verify it's included

#### Issue: Webhook not receiving events

**Check:**
1. Webhook endpoint URL is correct in Stripe Dashboard
2. Webhook is enabled (not paused)
3. Events are being sent (check Recent events)
4. Vercel function is deployed and accessible

**Fix:**
- Re-save webhook endpoint in Stripe Dashboard
- Redeploy Vercel function if needed
- Check Vercel function logs

### Step 9: Debug Webhook Locally

If you want to test webhook locally:

1. **Install Stripe CLI**:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server**:
   ```bash
   stripe listen --forward-to localhost:5000/api/stripe-webhook
   ```

4. **Copy the webhook secret** (starts with `whsec_`)

5. **Update `.env`**:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

6. **Test checkout** - webhook will forward to localhost

### Step 10: Verify Complete Flow

**Complete checklist:**

- [ ] Visited `/elijahtye` link
- [ ] Verified `sationly_referral_code` in localStorage
- [ ] Signed up/signed in
- [ ] Selected tier
- [ ] Checked Network tab - `referralCode` in checkout request
- [ ] Completed checkout with test card
- [ ] Checked Stripe Dashboard - `referral_code` in metadata
- [ ] Checked Stripe Dashboard - webhook event sent
- [ ] Checked Vercel logs - webhook received successfully
- [ ] Checked database - subscription created with `referral_code`

## Quick Diagnostic Query

Run this to see the full picture:

```sql
-- Check recent subscriptions and their referral codes
SELECT 
  s.id,
  s.user_id,
  s.tier,
  s.referral_code,
  s.status,
  s.created_at,
  p.email
FROM subscriptions s
LEFT JOIN auth.users u ON s.user_id = u.id
LEFT JOIN profiles p ON s.user_id = p.id
ORDER BY s.created_at DESC
LIMIT 10;
```

## Still Not Working?

1. **Check Vercel Function Logs** - Most detailed error info
2. **Check Stripe Webhook Logs** - See what Stripe is sending
3. **Check Browser Console** - See if referral code is being stored
4. **Check Network Tab** - See if referral code is being sent

---

**Need more help?** Check the specific error message in Vercel logs or Stripe webhook response.

