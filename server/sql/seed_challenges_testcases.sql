-- ====================================================
-- Seed challenges and testcases for flag validation
-- Run this so submit_flag API can validate flags
-- ====================================================

USE ctf_platform;

-- 1. Ensure at least one user exists (for created_by FK)
--    If users table is empty, insert a system user
INSERT INTO users (username, email, password_hash, full_name, profile_meta)
SELECT 'system_labs', 'system_labs@ctf.local', '', 'System Labs', '{}'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1);

-- 2. Ensure lab_types exist
INSERT IGNORE INTO lab_types (labtype_id, name, description) VALUES
(1, 'WHITE_BOX', 'White Box Testing Labs'),
(2, 'BLACK_BOX', 'Black Box Testing Labs'),
(3, 'ACCESS_CONTROL', 'Access Control & Privilege Escalation');

-- 3. Insert Labs (use first existing user as created_by)
SET @creator = (SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1);

INSERT INTO labs (lab_id, title, description, labtype_id, difficulty, points_total, created_by, is_published, visibility, docker_image, reset_interval)
SELECT 1, 'SQL_INJECTION_SOURCE_ANALYSIS', 'Analyze vulnerable PHP source code to identify and exploit SQL injection points with full code access', 1, 'medium', 150, @creator, 1, 'public', 'cyberops/sql-injection-whitebox', 3600
UNION ALL SELECT 2, 'BUFFER_OVERFLOW_CODE_REVIEW', 'Review C source code to identify buffer overflow vulnerabilities and develop exploits', 1, 'hard', 250, @creator, 1, 'public', 'cyberops/buffer-overflow-whitebox', 3600
UNION ALL SELECT 3, 'BLIND_SQL_INJECTION', 'Exploit SQL injection vulnerabilities without source code access using blind techniques', 2, 'medium', 200, @creator, 1, 'public', 'cyberops/blind-sql-blackbox', 3600
UNION ALL SELECT 4, 'XSS_BLACK_BOX_DETECTION', 'Discover and exploit Cross-Site Scripting vulnerabilities through external testing', 2, 'easy', 100, @creator, 1, 'public', 'cyberops/xss-blackbox', 3600
UNION ALL SELECT 5, 'ACCESS_CONTROL_BYPASS', 'Test role-based access control: bypass restrictions and escalate privileges', 3, 'medium', 100, @creator, 1, 'public', 'cyberops/access-control-lab', 3600
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), difficulty = VALUES(difficulty), points_total = VALUES(points_total);

-- 4. Challenges (linked to labs)
INSERT IGNORE INTO challenges (challenge_id, lab_id, created_by, title, statement, order_index, max_score, difficulty, is_active)
VALUES
(1, 1, @creator, 'AUTHENTICATION_BYPASS', 'Bypass login using SQL injection', 1, 50, 'medium', 1),
(2, 1, @creator, 'DATA_EXFILTRATION', 'Extract user data via UNION injection', 2, 100, 'hard', 1),
(3, 3, @creator, 'BLIND_TIME_BASED_SQLI', 'Time-based blind SQL injection', 1, 150, 'hard', 1),
(4, 2, @creator, 'BUFFER_OVERFLOW_EXPLOIT', 'Exploit buffer overflow', 1, 100, 'hard', 1),
(5, 4, @creator, 'XSS_REFLECTED', 'Reflected XSS discovery', 1, 50, 'easy', 1),
(6, 5, @creator, 'UNPROTECTED_ADMIN_PANEL', 'Access the admin panel without authorization', 1, 50, 'medium', 1);

-- Testcases (flags) - use ON DUPLICATE to fix flags even if rows exist
INSERT INTO testcases (testcase_id, challenge_id, secret_flag_hash, secret_flag_plain, points, active, type)
VALUES
(1, 1, 'FLAG{AUTH_BYPASS_123}', 'FLAG{AUTH_BYPASS_123}', 50, 1, 'flag_match'),
(2, 2, 'FLAG{DATA_EXFIL_456}', 'FLAG{DATA_EXFIL_456}', 100, 1, 'flag_match'),
(3, 3, 'FLAG{BLIND_SQLI_789}', 'FLAG{BLIND_SQLI_789}', 150, 1, 'flag_match'),
(4, 4, 'FLAG{BOF_EXPLOIT_222}', 'FLAG{BOF_EXPLOIT_222}', 100, 1, 'flag_match'),
(5, 5, 'FLAG{XSS_REFLECTED_111}', 'FLAG{XSS_REFLECTED_111}', 50, 1, 'flag_match'),
(6, 6, 'FLAG{UNPROTECTED_ADMIN_PANEL}', 'FLAG{UNPROTECTED_ADMIN_PANEL}', 50, 1, 'flag_match')
ON DUPLICATE KEY UPDATE secret_flag_hash = VALUES(secret_flag_hash), secret_flag_plain = VALUES(secret_flag_plain), points = VALUES(points), active = 1;
