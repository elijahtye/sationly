// API endpoint to verify and create subscription from Stripe checkout session
// This is a fallback in case the webhook hasn't fired yet
import Stripe from 'stripe';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing auth token' });
    }

    if (!sessionId) {
      return res.status(400).json({ message: 'Missing sessionId' });
    }

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ message: 'Configuration missing' });
    }

    // Verify user with Supabase
    const token = authHeader.replace('Bearer ', '');
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    });

    if (!userResponse.ok) {
      return res.status(401).json({ message: 'Invalid session' });
    }

    const user = await userResponse.json();
    const userId = user.id;

    // Retrieve Stripe checkout session
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify session is completed
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ 
        message: 'Payment not completed',
        payment_status: session.payment_status
      });
    }

    // Verify user matches
    if (session.metadata.userId !== userId) {
      return res.status(403).json({ message: 'User ID mismatch' });
    }

    const tier = session.metadata.tier;
    const referralCode = session.metadata.referral_code || null;

    if (!tier) {
      return res.status(400).json({ message: 'Missing tier in metadata' });
    }

    // Check if subscription already exists
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=id,tier,status`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    if (checkResponse.ok) {
      const existing = await checkResponse.json();
      if (existing && existing.length > 0) {
        // Subscription already exists - update it
        const updateResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              tier: tier,
              status: 'active',
              stripe_subscription_id: session.subscription || session.id,
              referral_code: referralCode,
              updated_at: new Date().toISOString()
            })
          }
        );

        if (updateResponse.ok) {
          const updated = await updateResponse.json();
          console.log('[upword] Subscription updated from checkout session:', userId, tier, referralCode);
          return res.json({ success: true, subscription: updated[0], action: 'updated' });
        }
      }
    }

    // Create subscription if it doesn't exist
    const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[upword] Failed to create subscription from checkout:', errorText);
      return res.status(500).json({ 
        message: 'Failed to create subscription',
        details: errorText
      });
    }

    const result = await createResponse.json();
    console.log('[upword] Subscription created from checkout session:', userId, tier, referralCode);

    res.json({ success: true, subscription: result, action: 'created' });
  } catch (error) {
    console.error('[upword] Verify checkout session error:', error);
    res.status(500).json({ 
      message: 'Failed to verify checkout session',
      details: error.message 
    });
  }
}

