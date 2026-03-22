-- =============================================================================
-- Migration 009: User Profile Fields
-- =============================================================================
-- Adds avatar and social media link columns to the users table
-- =============================================================================

-- Avatar (base64 data URI or external URL)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Social media links
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS website_url TEXT;
