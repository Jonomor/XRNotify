-- =============================================================================
-- XRNotify - PostgreSQL Initialization Script
-- =============================================================================
-- This script runs once when the PostgreSQL container is first created.
-- It sets up required extensions and default configurations.
-- 
-- NOTE: Schema migrations are handled separately by the application.
-- This script only handles Docker-specific initialization.
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Trigram matching for search

-- Set default timezone to UTC
ALTER DATABASE xrnotify SET timezone TO 'UTC';

-- Create schema for application tables (optional, using public by default)
-- CREATE SCHEMA IF NOT EXISTS xrnotify;

-- Grant permissions (the xrnotify user is created by POSTGRES_USER env var)
-- These are redundant since xrnotify owns the database, but explicit for clarity
GRANT ALL PRIVILEGES ON DATABASE xrnotify TO xrnotify;

-- Log initialization complete
DO $$
BEGIN
  RAISE NOTICE 'XRNotify database initialized successfully';
  RAISE NOTICE 'Extensions enabled: uuid-ossp, pgcrypto, pg_trgm';
  RAISE NOTICE 'Timezone set to: UTC';
END $$;
