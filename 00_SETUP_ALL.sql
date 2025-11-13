-- ============================================
-- COMPLETE DATABASE SETUP
-- ============================================
-- Run this file to set up all tables at once.
-- Or run the individual files (01, 02, 03) separately.

-- Run profiles setup
\i 01_setup_profiles.sql

-- Run subscriptions setup
\i 02_setup_subscriptions.sql

-- Run conversation turns setup
\i 03_setup_conversation_turns.sql

-- Note: If \i doesn't work in Supabase SQL Editor, 
-- copy and paste each file's contents separately.

