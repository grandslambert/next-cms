-- Template for creating a new user
-- Replace the values with your desired user information

-- Note: Password must be hashed using bcrypt
-- Run: node scripts/hash-password.js your-password
-- Then copy the hash below

USE zimmhost_roadside;

INSERT INTO users (username, first_name, last_name, email, password, role) 
VALUES (
  'john_doe',                                     -- Username (unique, no spaces)
  'John',                                         -- First name
  'Doe',                                          -- Last name (optional)
  'john@example.com',                             -- Email (unique)
  '$2a$10$REPLACE_WITH_HASHED_PASSWORD',          -- Hashed password
  'author'                                        -- Role: admin, editor, or author
);

-- Check if the user was created
SELECT id, username, first_name, last_name, email, role, created_at 
FROM users 
WHERE email = 'john@example.com';

