# Stripe Webhook Setup Instructions

## ✅ What's Already Done

1. ✅ Stripe CLI installed
2. ✅ Stripe CLI logged in
3. ✅ Webhook forwarding process ready

## 🔧 Getting Your Webhook Secret

The webhook secret is generated when you start `stripe listen`. Here's how to get it:

### Step 1: Start Webhook Forwarding

Open a **new terminal window** and run:

```bash
cd /Users/elijahtye/Learning
stripe listen --forward-to localhost:5000/api/stripe-webhook
```

### Step 2: Copy the Webhook Secret

You'll see output like this:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

**Copy the `whsec_...` value** - this is your webhook secret!

### Step 3: Add to .env File

Add it to your `.env` file:

```env
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
```

### Step 4: Restart Your Server

After adding the webhook secret, restart your server:

```bash
# Stop current server (Ctrl+C or kill process)
npm start
```

## 🧪 Testing Webhooks

1. **Keep the `stripe listen` terminal running** (don't close it)
2. **Start your server** in another terminal: `npm start`
3. **Test a payment**:
   - Go to `http://localhost:5000/select-tier.html`
   - Select Tier 2 or Tier 3
   - Complete checkout with test card: `4242 4242 4242 4242`
4. **Watch the `stripe listen` terminal** - you should see webhook events
5. **Check your server logs** - should see subscription activation

## 📊 What You'll See

### In `stripe listen` terminal:
```
2024-11-08 11:35:23   --> checkout.session.completed [evt_xxx]
2024-11-08 11:35:23  <--  [200] POST http://localhost:5000/api/stripe-webhook [evt_xxx]
```

### In your server logs:
```
[upword] Webhook received: checkout.session.completed
[upword] Subscription activated for user: [user-id]
```

## 🎯 How It Works

1. **User completes payment** → Stripe processes it
2. **Stripe sends webhook** → Stripe CLI forwards it to your server
3. **Your server receives webhook** → Verifies signature
4. **Server activates subscription** → Updates database
5. **User gets access** → Can use their tier immediately!

## ⚠️ Important Notes

- **Keep `stripe listen` running** while testing locally
- **Webhook secret changes** each time you restart `stripe listen`
- **For production**, you'll set up a permanent webhook in Stripe Dashboard
- **The webhook secret** is different for local vs production

## 🚀 Production Setup (Later)

When you're ready for production:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter your production URL: `https://yourdomain.com/api/stripe-webhook`
4. Select events: `checkout.session.completed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to production `.env` file

---

**For now, just run `stripe listen` in a terminal and copy the webhook secret!** 🎉

