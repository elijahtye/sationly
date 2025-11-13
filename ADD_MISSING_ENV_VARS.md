# Add Missing Environment Variables to Vercel

## 🚨 Issue: OPENAI_API_KEY Not Configured

Your site is getting a 500 error because `OPENAI_API_KEY` is missing in Vercel.

## 🔧 Quick Fix

### Step 1: Get Your OpenAI API Key

You should have this in your local `.env` file. If not, get it from:
- https://platform.openai.com/api-keys

### Step 2: Add to Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Click on your `sationly` project**
3. **Go to Settings** → **Environment Variables**
4. **Click "Add New"**
5. **Add**:
   - **Key**: `OPENAI_API_KEY`
   - **Value**: `sk-proj-...` (your OpenAI API key from .env file)
   - **Environments**: Select **Production**, **Preview**, and **Development**
   - **Click "Save"**

### Step 3: Redeploy

1. **Go to "Deployments"** tab
2. **Click "..."** on latest deployment
3. **Click "Redeploy"**
4. **Wait** ~30 seconds

### Step 4: Test

Visit https://sationly.com and try the chatbot again!

---

## 📋 All Required Environment Variables

Make sure these are ALL set in Vercel:

### Required:
- ✅ `OPENAI_API_KEY` (you're missing this!)
- ✅ `PORT` = `5000`
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `SUPABASE_SESSION_TABLE` = `conversation_turns`

### Stripe:
- ✅ `STRIPE_SECRET_KEY`
- ✅ `STRIPE_PUBLISHABLE_KEY`
- ✅ `STRIPE_TIER2_PRICE_ID`
- ✅ `STRIPE_TIER3_PRICE_ID`
- ✅ `STRIPE_WEBHOOK_SECRET`

---

## 🔍 How to Check Your Local .env

To see what your local `.env` has:

```bash
cd /Users/elijahtye/Learning
cat .env | grep OPENAI_API_KEY
```

Copy that value and add it to Vercel!

---

## ✅ After Adding

Once you add `OPENAI_API_KEY` to Vercel and redeploy, the chatbot should work!

