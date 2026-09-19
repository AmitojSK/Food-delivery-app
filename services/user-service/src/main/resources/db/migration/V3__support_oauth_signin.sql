-- OAuth (Google) sign-in support. OAuth users have no password and Google does
-- not supply a phone number, so both become optional. UNIQUE still holds because
-- MySQL allows multiple NULLs in a unique column. auth_provider records how the
-- account authenticates; existing rows are LOCAL.
ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(100) NULL;
ALTER TABLE users MODIFY COLUMN phone_number VARCHAR(20) NULL;
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL';
