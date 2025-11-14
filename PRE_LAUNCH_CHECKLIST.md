# 🚀 Pre-Launch Checklist for Sationly

Complete checklist before releasing your website to the public.

## ✅ Core Functionality

### Authentication & User Management
- [x] User sign-up works
- [x] User sign-in works
- [x] User sign-out works
- [x] Password reset (if implemented)
- [x] Session persistence works
- [x] Untiered users redirect to tier selection
- [x] Tiered users can access dashboard

### Tier System
- [x] Tier 1 (free) subscription creation works (no Stripe)
- [x] Tier 2/3 Stripe checkout works
- [x] Tier selection page shows current tier with checkmark
- [x] Users can upgrade/downgrade tiers
- [x] Subscription status updates correctly

### Dashboard & Practice
- [x] Dashboard loads for tiered users
- [x] Recording functionality works
- [x] AI feedback generation works
- [x] Session history displays correctly
- [x] Environment timer works
- [x] Session limits enforced (Tier 1: 3 sessions/week)
- [x] Profile picture loads correctly

### Payments
- [x] Stripe checkout redirects work
- [x] Webhook receives payment events
- [x] Subscriptions update automatically after payment
- [x] Test payments work in test mode
- [x] Production payments ready (live keys)

## 🔐 Environment Variables (Vercel)

### Required - Check All Are Set:
- [ ] `OPENAI_API_KEY` - Your OpenAI API key
- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `SUPABASE_SESSION_TABLE` - Set to `conversation_turns`

### Stripe - Production Keys:
- [ ] `STRIPE_SECRET_KEY` - **LIVE key** (starts with `sk_live_`)
- [ ] `STRIPE_PUBLISHABLE_KEY` - **LIVE key** (starts with `pk_live_`)
- [ ] `STRIPE_TIER2_PRICE_ID` - **LIVE price ID** for Tier 2
- [ ] `STRIPE_TIER3_PRICE_ID` - **LIVE price ID** for Tier 3
- [ ] `STRIPE_WEBHOOK_SECRET` - **Production webhook secret** (`whsec_...`)

**⚠️ Important**: Make sure you're using **LIVE keys** in production, not test keys!

## 🗄️ Database Setup

### SQL Migrations - Run in Supabase:
- [ ] `01_setup_profiles.sql` - Profiles table
- [ ] `02_setup_subscriptions.sql` - Subscriptions table
- [ ] `03_setup_conversation_turns.sql` - Conversation turns table
- [ ] `04_add_profile_columns.sql` - Profile columns (avatar, etc.)
- [ ] `05_setup_environments.sql` - Environments table
- [ ] `06_add_referral_tracking.sql` - Referral code column
- [ ] `07_create_referral_stats_view.sql` - Referral stats view

**Or run**: `00_SETUP_ALL.sql` to set up everything at once

### Database Verification:
- [ ] RLS (Row Level Security) policies are enabled
- [ ] Service role can access all tables
- [ ] Users can only access their own data
- [ ] Test queries work from Vercel functions

## 🔗 Stripe Configuration

### Production Webhook:
- [ ] Webhook endpoint created: `https://sationly.com/api/stripe-webhook`
- [ ] Event selected: `checkout.session.completed`
- [ ] Webhook secret copied and added to Vercel
- [ ] Webhook tested with a real payment
- [ ] Webhook logs show successful events

### Stripe Products & Prices:
- [ ] Tier 2 product created in Stripe Dashboard
- [ ] Tier 2 price created (monthly subscription)
- [ ] Tier 3 product created in Stripe Dashboard
- [ ] Tier 3 price created (one-time payment)
- [ ] Price IDs match environment variables

### Stripe Dashboard Settings:
- [ ] Business information filled out
- [ ] Tax settings configured (if applicable)
- [ ] Email receipts configured
- [ ] Refund policy set (if applicable)

## 🌐 Domain & Deployment

### Vercel Deployment:
- [ ] Site deployed to Vercel
- [ ] Custom domain connected: `sationly.com`
- [ ] SSL certificate active (automatic with Vercel)
- [ ] DNS records configured correctly
- [ ] Site loads at `https://sationly.com`

### Environment Variables:
- [ ] All variables added in Vercel Dashboard
- [ ] Variables set for **Production** environment
- [ ] Variables set for **Preview** environment (optional)
- [ ] No test keys in production

## 🧪 Testing Checklist

### User Flow Testing:
- [ ] New user sign-up → Tier selection → Dashboard
- [ ] Existing user sign-in → Dashboard (if tiered)
- [ ] Existing user sign-in → Tier selection (if untiered)
- [ ] Tier 1 selection → Instant access to dashboard
- [ ] Tier 2/3 selection → Stripe checkout → Payment → Dashboard access
- [ ] Recording a practice session → AI feedback received
- [ ] Session history displays correctly
- [ ] Profile updates work

### Payment Testing:
- [ ] Test payment with Stripe test card (in test mode)
- [ ] Production payment with real card (small amount)
- [ ] Webhook receives payment event
- [ ] Subscription updates in database
- [ ] User tier updated correctly

### Error Handling:
- [ ] Invalid email/password shows error
- [ ] Network errors handled gracefully
- [ ] Payment failures show error message
- [ ] Missing tier shows tier selection page
- [ ] Session limit reached shows message

### Browser Testing:
- [ ] Chrome/Edge (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## 🔒 Security & Privacy

### Security:
- [ ] Environment variables not exposed in client code
- [ ] API keys stored securely in Vercel
- [ ] HTTPS enforced (automatic with Vercel)
- [ ] User passwords hashed (Supabase handles this)
- [ ] RLS policies prevent unauthorized access

### Privacy:
- [ ] Privacy Policy page created and linked
- [ ] Terms of Service page created and linked
- [ ] Cookie consent (if required by jurisdiction)
- [ ] GDPR compliance (if serving EU users)
- [ ] Data retention policy documented

## 📊 Analytics & Monitoring (Optional)

### Analytics:
- [ ] Google Analytics added (optional)
- [ ] Vercel Analytics enabled (optional)
- [ ] Error tracking (e.g., Sentry) set up (optional)

### Monitoring:
- [ ] Vercel function logs monitored
- [ ] Stripe webhook logs monitored
- [ ] Supabase database queries monitored
- [ ] Error alerts configured (optional)

## 🎨 User Experience

### UI/UX:
- [ ] All pages load without flashing
- [ ] Loading states shown during async operations
- [ ] Error messages are clear and helpful
- [ ] Success messages confirm actions
- [ ] Navigation is intuitive
- [ ] Mobile responsive design works
- [ ] Favicon displays correctly

### Performance:
- [ ] Page load times acceptable (< 3 seconds)
- [ ] Images optimized
- [ ] No console errors in production
- [ ] No broken links

## 📝 Legal & Compliance

### Required Pages:
- [ ] Privacy Policy (`/privacy` or `/privacy-policy`)
- [ ] Terms of Service (`/terms` or `/terms-of-service`)
- [ ] Refund Policy (if applicable)
- [ ] Contact page or email

### Content:
- [ ] All text is accurate and up-to-date
- [ ] Pricing clearly displayed
- [ ] Feature descriptions accurate
- [ ] No placeholder text remaining

## 🚨 Pre-Launch Final Checks

### Critical:
- [ ] **Switch Stripe to LIVE mode** (not test mode)
- [ ] **Use LIVE API keys** in Vercel environment variables
- [ ] **Test with a real payment** (small amount)
- [ ] **Verify webhook works** with production payments
- [ ] **Check all environment variables** are set correctly

### Documentation:
- [ ] README updated with current info
- [ ] Deployment guide accurate
- [ ] Support email/contact info available

### Backup Plan:
- [ ] Know how to rollback if issues occur
- [ ] Have Stripe test mode ready to switch back
- [ ] Database backups configured (Supabase handles this)

## 🎯 Launch Day Checklist

1. **Morning**:
   - [ ] Final test of all user flows
   - [ ] Check Vercel deployment is live
   - [ ] Verify domain is working
   - [ ] Test payment flow one more time

2. **Before Launch**:
   - [ ] Switch Stripe to LIVE mode
   - [ ] Update environment variables with LIVE keys
   - [ ] Redeploy Vercel
   - [ ] Test production payment
   - [ ] Monitor webhook events

3. **After Launch**:
   - [ ] Monitor error logs
   - [ ] Check Stripe dashboard for payments
   - [ ] Monitor Supabase for new users
   - [ ] Be ready to respond to issues

## 📞 Support & Maintenance

### Support:
- [ ] Support email or contact form set up
- [ ] FAQ page (optional but recommended)
- [ ] Response plan for user issues

### Maintenance:
- [ ] Regular backup schedule (Supabase automatic)
- [ ] Monitor API usage (OpenAI, Stripe)
- [ ] Check for security updates
- [ ] Review error logs weekly

---

## ⚠️ Critical Items Before Launch

**DO NOT LAUNCH** until these are complete:

1. ✅ **Stripe LIVE keys** in Vercel (not test keys)
2. ✅ **Production webhook** configured and tested
3. ✅ **All environment variables** set in Vercel
4. ✅ **Database migrations** run in Supabase
5. ✅ **Test payment** completed successfully in production
6. ✅ **Domain** connected and SSL active
7. ✅ **Privacy Policy** and **Terms of Service** pages created

---

## 🎉 Ready to Launch?

Once all critical items are checked, you're ready to go live!

**Good luck with your launch! 🚀**

