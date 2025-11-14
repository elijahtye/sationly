# Referral Tracking Setup Guide

## 🎯 Overview

This system tracks purchases from influencer referral links (e.g., `sationly.com/elijahtye`).

## 📋 Setup Steps

### Step 1: Run Database Migrations

Run these SQL migrations in Supabase SQL Editor (in order):

1. **First migration** (`06_add_referral_tracking.sql`):
   - Adds `referral_code` column to `subscriptions` table

2. **Second migration** (`07_create_referral_stats_view.sql`):
   - Creates `referral_stats` view for easy viewing in Table Editor

### Step 2: How It Works

1. **User visits referral link**: `sationly.com/elijahtye`
2. **Referral code stored**: Code is saved in browser localStorage (valid for 30 days)
3. **User signs up/purchases**: Referral code is automatically included
4. **Purchase tracked**: When payment completes, `referral_code` is saved in the `subscriptions` table

### Step 3: View Referrals

**Easy Method (Table Editor):**
1. Go to Supabase Dashboard → Table Editor
2. Look for the **`referral_stats`** view (it will appear like a table)
3. Click on it to see all referral statistics:
   - `referral_code` - The influencer code
   - `total_purchases` - Total number of purchases
   - `tier2_purchases` - Number of Tier 2 subscriptions
   - `tier3_purchases` - Number of Tier 3 purchases
   - `active_subscriptions` - Currently active subscriptions
   - `first_purchase_date` - When first purchase happened
   - `last_purchase_date` - Most recent purchase date

**Advanced Method (SQL Query):**
```sql
-- View the referral stats
SELECT * FROM referral_stats;

-- See individual purchases with referral codes
SELECT user_id, tier, referral_code, created_at, status
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

**View in Table Editor:**
- Open Supabase Dashboard → Table Editor
- Click on **`referral_stats`** view
- See all statistics automatically updated

**Or use SQL:**
```sql
-- View referral stats
SELECT * FROM referral_stats;

-- Filter by specific referral code
SELECT * FROM referral_stats WHERE referral_code = 'elijahtye';
```

---

**Note**: Referral codes are stored for 30 days in localStorage. If a user visits the link and purchases within 30 days, the referral will be tracked.

