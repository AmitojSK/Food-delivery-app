-- Extensible social sign-in: record which external identity an account maps to.
-- provider_id is the provider's stable user id (Google "sub", GitHub numeric id);
-- it is NULL for LOCAL accounts and for GOOGLE accounts created before this column
-- existed (those get backfilled on their next sign-in). The unique constraint keeps
-- one user per social identity; MySQL permits multiple NULLs, so LOCAL rows are fine.
ALTER TABLE users ADD COLUMN provider_id VARCHAR(191) NULL;
ALTER TABLE users ADD CONSTRAINT uk_users_provider UNIQUE (auth_provider, provider_id);
