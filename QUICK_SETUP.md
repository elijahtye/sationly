# Quick Setup Guide - sationly.com

## ✅ 1. Stripe Production Webhook Setup

**Your site is live at: https://sationly.com**

### Steps:

1. **Go to Stripe**: https://dashboard.stripe.com/webhooks
2. **Click "Add endpoint"**
3. **Set endpoint URL**: `https://sationly.com/api/stripe-webhook`
4. **Select event**: `checkout.session.completed`
5. **Copy webhook secret** (starts with `whsec_`)
6. **Add to Vercel**:
   - Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `STRIPE_WEBHOOK_SECRET` = `whsec_...`
   - Save
7. **Redeploy** in Vercel

**Done!** Payments will now automatically update user tiers.

---

## ✅ 2. Browser Tab Titles

**Already fixed!** All pages have clean titles:
- ✅ "Sationly" (home)
- ✅ "Sationly • Create Account" (signup)
- ✅ "Sationly • Sign In" (sign in)
- ✅ "Dashboard - Sationly" (dashboard)
- ✅ "Choose Your Plan - Sationly" (tier selection)
- ✅ "Account - Sationly" (account)

No ".html" appears in browser tabs.

---

## ✅ 3. User Experience Testing

**Test the complete flow:**

1. **Sign Up** → Create account
2. **Dashboard** → Start a practice session
3. **Tier Selection** → Click upgrade
4. **Stripe Checkout** → Use test card: `4242 4242 4242 4242`
5. **Verify** → Check user tier updated in Supabase

**See `UX_TESTING_CHECKLIST.md` for detailed testing guide.**

---

## 🚀 You're Ready!

- ✅ Site live at sationly.com
- ✅ Stripe webhook setup (follow steps above)
- ✅ Clean browser tab titles
- ✅ Ready for UX testing

**Next**: Set up the production webhook, then test the full user journey!

