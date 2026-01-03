-- Migration script to update all users with rank RECRUIT to USER
-- Run this script to update existing users in the database

USE ctf_platform;

-- Update all users where profile_meta contains rank 'RECRUIT' to 'USER'
-- Note: Added user_id > 0 to satisfy MySQL safe update mode requirement
UPDATE users
SET profile_meta = JSON_SET(
    profile_meta,
    '$.rank', 'USER'
)
WHERE (JSON_EXTRACT(profile_meta, '$.rank') = 'RECRUIT'
   OR JSON_EXTRACT(profile_meta, '$.rank') = 'recruit')
   AND user_id > 0;

-- Verify the update (optional - shows count of updated records)
-- SELECT COUNT(*) as updated_users
-- FROM users
-- WHERE JSON_EXTRACT(profile_meta, '$.rank') = 'USER';

