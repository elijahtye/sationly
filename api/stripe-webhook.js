// Stripe webhook handler for Vercel
import Stripe from 'stripe';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      return res.status(500).json({ message: 'Stripe webhook not configured' });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    const webhookSecret = STRIPE_WEBHOOK_SECRET;

    // Get raw body for signature verification
    // In Vercel, when bodyParser is false, body comes as Buffer
    let rawBody;
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
    } else if (typeof req.body === 'string') {
      rawBody = req.body;
    } else {
      rawBody = JSON.stringify(req.body);
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('[upword] Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.userId;
      const tier = session.metadata.tier;

      if (!userId || !tier) {
        console.error('[upword] Missing userId or tier in webhook metadata');
        return res.status(400).json({ message: 'Missing metadata' });
      }

      // Get referral code from metadata
      const referralCode = session.metadata.referral_code || null;

      // Update subscription in Supabase
      const response = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          user_id: userId,
          tier: tier,
          status: 'active',
          stripe_subscription_id: session.subscription || session.id,
          referral_code: referralCode,
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[upword] Failed to update subscription:', errorText);
        console.error('[upword] Response status:', response.status);
        console.error('[upword] Referral code attempted:', referralCode);
        return res.status(500).json({ message: 'Failed to update subscription' });
      }

      const result = await response.json();
      console.log('[upword] Subscription activated for user:', userId, 'tier:', tier, 'referral_code:', referralCode);
      console.log('[upword] Database response:', result);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[upword] Webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
}

// Vercel requires this configuration for webhooks
export const config = {
  api: {
    bodyParser: false, // We need raw body for signature verification
  },
};

