-- ============================================
-- ENVIRONMENTS TABLE SETUP
-- ============================================
-- This creates the table for tracking environment sessions.
-- An environment is created when a user starts a conversation practice session.
-- Each environment can contain multiple conversation turns.

-- Step 1: Create environments table
CREATE TABLE IF NOT EXISTS public.environments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal TEXT,
  raw_goal TEXT,
  custom_goal TEXT,
  duration INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  total_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days')
);

-- Step 2: Enable Row Level Security (RLS)
ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own environments" ON public.environments;
DROP POLICY IF EXISTS "Users can insert own environments" ON public.environments;
DROP POLICY IF EXISTS "Users can update own environments" ON public.environments;
DROP POLICY IF EXISTS "Service role can manage environments" ON public.environments;

-- Step 4: Create RLS policies
-- Users can read their own environments
CREATE POLICY "Users can view own environments"
ON public.environments
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own environments
CREATE POLICY "Users can insert own environments"
ON public.environments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own environments
CREATE POLICY "Users can update own environments"
ON public.environments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Service role (backend) can manage all environments
CREATE POLICY "Service role can manage environments"
ON public.environments
FOR ALL
USING (true)
WITH CHECK (true);

-- Step 5: Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_environments_user_id ON public.environments(user_id);
CREATE INDEX IF NOT EXISTS idx_environments_started_at ON public.environments(started_at);
CREATE INDEX IF NOT EXISTS idx_environments_expires_at ON public.environments(expires_at);

-- Step 6: Add environment_id column to conversation_turns (optional, for linking)
-- This allows us to link conversation turns to their parent environment
ALTER TABLE public.conversation_turns 
ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES public.environments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_turns_environment_id ON public.conversation_turns(environment_id);

-- Success! Environments table is now set up.
-- Records will expire after 14 days (set expires_at when inserting).

