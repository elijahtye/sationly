# Update Stripe Webhook Secret in Vercel

## 🔐 Your Webhook Secret
```
whsec_6sv2kbaGeLCLxANBBLEK4U8bua5CQvdh
```

## 📝 Step-by-Step Instructions

### Step 1: Go to Vercel Dashboard

1. **Open**: https://vercel.com/dashboard
2. **Click on your project**: `sationly` (or whatever your project name is)

### Step 2: Navigate to Environment Variables

1. **Click "Settings"** tab (top navigation)
2. **Click "Environment Variables"** (left sidebar)

### Step 3: Update STRIPE_WEBHOOK_SECRET

**Option A: If the variable already exists:**
1. **Find** `STRIPE_WEBHOOK_SECRET` in the list
2. **Click the edit icon** (pencil) next to it
3. **Replace the value** with: `whsec_6sv2kbaGeLCLxANBBLEK4U8bua5CQvdh`
4. **Make sure** it's enabled for **Production**, **Preview**, and **Development**
5. **Click "Save"**

**Option B: If the variable doesn't exist:**
1. **Click "Add New"** button
2. **Key**: `STRIPE_WEBHOOK_SECRET`
3. **Value**: `whsec_6sv2kbaGeLCLxANBBLEK4U8bua5CQvdh`
4. **Select environments**: Check **Production**, **Preview**, and **Development**
5. **Click "Save"**

### Step 4: Redeploy (See instructions below)

---

## 🚀 How to Redeploy in Vercel

### Method 1: Redeploy from Deployments Tab (Easiest)

1. **Go to "Deployments"** tab (top navigation)
2. **Find the latest deployment** (should be at the top)
3. **Click the "..."** (three dots) menu on the right side of that deployment
4. **Click "Redeploy"**
5. **Confirm** by clicking "Redeploy" again
6. **Wait** ~30-60 seconds for deployment to complete

### Method 2: Push to GitHub (Automatic)

If you make any code changes:
```bash
git add .
git commit -m "Update webhook secret"
git push origin main
```

Vercel will automatically redeploy!

### Method 3: Redeploy via Vercel CLI

If you have Vercel CLI installed:
```bash
vercel --prod
```

---

## ✅ Verify It Worked

After redeploying:

1. **Check deployment status**: Should show "Ready" (green checkmark)
2. **Test a payment**:
   - Go to https://sationly.com
   - Sign up/login
   - Select a tier
   - Use test card: `4242 4242 4242 4242`
   - Complete checkout
3. **Check Stripe Dashboard**:
   - Go to: https://dashboard.stripe.com/webhooks
   - Click on your webhook
   - Check "Events" tab
   - Should see `checkout.session.completed` events
   - Events should show "Succeeded" (green checkmark)

---

## 🎯 Quick Summary

1. **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. **Update** `STRIPE_WEBHOOK_SECRET` = `whsec_6sv2kbaGeLCLxANBBLEK4U8bua5CQvdh`
3. **Save**
4. **Deployments** tab → **"..."** menu → **Redeploy**
5. **Done!** ✅

---

**Note**: The webhook secret is now saved in your Vercel project. Future deployments will automatically use it!

