# Vercel Deployment Guide

Complete guide to deploy your Sationly app to Vercel.

## 📋 Prerequisites

- [ ] Vercel account (sign up at https://vercel.com)
- [ ] GitHub account (or GitLab/Bitbucket)
- [ ] All environment variables ready
- [ ] Database migrations run in Supabase

## 🚀 Step 1: Prepare Your Code

### Files Already Created:
- ✅ `vercel.json` - Vercel configuration
- ✅ `api/stripe-webhook.js` - Stripe webhook handler
- ✅ `api/create-checkout-session.js` - Stripe checkout handler
- ✅ `api/sessions.js` - Audio processing handler
- ✅ `.vercelignore` - Files to exclude from deployment

## 🔧 Step 2: Fix Webhook Handler for Vercel

The webhook handler needs special handling for Vercel. Let me update it:

```bash
# The webhook handler needs to handle raw body correctly
```

## 📦 Step 3: Push to GitHub

1. **Initialize Git** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - ready for Vercel"
   ```

2. **Create GitHub Repository**:
   - Go to https://github.com/new
   - Create a new repository (e.g., `sationly`)
   - Don't initialize with README

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/sationly.git
   git branch -M main
   git push -u origin main
   ```

## 🌐 Step 4: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. **Go to Vercel**: https://vercel.com/dashboard
2. **Click "Add New Project"**
3. **Import your GitHub repository**
4. **Configure Project**:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (root)
   - **Build Command**: Leave empty (no build needed)
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

5. **Add Environment Variables** (see Step 5 below)

6. **Click "Deploy"**

### Option B: Via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Follow prompts**:
   - Link to existing project or create new
   - Add environment variables (or add later in dashboard)

## 🔐 Step 5: Environment Variables

Add these in Vercel Dashboard → Your Project → Settings → Environment Variables:

### Required Variables:
```
OPENAI_API_KEY=sk-proj-...
PORT=5000
SUPABASE_URL=https://ipersqmillkeppeiyhfd.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SESSION_TABLE=conversation_turns
```

### Stripe Variables:
```
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_... for production)
STRIPE_TIER2_PRICE_ID=price_...
STRIPE_TIER3_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_... (get from Stripe Dashboard)
```

**Important**: 
- Add variables for **Production**, **Preview**, and **Development** environments
- Use **test keys** for preview/development
- Use **live keys** for production

## 🔗 Step 6: Set Up Production Stripe Webhook

After deployment, set up the production webhook:

1. **Get your Vercel URL**:
   - Go to Vercel Dashboard → Your Project
   - Copy the production URL (e.g., `https://sationly.vercel.app`)

2. **Create Webhook in Stripe**:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Click "Add endpoint"
   - **Endpoint URL**: `https://your-domain.vercel.app/api/stripe-webhook`
   - **Events to send**: Select `checkout.session.completed`
   - Click "Add endpoint"

3. **Copy Webhook Secret**:
   - Click on the new webhook endpoint
   - Copy the **Signing secret** (starts with `whsec_`)
   - Add to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

4. **Redeploy** (to pick up new env var):
   - Vercel Dashboard → Deployments → Click "..." → Redeploy

## 🧪 Step 7: Test Deployment

1. **Visit your Vercel URL**: `https://your-project.vercel.app`
2. **Test Sign Up**: Create a test account
3. **Test Tier Selection**: Select Tier 1 (free)
4. **Test Stripe Checkout**: Select Tier 2/3, complete with test card
5. **Test Practice Session**: Record audio and get feedback
6. **Check Webhooks**: Verify subscription activates automatically

## 🔧 Step 8: Custom Domain (Optional)

1. **Go to Vercel Dashboard** → Your Project → Settings → Domains
2. **Add Domain**: Enter your domain name
3. **Follow DNS Instructions**: Update your domain's DNS records
4. **Wait for SSL**: Vercel automatically provisions SSL certificate

## ⚠️ Important Notes

### File Uploads
- Files are stored in `/tmp` directory (ephemeral)
- Files are automatically deleted after processing
- For production, consider uploading directly to Supabase Storage

### Serverless Functions
- Each API endpoint is a separate serverless function
- Functions have a 60-second timeout (configurable)
- Cold starts may add ~1-2 seconds on first request

### Environment Variables
- **Never commit** `.env` file to Git
- Add all variables in Vercel Dashboard
- Use different keys for production vs preview

### Database
- Ensure all SQL migrations are run in Supabase
- RLS policies must allow service role access
- Test database connections work from Vercel

## 🐛 Troubleshooting

### "Function Timeout"
- Increase timeout in `vercel.json` → `functions` → `maxDuration`
- Maximum is 60 seconds for Hobby plan, 300 for Pro

### "Webhook Signature Verification Failed"
- Check `STRIPE_WEBHOOK_SECRET` is correct
- Ensure webhook URL matches exactly
- Verify webhook is receiving raw body (not parsed JSON)

### "File Upload Fails"
- Check file size limits (Vercel has 4.5MB limit for serverless)
- Verify multipart/form-data is being parsed correctly
- Check `/tmp` directory is writable

### "Environment Variables Not Found"
- Ensure variables are added in Vercel Dashboard
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

## 📊 Monitoring

- **Vercel Dashboard**: View function logs and metrics
- **Stripe Dashboard**: View webhook events and logs
- **Supabase Dashboard**: Monitor database queries

## 🎉 You're Live!

Once deployed, your app will be available at:
- **Production**: `https://your-project.vercel.app`
- **Preview**: `https://your-project-git-branch.vercel.app` (for each branch)

Every push to `main` branch automatically deploys to production!

---

**Need Help?** Check Vercel docs: https://vercel.com/docs

