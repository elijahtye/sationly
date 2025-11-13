// Stripe checkout session creator for Vercel
import Stripe from 'stripe';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { tier, userId } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing auth token' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

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
    if (user.id !== userId) {
      return res.status(403).json({ message: 'User ID mismatch' });
    }

    // Check if Stripe is configured
    if (!STRIPE_SECRET_KEY) {
      return res.status(500).json({ 
        message: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.' 
      });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    // Define tier pricing
    const tierPricing = {
      tier2: {
        priceId: process.env.STRIPE_TIER2_PRICE_ID || 'price_xxxxx',
        mode: 'subscription'
      },
      tier3: {
        priceId: process.env.STRIPE_TIER3_PRICE_ID || 'price_xxxxx',
        mode: 'payment'
      }
    };

    const pricing = tierPricing[tier];
    if (!pricing) {
      return res.status(400).json({ message: `Invalid tier: ${tier}. Must be 'tier2' or 'tier3'.` });
    }

    // Validate price ID
    if (!pricing.priceId || pricing.priceId === 'price_xxxxx' || !pricing.priceId.startsWith('price_')) {
      console.error('[upword] Invalid price ID for tier:', tier, 'Price ID:', pricing.priceId);
      return res.status(500).json({ 
        message: `Price ID not configured for ${tier}. Please check your environment variables.` 
      });
    }

    // Get origin from request headers
    const origin = req.headers.origin || req.headers.host 
      ? `https://${req.headers.host}` 
      : 'http://localhost:5000';

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: pricing.mode,
      payment_method_types: ['card'],
      line_items: [
        {
          price: pricing.priceId,
          quantity: 1
        }
      ],
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/select-tier?canceled=true`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        tier: tier
      }
    });

    res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('[upword] Stripe checkout error:', error);
    
    res.status(500).json({ 
      message: 'Failed to create checkout session',
      details: error.message || 'Unknown error',
      code: error.code
    });
  }
}

