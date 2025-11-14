# Referral Codes

## Active Referral Codes

### elijahtye (ElijahTye)
- **Code**: `elijahtye`
- **Link**: `sationly.com/elijahtye` or `sationly.com/ElijahTye` (case-insensitive)
- **Status**: ✅ Active
- **Tracking**: Purchases tracked in `subscriptions.referral_code`

## How It Works

1. User visits `sationly.com/elijahtye` (or any case variation)
2. Code is normalized to lowercase: `elijahtye`
3. Stored in browser localStorage for 30 days
4. Automatically included in checkout sessions
5. Saved to database when payment completes

## Viewing Statistics

1. Go to Supabase Dashboard → Table Editor
2. Open `referral_stats` view (after running `07_create_referral_stats_view.sql`)
3. See purchase counts, tier breakdown, and dates

Or query:
```sql
SELECT * FROM referral_stats WHERE referral_code = 'elijahtye';
```

## Adding New Codes

To add a new referral code:

1. **Add to `referral-tracker.js`**:
   ```javascript
   const VALID_REFERRAL_CODES = ['elijahtye', 'newcode'];
   ```

2. **Add route in `server.js`**:
   ```javascript
   app.get('/newcode', (req, res) => {
     res.sendFile(path.join(rootDir, 'index.html'));
   });
   ```

3. **Add route in `vercel.json`**:
   ```json
   {
     "src": "/newcode",
     "dest": "/index.html"
   }
   ```

4. **Push to GitHub** - Vercel auto-deploys

---

**Note**: All referral codes are case-insensitive. `ElijahTye`, `ELIJAHTYE`, and `elijahtye` all work the same.

