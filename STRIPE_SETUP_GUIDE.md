# Stripe Setup Guide for Tier 2/3 Subscriptions

This guide will walk you through setting up Stripe payments for Tier 2 (monthly subscription) and Tier 3 (one-time payment) subscriptions.

## Prerequisites

- A Stripe account (free to create at https://stripe.com)
- Node.js project with Express server
- Supabase database already configured

## Step 1: Install Stripe Package

```bash
npm install stripe
```

## Step 2: Create Stripe Account & Get API Keys

1. **Sign up for Stripe** (if you don't have an account)
   - Go to https://stripe.com
   - Click "Sign up" and create an account
   - Complete the account setup

2. **Get your API Keys**
   - Go to Stripe Dashboard → **Developers** → **API keys**
   - You'll see two keys:
     - **Publishable key** (starts with `pk_test_...`) - Safe to use in frontend
     - **Secret key** (starts with `sk_test_...`) - Keep secret, use only in backend
   - Copy both keys (you'll need them for `.env` file)

## Step 3: Create Products and Prices in Stripe

### Create Tier 2 Product (Monthly Subscription - $15/month)

1. Go to Stripe Dashboard → **Products** → **Add product**
2. Fill in:
   - **Name**: "Tier 2 - Monthly Subscription"
   - **Description**: "Monthly subscription with unlimited sessions and custom goals"
   - **Pricing model**: Recurring
   - **Price**: $15.00 USD
   - **Billing period**: Monthly
   - Click **Save product**

3. After creating, click on the product to view details
4. Copy the **Price ID** (starts with `price_...`) - This is your `STRIPE_TIER2_PRICE_ID`

### Create Tier 3 Product (One-time Payment - $200)

1. Go to Stripe Dashboard → **Products** → **Add product**
2. Fill in:
   - **Name**: "Tier 3 - Lifetime Access"
   - **Description**: "One-time payment for lifetime access to all features"
   - **Pricing model**: One-time
   - **Price**: $200.00 USD
   - Click **Save product**

3. After creating, click on the product to view details
4. Copy the **Price ID** (starts with `price_...`) - This is your `STRIPE_TIER3_PRICE_ID`

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env` (if you haven't already):
   ```bash
   cp env.example .env
   ```

2. Open `.env` and add your Stripe keys:

   ```env
   # Stripe Configuration (for Tier 2 and 3 payments)
   STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
   STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
   STRIPE_TIER2_PRICE_ID=price_YOUR_TIER2_PRICE_ID_HERE
   STRIPE_TIER3_PRICE_ID=price_YOUR_TIER3_PRICE_ID_HERE
   ```

   Replace the placeholder values with your actual Stripe keys and price IDs.

## Step 5: Set Up Stripe Webhook (For Production)

Webhooks allow Stripe to notify your server when payments succeed. This is required for automatic subscription activation.

### For Local Development (Testing)

1. **Install Stripe CLI**:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows (using Scoop)
   scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
   scoop install stripe
   
   # Linux
   # Download from https://github.com/stripe/stripe-cli/releases
   ```

2. **Login to Stripe CLI**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to your local server**:
   ```bash
   stripe listen --forward-to localhost:5000/api/stripe-webhook
   ```
   
   This will give you a webhook signing secret (starts with `whsec_...`). Use this for `STRIPE_WEBHOOK_SECRET` in your `.env` file for local testing.

### For Production

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   ```
   https://yourdomain.com/api/stripe-webhook
   ```
4. Select events to listen for:
   - `checkout.session.completed` (required)
   - `customer.subscription.created` (optional, for subscription management)
   - `customer.subscription.updated` (optional, for subscription changes)
   - `customer.subscription.deleted` (optional, for cancellations)
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`) and add it to your production `.env` file

## Step 6: Test the Integration

### Test Mode vs Live Mode

- **Test mode**: Use test API keys (start with `sk_test_` and `pk_test_`)
  - Use test card numbers (see below)
  - No real charges
  - Perfect for development

- **Live mode**: Use live API keys (start with `sk_live_` and `pk_live_`)
  - Real charges
  - Use only in production

### Test Card Numbers

Stripe provides test card numbers for testing:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`

Use any future expiry date (e.g., 12/34), any 3-digit CVC, and any ZIP code.

### Testing Flow

1. **Start your server**:
   ```bash
   npm start
   ```

2. **Start Stripe webhook forwarding** (in a separate terminal):
   ```bash
   stripe listen --forward-to localhost:5000/api/stripe-webhook
   ```

3. **Test Tier 2 (Subscription)**:
   - Go to `http://localhost:5000/select-tier.html`
   - Sign in
   - Click "Select Monthly Plan" (Tier 2)
   - You should be redirected to Stripe Checkout
   - Use test card: `4242 4242 4242 4242`
   - Complete checkout
   - You should be redirected back to dashboard
   - Check Supabase `subscriptions` table - should show `tier: 'tier2'`, `status: 'active'`

4. **Test Tier 3 (One-time Payment)**:
   - Go to `http://localhost:5000/select-tier.html`
   - Click "Select Lifetime Plan" (Tier 3)
   - Complete checkout with test card
   - Check Supabase - should show `tier: 'tier3'`, `status: 'active'`

## Step 7: Handle Payment Success Redirect

The current implementation redirects to `dashboard.html` after successful payment. The webhook handles updating the subscription in the database.

### Check Webhook Logs

In Stripe Dashboard → **Developers** → **Webhooks** → Click on your endpoint → **Logs** to see webhook events and any errors.

## Troubleshooting

### "Stripe package not installed"
```bash
npm install stripe
```

### "Stripe is not configured"
- Check that `STRIPE_SECRET_KEY` is in your `.env` file
- Make sure `.env` is loaded (server should read it automatically with `dotenv`)

### "Failed to create checkout session"
- Check server logs for detailed error
- Verify `STRIPE_TIER2_PRICE_ID` and `STRIPE_TIER3_PRICE_ID` are correct
- Make sure price IDs match your Stripe products

### Webhook not working
- For local: Make sure `stripe listen` is running
- Check webhook URL is correct
- Verify `STRIPE_WEBHOOK_SECRET` matches the signing secret
- Check webhook logs in Stripe Dashboard

### Subscription not updating in database
- Check webhook logs in Stripe Dashboard
- Verify webhook endpoint is accessible
- Check server logs for webhook processing errors
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is correct

## Production Checklist

Before going live:

- [ ] Switch to **Live mode** in Stripe Dashboard
- [ ] Get **Live API keys** (replace test keys in `.env`)
- [ ] Create **Live products** and get live price IDs
- [ ] Set up **Production webhook** endpoint
- [ ] Update `STRIPE_WEBHOOK_SECRET` with production webhook secret
- [ ] Test with real card (use small amount first)
- [ ] Set up email notifications in Stripe for failed payments
- [ ] Configure subscription cancellation handling (optional)

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)

## Current Implementation

The codebase already includes:

✅ **Backend** (`server.js`):
- `/api/create-checkout-session` - Creates Stripe checkout sessions
- `/api/stripe-webhook` - Handles payment success and updates subscriptions

✅ **Frontend** (`select-tier.js`):
- Redirects to Stripe checkout for Tier 2/3
- Handles Tier 1 (free) selection directly

✅ **Database**:
- `subscriptions` table stores tier and status
- Webhook updates subscription on payment success

You just need to:
1. Install Stripe package
2. Add your Stripe keys to `.env`
3. Create products in Stripe and get price IDs
4. Set up webhooks

