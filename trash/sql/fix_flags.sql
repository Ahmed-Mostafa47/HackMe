-- ====================================================
-- Fix flags in testcases - run this if submit says INVALID_FLAG
-- This updates existing testcases with correct flag values
-- ====================================================

USE ctf_platform;

-- Update testcases by challenge_id (matches seed_challenges_testcases)
UPDATE testcases SET secret_flag_plain = 'FLAG{AUTH_BYPASS_123}', secret_flag_hash = 'FLAG{AUTH_BYPASS_123}', points = 50, active = 1 WHERE challenge_id = 1;
UPDATE testcases SET secret_flag_plain = 'FLAG{DATA_EXFIL_456}', secret_flag_hash = 'FLAG{DATA_EXFIL_456}', points = 100, active = 1 WHERE challenge_id = 2;
UPDATE testcases SET secret_flag_plain = 'FLAG{BLIND_SQLI_789}', secret_flag_hash = 'FLAG{BLIND_SQLI_789}', points = 150, active = 1 WHERE challenge_id = 3;
UPDATE testcases SET secret_flag_plain = 'FLAG{BOF_EXPLOIT_222}', secret_flag_hash = 'FLAG{BOF_EXPLOIT_222}', points = 100, active = 1 WHERE challenge_id = 4;
UPDATE testcases SET secret_flag_plain = 'FLAG{XSS_REFLECTED_111}', secret_flag_hash = 'FLAG{XSS_REFLECTED_111}', points = 50, active = 1 WHERE challenge_id = 5;
UPDATE testcases SET secret_flag_plain = 'FLAG{UNPROTECTED_ADMIN_PANEL}', secret_flag_hash = 'FLAG{UNPROTECTED_ADMIN_PANEL}', points = 50, active = 1 WHERE challenge_id = 6;
