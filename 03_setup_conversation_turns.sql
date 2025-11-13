-- ============================================
-- CONVERSATION TURNS TABLE SETUP
-- ============================================
-- This creates the table for storing conversation analysis data.
-- Data auto-expires after 14 days.

-- Step 1: Create conversation_turns table
CREATE TABLE IF NOT EXISTS public.conversation_turns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  response TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 100),
  fixes TEXT[] NOT NULL,
  goal TEXT,
  raw_goal TEXT,
  custom_goal TEXT,
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Step 2: Enable Row Level Security (RLS)
ALTER TABLE public.conversation_turns ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own conversation turns" ON public.conversation_turns;
DROP POLICY IF EXISTS "Users can insert own conversation turns" ON public.conversation_turns;
DROP POLICY IF EXISTS "Service role can manage conversation turns" ON public.conversation_turns;

-- Step 4: Create RLS policies
-- Users can read their own conversation turns
CREATE POLICY "Users can view own conversation turns"
ON public.conversation_turns
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own conversation turns
CREATE POLICY "Users can insert own conversation turns"
ON public.conversation_turns
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role (backend) can manage all conversation turns
CREATE POLICY "Service role can manage conversation turns"
ON public.conversation_turns
FOR ALL
USING (true)
WITH CHECK (true);

-- Step 5: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_conversation_turns_user_id ON public.conversation_turns(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_turns_expires_at ON public.conversation_turns(expires_at);

-- Step 6: Create function to auto-delete expired records (optional - can be run via cron)
CREATE OR REPLACE FUNCTION public.delete_expired_conversation_turns()
RETURNS void AS $$
BEGIN
  DELETE FROM public.conversation_turns
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Success! Conversation turns table is now set up.
-- Records will expire after 14 days (set expires_at when inserting).

