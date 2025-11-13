/**
 * Express server for Sationly
 * Handles API endpoints for local development
 * For production, use Vercel serverless functions in api/ directory
 */

import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { createReadStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

function extensionFromMimeType(mimeType = '') {
  const normalized = mimeType.toLowerCase();
  if (!normalized) return '';
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('mp4') || normalized.includes('m4a')) return 'm4a';
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'mp3';
  if (normalized.includes('wav')) return 'wav';
  if (normalized.includes('ogg')) return 'ogg';
  if (normalized.includes('3gpp')) return '3gp';
  if (normalized.includes('aac')) return 'aac';
  return '';
}

function normalizeExtension(value = '') {
  return value.replace(/^\./, '').toLowerCase();
}

function resolveAudioExtension({ explicitExtension, originalName, mimeType, clientMimeType }) {
  const candidates = [
    normalizeExtension(explicitExtension || ''),
    normalizeExtension(path.extname(originalName || '')),
    extensionFromMimeType(clientMimeType),
    extensionFromMimeType(mimeType)
  ];

  return candidates.find(Boolean) || 'webm';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();
const uploadDir = path.join(rootDir, 'uploads');

await fs.mkdir(uploadDir, { recursive: true });

const app = express();
const upload = multer({ dest: uploadDir });
const port = process.env.PORT || 5000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_SESSION_TABLE = process.env.SUPABASE_SESSION_TABLE || 'conversation_turns';

if (!process.env.OPENAI_API_KEY) {
  console.warn('[upword] Warning: OPENAI_API_KEY is not set. /api/sessions will return 500.');
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Stripe webhook endpoint (must be before express.json() middleware)
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(500).json({ message: 'Stripe webhook not configured' });
    }

    const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('[upword] Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.userId;
      const tier = session.metadata.tier;

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
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[upword] Failed to update subscription:', errorText);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[upword] Webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

app.use(express.json());

// Stripe checkout endpoint (must be before express.static)
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { tier, userId } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing auth token' });
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

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ 
        message: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your .env file.' 
      });
    }

    // Import Stripe dynamically (will fail if not installed)
    let stripe;
    try {
      const stripeModule = await import('stripe');
      stripe = stripeModule.default(process.env.STRIPE_SECRET_KEY);
    } catch (importError) {
      console.error('[upword] Failed to import Stripe:', importError);
      return res.status(500).json({ 
        message: 'Stripe package not installed. Run: npm install stripe' 
      });
    }

    // Define tier pricing
    const tierPricing = {
      tier2: {
        priceId: process.env.STRIPE_TIER2_PRICE_ID || 'price_xxxxx', // Monthly $15
        mode: 'subscription'
      },
      tier3: {
        priceId: process.env.STRIPE_TIER3_PRICE_ID || 'price_xxxxx', // One-time $200
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
        message: `Price ID not configured for ${tier}. Please check your .env file.` 
      });
    }

    console.log('[upword] Creating Stripe checkout session for tier:', tier, 'Price ID:', pricing.priceId);

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
      success_url: `${req.headers.origin || 'http://localhost:5000'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'http://localhost:5000'}/select-tier?canceled=true`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        tier: tier
      }
    });

    res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('[upword] Stripe checkout error:', error);
    console.error('[upword] Error stack:', error.stack);
    console.error('[upword] Error code:', error.code);
    console.error('[upword] Error type:', error.type);
    
    if (error.code === 'MODULE_NOT_FOUND') {
      return res.status(500).json({ 
        message: 'Stripe package not installed. Run: npm install stripe' 
      });
    }
    
    // Log more details for debugging
    const errorDetails = {
      message: error.message,
      code: error.code,
      type: error.type,
      statusCode: error.statusCode
    };
    
    console.error('[upword] Full error details:', JSON.stringify(errorDetails, null, 2));
    
    res.status(500).json({ 
      message: 'Failed to create checkout session',
      details: error.message || 'Unknown error',
      code: error.code
    });
  }
});

// Serve favicon explicitly BEFORE static middleware to ensure no-cache headers
// Browsers often request /favicon.ico, so handle both
app.get('/favicon.png', (req, res) => {
  const faviconPath = path.join(rootDir, 'favicon.png');
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(faviconPath);
});

app.get('/favicon.ico', (req, res) => {
  // Serve PNG as ICO for browsers that request favicon.ico
  const faviconPath = path.join(rootDir, 'favicon.png');
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(faviconPath);
});

app.use(express.static(rootDir));

async function storeSessionTurn(payload) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_SESSION_TABLE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        ...payload,
        created_at: new Date().toISOString(),
        expires_at: expiresAt
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[upword] Failed to persist session turn to Supabase:', errorText);
    }
  } catch (error) {
    console.warn('[upword] Error storing session turn in Supabase:', error);
  }
}

app.post('/api/sessions', upload.single('audio'), async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ message: 'OPENAI_API_KEY is not configured on the server.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Audio file is required.' });
  }

  const {
    goal = 'general conversation',
    rawGoal = '',
    customGoal = '',
    duration = 3
  } = req.body;
  const audioPath = req.file.path;
  const serverMimeType = req.file.mimetype;
  const originalName = req.file.originalname;
  const clientMimeType = req.body?.mimeType;
  const explicitExtension = req.body?.fileExtension;
  const resolvedExtension = resolveAudioExtension({
    explicitExtension,
    originalName,
    mimeType: serverMimeType,
    clientMimeType
  });
  let finalAudioPath = audioPath;

  try {
    if (resolvedExtension && !audioPath.endsWith(`.${resolvedExtension}`)) {
      const renamedPath = `${audioPath}.${resolvedExtension}`;
      try {
        await fs.rename(audioPath, renamedPath);
        finalAudioPath = renamedPath;
      } catch (renameError) {
        console.warn('[upword] Unable to append audio extension hint:', renameError);
        finalAudioPath = audioPath;
      }
    }

    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: createReadStream(finalAudioPath),
      model: 'gpt-4o-transcribe',
      response_format: 'text'
    });

    const transcript = transcriptionResponse?.trim?.() || '';

    const analysisResponse = await openai.responses.create({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content:
            'You are a confident, empathetic conversation coach. Adapt your tone and style to the user\'s stated conversation goal. If the goal is romantic, keep the flirtatious warmth; if it is professional, be polished and encouraging; if it is custom, mirror the intent provided. Respond strictly with valid JSON that follows the provided schema. Rating is an integer 1-100 reflecting how well the user matched the desired tone, confidence, and goal. Fixes are concise bullet-style strings highlighting improvements around tonality, word choice, pacing, pauses, stutters, etc.'
        },
        {
          role: 'user',
          content: `Conversation goal: ${goal}\nRaw goal value: ${rawGoal}\nCustom goal description: ${customGoal}\nDuration: ${duration} minutes\nTranscript:\n${transcript}`
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'conversation_turn',
          schema: {
            type: 'object',
            properties: {
              response: { type: 'string' },
              rating: {
                type: 'integer',
                minimum: 1,
                maximum: 100
              },
              fixes: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1
              }
            },
            required: ['response', 'rating', 'fixes'],
            additionalProperties: false
          }
        }
      }
    });

    let turnFeedback = null;
    const outputs = Array.isArray(analysisResponse.output) ? analysisResponse.output : [];

    for (const output of outputs) {
      const parts = Array.isArray(output?.content) ? output.content : [];
      for (const part of parts) {
        if (part?.json && typeof part.json === 'object') {
          turnFeedback = part.json;
          break;
        }
        if (typeof part?.text === 'string') {
          try {
            turnFeedback = JSON.parse(part.text);
            break;
          } catch (parseError) {
            // continue looking
          }
        }
      }
      if (turnFeedback) break;
    }

    if (!turnFeedback && typeof analysisResponse.output_text === 'string') {
      try {
        turnFeedback = JSON.parse(analysisResponse.output_text);
      } catch (parseError) {
        console.warn('[upword] Unable to parse output_text as JSON:', parseError);
      }
    }

    if (!turnFeedback) {
      console.error('[upword] Unexpected analysis response shape:', JSON.stringify(analysisResponse, null, 2));
      throw new Error('Unable to parse analysis response from OpenAI.');
    }

    await storeSessionTurn({
      transcript,
      rawGoal,
      customGoal,
      goal,
      duration: Number(duration) || 0,
      response: turnFeedback.response,
      rating: turnFeedback.rating,
      fixes: turnFeedback.fixes
    });

    res.json({
      transcript,
      response: turnFeedback.response,
      rating: turnFeedback.rating,
      fixes: turnFeedback.fixes,
      rawGoal,
      customGoal,
      goal,
      duration: Number(duration) || 0
    });
  } catch (error) {
    const rawDetails = error?.response?.data || error.message || 'Unknown error';
    const detailsString = typeof rawDetails === 'string' ? rawDetails : JSON.stringify(rawDetails);
    const statusCode = error?.response?.status === 400 ? 400 : 500;
    const message =
      statusCode === 400
        ? 'Unsupported audio format. Please try recording in a browser that produces WebM/Opus or M4A audio.'
        : 'Failed to analyze conversation.';
    console.error('[upword] Session processing error:', detailsString, error);
    res.status(statusCode).json({ message, details: detailsString });
  } finally {
    await fs.unlink(finalAudioPath).catch(() => {});
  }
});


// Route handlers for clean URLs (without .html)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(rootDir, 'dashboard.html'));
});

app.get('/auth', (req, res) => {
  res.sendFile(path.join(rootDir, 'auth.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(rootDir, 'signup.html'));
});

app.get('/select-tier', (req, res) => {
  res.sendFile(path.join(rootDir, 'select-tier.html'));
});

app.get('/account', (req, res) => {
  res.sendFile(path.join(rootDir, 'account.html'));
});

// Catch-all route for SPA (must be last)
app.get('*', (req, res) => {
  // Don't catch favicon requests
  if (req.path.includes('favicon')) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`[upword] Server listening on http://localhost:${port}`);
});
