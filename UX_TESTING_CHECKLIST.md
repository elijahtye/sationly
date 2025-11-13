# User Experience Testing Checklist

Test the complete user journey on **sationly.com**

## 🎯 Complete User Flow Test

### 1. Landing Page (index.html)
- [ ] Page loads correctly
- [ ] Browser tab shows: **"Sationly"** (not "index.html")
- [ ] Sign up button works
- [ ] Sign in link works
- [ ] Design looks good on mobile
- [ ] Design looks good on desktop

### 2. Sign Up Flow
- [ ] Click "Sign Up" → Goes to signup page
- [ ] Browser tab shows: **"Sationly • Create Account"** (clean, no .html)
- [ ] Can create account with email/password
- [ ] Error messages display correctly
- [ ] Success → Redirects to dashboard

### 3. Sign In Flow
- [ ] Click "Sign In" → Goes to sign in page
- [ ] Browser tab shows: **"Sationly • Sign In"** (clean)
- [ ] Can sign in with existing account
- [ ] Error messages display correctly
- [ ] Success → Redirects to dashboard

### 4. Dashboard (First Time User - Tier 1)
- [ ] Browser tab shows: **"Dashboard - Sationly"** (clean)
- [ ] Shows Tier 1 session count (0/3)
- [ ] Can select goal
- [ ] Can select duration
- [ ] Can start recording
- [ ] Timer displays correctly
- [ ] Timer auto-ends at selected duration
- [ ] Can see conversation history
- [ ] Can end session manually

### 5. Tier Selection
- [ ] Click "Upgrade" or tier selection → Goes to tier page
- [ ] Browser tab shows: **"Choose Your Plan - Sationly"** (clean)
- [ ] Can see all 3 tiers
- [ ] Can click "Select Tier" for Tier 2 or Tier 3
- [ ] Redirects to Stripe checkout
- [ ] Stripe checkout loads correctly

### 6. Payment Flow (Test Mode)
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Complete checkout
- [ ] Redirects back to dashboard
- [ ] User tier updated to Tier 2 or Tier 3
- [ ] Session limits removed (unlimited sessions)

### 7. Tier 1 Session Limits
- [ ] Create 3 environments (sessions)
- [ ] After 3rd session, shows "3/3" and cooldown message
- [ ] Cannot create 4th session
- [ ] Shows upgrade prompt
- [ ] Shows cooldown timer (1 week from last session)

### 8. Account Page
- [ ] Browser tab shows: **"Account - Sationly"** (clean)
- [ ] Shows current tier
- [ ] Shows account info
- [ ] Sign out button works
- [ ] Sign out redirects to home page

### 9. Environment Timer
- [ ] Timer starts when first recording begins
- [ ] Timer displays elapsed time
- [ ] Timer shows warning color when < 1 minute remaining
- [ ] Timer auto-ends at selected duration
- [ ] Session ends gracefully when timer hits limit

### 10. Mobile Experience
- [ ] All pages responsive
- [ ] Buttons are tappable
- [ ] Forms are easy to fill
- [ ] No horizontal scrolling
- [ ] Text is readable

## 🐛 Common Issues to Check

### Browser Tab Titles
All should be clean (no ".html"):
- ✅ "Sationly" (home)
- ✅ "Sationly • Create Account" (signup)
- ✅ "Sationly • Sign In" (sign in)
- ✅ "Dashboard - Sationly" (dashboard)
- ✅ "Choose Your Plan - Sationly" (tier selection)
- ✅ "Account - Sationly" (account)

### Payment Issues
- [ ] Stripe checkout loads
- [ ] Webhook receives events (check Stripe Dashboard)
- [ ] User tier updates after payment
- [ ] No duplicate charges

### Session Issues
- [ ] Sessions save correctly
- [ ] Conversation history loads
- [ ] Audio uploads work
- [ ] AI feedback displays

## 📱 Test on Multiple Devices

- [ ] Desktop (Chrome)
- [ ] Desktop (Safari)
- [ ] Mobile (iOS Safari)
- [ ] Mobile (Android Chrome)

## 🔍 Performance Check

- [ ] Pages load quickly (< 2 seconds)
- [ ] Images optimize correctly
- [ ] No console errors
- [ ] No network errors

## ✅ Post-Testing Actions

After testing, verify:
1. **Stripe Webhook**: Check Stripe Dashboard → Webhooks → Events
2. **Database**: Check Supabase → Table Editor → `profiles` (tiers updated)
3. **Vercel Logs**: Check deployment logs for errors
4. **User Feedback**: Note any confusing UX elements

---

**Test Account**: Create a test account and go through the entire flow as a new user would!

