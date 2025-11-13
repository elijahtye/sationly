# Vercel Deployment - Quick Start

Your code is on GitHub! Now deploy to Vercel in 5 minutes.

## 🚀 Step-by-Step Deployment

### Step 1: Go to Vercel

1. Open: https://vercel.com/new
2. **Sign up** or **Log in** (you can use GitHub to sign in)

### Step 2: Import Your Repository

1. Click **"Add New Project"** or **"Import Project"**
2. You'll see a list of your GitHub repositories
3. **Find and click** `sationly` (or `elijahtye/sationly`)
4. Click **"Import"**

### Step 3: Configure Project

Vercel should auto-detect settings, but verify:

- **Framework Preset**: `Other` (or leave as detected)
- **Root Directory**: `./` (root)
- **Build Command**: (leave empty - no build needed)
- **Output Directory**: (leave empty)
- **Install Command**: `npm install`

**Click "Deploy"** (you can add environment variables after)

### Step 4: Add Environment Variables

**IMPORTANT**: After the first deployment starts, immediately add environment variables:

1. In the deployment page, click **"Settings"** tab (or go to Project Settings)
2. Click **"Environment Variables"**
3. Add each variable one by one:

#### Copy from your `.env` file and add:

```
OPENAI_API_KEY=sk-proj-...
PORT=5000
SUPABASE_URL=https://ipersqmillkeppeiyhfd.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SESSION_TABLE=conversation_turns
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_TIER2_PRICE_ID=price_1ST2aW99rt7bekY59MzAnVF8
STRIPE_TIER3_PRICE_ID=price_1ST2b899rt7bekY5UbzqS1Aq
STRIPE_WEBHOOK_SECRET=whsec_... (add after setting up webhook)
```

**Important**: 
- Add for **Production**, **Preview**, and **Development** environments
- Click "Save" after adding each variable (or add all, then save)

### Step 5: Redeploy

After adding environment variables:

1. Go to **"Deployments"** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. This ensures all environment variables are loaded

### Step 6: Set Up Production Stripe Webhook

**After your first successful deployment:**

1. **Get your Vercel URL**:
   - Go to Vercel Dashboard → Your Project
   - Copy the production URL (e.g., `https://sationly.vercel.app`)

2. **Create Webhook in Stripe**:
   - Go to: https://dashboard.stripe.com/webhooks
   - Click **"Add endpoint"**
   - **Endpoint URL**: `https://your-project.vercel.app/api/stripe-webhook`
     - Replace `your-project` with your actual Vercel project name
   - **Description**: `Sationly Production Webhook`
   - **Events to send**: Select `checkout.session.completed`
   - Click **"Add endpoint"**

3. **Copy Webhook Secret**:
   - Click on the webhook you just created
   - Under **"Signing secret"**, click **"Reveal"**
   - Copy the secret (starts with `whsec_`)

4. **Add to Vercel**:
   - Go back to Vercel → Project Settings → Environment Variables
   - Add: `STRIPE_WEBHOOK_SECRET` = `whsec_...` (paste your secret)
   - Save

5. **Redeploy again** to pick up the webhook secret

## ✅ You're Live!

Your app is now at: `https://your-project.vercel.app`

## 🧪 Test Your Deployment

1. Visit your Vercel URL
2. Test sign up/sign in
3. Test tier selection
4. Test Stripe checkout (use test card: `4242 4242 4242 4242`)
5. Test practice session

## 📝 Quick Reference

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Your Project**: https://vercel.com/dashboard (click on `sationly`)
- **Deployments**: View all deployments and logs
- **Settings**: Environment variables, domain, etc.

## 🔄 Future Updates

Every time you push to GitHub:
- Vercel automatically deploys to production (if pushing to `main` branch)
- Creates preview deployments for other branches/PRs

Just push to GitHub and Vercel handles the rest! 🚀

