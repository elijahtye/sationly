# Production Stripe Webhook Setup for sationly.com

Your site is live at **sationly.com**! Now set up the production webhook.

## 🔗 Step 1: Create Production Webhook in Stripe

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/webhooks

2. **Click "Add endpoint"**

3. **Configure the webhook**:
   - **Endpoint URL**: `https://sationly.com/api/stripe-webhook`
   - **Description**: `Sationly Production Webhook`
   - **Events to send**: Select `checkout.session.completed`
     - This event fires when a payment is successful
   - Click **"Add endpoint"**

4. **Copy the Webhook Signing Secret**:
   - Click on the webhook you just created
   - Under **"Signing secret"**, click **"Reveal"**
   - Copy the secret (starts with `whsec_`)
   - **Save this somewhere safe!**

## 🔐 Step 2: Add Webhook Secret to Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Click on your `sationly` project**
3. **Go to Settings** → **Environment Variables**
4. **Add/Update**:
   - **Name**: `STRIPE_WEBHOOK_SECRET`
   - **Value**: `whsec_...` (paste the secret you copied)
   - **Environment**: Select **Production**, **Preview**, and **Development**
   - Click **"Save"**

## 🚀 Step 3: Redeploy

1. **Go to Deployments** tab
2. **Click "..."** on the latest deployment
3. **Click "Redeploy"**
4. Wait for deployment to complete (~30 seconds)

## ✅ Step 4: Test the Webhook

### Test Payment Flow:

1. **Visit**: https://sationly.com
2. **Sign up** for a new account
3. **Go to tier selection** (or upgrade)
4. **Select Tier 2 or Tier 3**
5. **Use Stripe test card**:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

6. **Complete checkout**

### Verify Webhook Worked:

1. **Check Stripe Dashboard** → **Webhooks** → Click your webhook
2. **View "Events"** tab
3. You should see `checkout.session.completed` events
4. Click on an event to see details
5. **Check if it succeeded** (green checkmark)

### Verify User Tier Updated:

1. **Check your Supabase database**:
   - Go to Supabase Dashboard → Table Editor → `profiles`
   - Find the user who made the payment
   - Check `subscription_tier` column
   - Should be `tier2` or `tier3`

## 🐛 Troubleshooting

### Webhook not receiving events?

1. **Check webhook URL is correct**: `https://sationly.com/api/stripe-webhook`
2. **Check Vercel deployment is live**: Visit `https://sationly.com`
3. **Check webhook secret is set**: Vercel → Settings → Environment Variables
4. **Check Stripe webhook logs**: Stripe Dashboard → Webhooks → Your webhook → Events

### Payment succeeded but tier not updated?

1. **Check webhook events** in Stripe Dashboard
2. **Check Vercel function logs**: Vercel → Deployments → Click deployment → Functions → `api/stripe-webhook`
3. **Check Supabase connection**: Make sure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct in Vercel

### Test webhook locally?

You can test webhooks locally using Stripe CLI (but for production, use the live webhook):

```bash
stripe listen --forward-to localhost:5000/api/stripe-webhook
```

## 📋 Quick Checklist

- [ ] Webhook created in Stripe Dashboard
- [ ] Endpoint URL: `https://sationly.com/api/stripe-webhook`
- [ ] Event: `checkout.session.completed` selected
- [ ] Webhook secret copied (`whsec_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` added to Vercel environment variables
- [ ] Vercel deployment redeployed
- [ ] Test payment completed successfully
- [ ] Webhook event received in Stripe Dashboard
- [ ] User tier updated in Supabase database

## 🎉 You're Done!

Once the webhook is set up and tested:
- ✅ Payments automatically update user tiers
- ✅ No manual intervention needed
- ✅ Users get instant access after payment

---

**Need help?** Check:
- Stripe webhook logs: https://dashboard.stripe.com/webhooks
- Vercel function logs: Vercel Dashboard → Deployments → Functions
- Supabase database: Supabase Dashboard → Table Editor

