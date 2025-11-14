# Referral Tracking Setup Guide

## 🎯 Overview

This system tracks purchases from influencer referral links (e.g., `sationly.com/elijahtye`).

## 📋 Setup Steps

### Step 1: Run Database Migration

Run the SQL migration to add referral tracking:

```sql
-- Run this in Supabase SQL Editor:
-- File: 06_add_referral_tracking.sql
```

This adds a `referral_code` column to the `subscriptions` table.

### Step 2: How It Works

1. **User visits referral link**: `sationly.com/elijahtye`
2. **Referral code stored**: Code is saved in browser localStorage (valid for 30 days)
3. **User signs up/purchases**: Referral code is automatically included
4. **Purchase tracked**: When payment completes, `referral_code` is saved in the `subscriptions` table

### Step 3: View Referrals

Query the database to see referrals:

```sql
-- Count purchases by referral code
SELECT referral_code, COUNT(*) as purchase_count
FROM subscriptions
WHERE referral_code IS NOT NULL
GROUP BY referral_code;

-- See all purchases with referral codes
SELECT user_id, tier, referral_code, created_at
FROM subscriptions
WHERE referral_code IS NOT NULL
ORDER BY created_at DESC;
```

## 🔗 Adding New Influencer Links

To add a new influencer link (e.g., `sationly.com/influencername`):

1. **Add to referral-tracker.js**:
   ```javascript
   const VALID_REFERRAL_CODES = ['elijahtye', 'influencername'];
   ```

2. **Add route in server.js**:
   ```javascript
   app.get('/influencername', (req, res) => {
     res.sendFile(path.join(rootDir, 'index.html'));
   });
   ```

3. **Add route in vercel.json**:
   ```json
   {
     "src": "/influencername",
     "dest": "/index.html"
   }
   ```

4. **Push to GitHub** - Vercel will auto-deploy

## ✅ Current Setup

- **Link**: `sationly.com/elijahtye`
- **Code**: `elijahtye`
- **Tracking**: Purchases tracked in `subscriptions.referral_code`

## 📊 Analytics

To see referral performance:

```sql
-- Total purchases by influencer
SELECT 
  referral_code,
  COUNT(*) as total_purchases,
  COUNT(CASE WHEN tier = 'tier2' THEN 1 END) as tier2_count,
  COUNT(CASE WHEN tier = 'tier3' THEN 1 END) as tier3_count
FROM subscriptions
WHERE referral_code IS NOT NULL
  AND status = 'active'
GROUP BY referral_code
ORDER BY total_purchases DESC;
```

---

**Note**: Referral codes are stored for 30 days in localStorage. If a user visits the link and purchases within 30 days, the referral will be tracked.

