# Sationly – AI-Powered Conversation Practice

Sationly helps people overcome social anxiety by offering an AI-guided practice environment. Users can record their conversations, receive tailored feedback, and track their growth over time.

## Features

- 🎯 **Goal-based practice** – Choose social scenarios and duration for each session
- 🎙️ **Real audio capture** – Browser microphone recording with AI analysis
- 🤖 **OpenAI analysis** – Audio transcribed and scored with personalized feedback
- 📊 **Progress tracking** – Session history, stats, and streak tracking
- 💳 **Tiered subscriptions** – Free tier with limits, paid tiers for unlimited access
- ⏱️ **Environment timer** – Auto-ends sessions at selected duration
- 🔒 **Session limits** – Tier 1 users get 3 sessions per week

## Tech Stack

- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Node.js, Express (local) / Vercel Serverless Functions (production)
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **AI**: OpenAI GPT-4o Transcribe, GPT-4.1-mini

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp env.example .env
# Add your keys to .env

# Start server
npm start
```

Visit **http://localhost:5000**

### Deployment

See `VERCEL_DEPLOYMENT_GUIDE.md` for complete deployment instructions.

## Documentation

- **VERCEL_DEPLOYMENT_GUIDE.md** - How to deploy to Vercel
- **STRIPE_SETUP_GUIDE.md** - Stripe payment integration setup
- **WEBHOOK_SETUP_INSTRUCTIONS.md** - Stripe webhook configuration

## Database Setup

Run these SQL files in Supabase (in order):
1. `01_setup_profiles.sql`
2. `02_setup_subscriptions.sql`
3. `03_setup_conversation_turns.sql`
4. `04_add_profile_columns.sql`
5. `05_setup_environments.sql`

Or run `00_SETUP_ALL.sql` to set up everything at once.

## Environment Variables

See `env.example` for all required variables:
- OpenAI API key
- Supabase credentials
- Stripe keys and price IDs
- Stripe webhook secret

## License

See LICENSE file for details.
