// API endpoint to create Tier 1 (free) subscription with referral tracking
// NOTE: This endpoint does NOT contact Stripe - it only creates a subscription in Supabase
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, referralCode } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing auth token' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ message: 'Supabase not configured' });
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
    if (user.id !== userId) {
      return res.status(403).json({ message: 'User ID mismatch' });
    }

    // Create or update Tier 1 subscription in Supabase (NO STRIPE - instant activation)
    // Using upsert to handle cases where subscription already exists
    const response = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'resolution=merge-duplicates' // Upsert behavior
      },
      body: JSON.stringify({
        user_id: userId,
        tier: 'tier1',
        status: 'active',
        referral_code: referralCode || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[upword] Failed to create Tier 1 subscription:', errorText);
      console.error('[upword] Response status:', response.status);
      return res.status(500).json({ 
        message: 'Failed to create subscription',
        details: errorText
      });
    }

    const result = await response.json();
    console.log('[upword] Tier 1 subscription created/updated for user:', userId, 'referral_code:', referralCode || 'none');

    res.json({ success: true, subscription: result });
  } catch (error) {
    console.error('[upword] Tier 1 subscription error:', error);
    res.status(500).json({ 
      message: 'Failed to create subscription',
      details: error.message 
    });
  }
}

