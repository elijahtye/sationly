# Vercel Environment Variables Checklist

## ✅ Yes, You Need ALL of These in Vercel!

All environment variables from your `.env` file that are used in production need to be added to Vercel.

---

## 📋 Complete List of Required Variables

Add these to Vercel Dashboard → Settings → Environment Variables:

### OpenAI
- ✅ `OPENAI_API_KEY` (you just added this!)

### Supabase
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `SUPABASE_SESSION_TABLE` = `conversation_turns`

### Stripe
- ✅ `STRIPE_SECRET_KEY`
- ✅ `STRIPE_PUBLISHABLE_KEY`
- ✅ `STRIPE_TIER2_PRICE_ID`
- ✅ `STRIPE_TIER3_PRICE_ID`
- ✅ `STRIPE_WEBHOOK_SECRET`

### Server
- ✅ `PORT` = `5000` (optional, but good to have)

---

## 🚀 How to Add Them All at Once

### Step 1: Get Your Values

Check your local `.env` file:
```bash
cd /Users/elijahtye/Learning
cat .env
```

### Step 2: Add to Vercel

1. **Go to**: https://vercel.com/dashboard
2. **Click your `sationly` project**
3. **Settings** → **Environment Variables**
4. **Add each variable**:
   - Copy the **name** from your `.env` file
   - Copy the **value** from your `.env` file
   - Select **Production**, **Preview**, and **Development**
   - Click **"Save"**
   - Repeat for each variable

### Step 3: Verify All Are Added

Check that you have all variables listed above in Vercel.

### Step 4: Redeploy

1. **Deployments** tab → **"..."** → **Redeploy**
2. Wait for deployment to complete

---

## ⚠️ Important Notes

### What NOT to Add
- ❌ Variables that start with `#` (comments)
- ❌ Empty variables
- ❌ Local-only variables (like `NODE_ENV=development` if you have it)

### What TO Add
- ✅ All variables used in `api/` functions
- ✅ All variables used in `server.js` (for reference)
- ✅ All API keys and secrets

---

## 🔍 Quick Check: Which Variables Are Used?

Your code uses these environment variables:

**In `api/sessions.js`:**
- `OPENAI_API_KEY` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `SUPABASE_SESSION_TABLE` ✅

**In `api/stripe-webhook.js`:**
- `STRIPE_SECRET_KEY` ✅
- `STRIPE_WEBHOOK_SECRET` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅

**In `api/create-checkout-session.js`:**
- `STRIPE_SECRET_KEY` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅

**In client-side code (dashboard.js, etc.):**
- `SUPABASE_URL` (can be hardcoded or from env)
- `SUPABASE_ANON_KEY` (can be hardcoded or from env)
- `STRIPE_PUBLISHABLE_KEY` (can be hardcoded or from env)

---

## ✅ Quick Copy-Paste Checklist

When adding to Vercel, make sure you have:

```
OPENAI_API_KEY=sk-proj-...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SESSION_TABLE=conversation_turns
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_TIER2_PRICE_ID=price_...
STRIPE_TIER3_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
PORT=5000
```

---

## 🎯 Summary

**Yes, add ALL environment variables from your `.env` file to Vercel!**

- Local `.env` = for local development
- Vercel Environment Variables = for production

They need to match (except for local-only variables).

---

**After adding all variables and redeploying, your site should work perfectly!** 🚀

