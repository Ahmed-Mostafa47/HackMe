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
SELECT 1, 'SQL_INJECTION_WHITEBOX', 'White-box: review vulnerable login source, submit file/line/fix; validated with php -l + parameterized-query rules. Unlimited wrong attempts; one graded solve per user.', 1, 'medium', 150, @creator, 1, 'public', 'cyberops/sql-injection-whitebox', 3600
UNION ALL SELECT 5, 'ACCESS_CONTROL_BYPASS', 'Test role-based access control: bypass restrictions and escalate privileges', 3, 'medium', 100, @creator, 1, 'public', 'cyberops/access-control-lab', 3600
UNION ALL SELECT 10, 'SQL_INJECTION_ACADEMY', 'Exploit SQL injection on a programming academy site: use sqlmap to find tables and users, get admin email, login and delete a user', 2, 'medium', 150, @creator, 1, 'public', '', 3600
UNION ALL SELECT 18, 'Access Control Bypass', 'Broken access control (white-box): bypass authorization via session/role; capture FLAG{ACCESS_CONTROL_WHITEBOX_18}.', 1, 'medium', 100, @creator, 1, 'public', 'cyberops/access-control-lab', 3600
UNION ALL SELECT 19, 'ACCESS_CONTROL_WHITEBOX_19', 'Access control (WHITE_BOX listing): IDOR / horizontal access; capture FLAG{ACCESS_CONTROL_WHITEBOX_19}.', 1, 'medium', 100, @creator, 1, 'public', 'cyberops/access-control-lab', 3600
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), labtype_id = VALUES(labtype_id), difficulty = VALUES(difficulty), points_total = VALUES(points_total);

-- 4. Challenges (linked to labs)
INSERT IGNORE INTO challenges (challenge_id, lab_id, created_by, title, statement, order_index, max_score, difficulty, is_active, whitebox_files_ref)
VALUES
(1, 1, @creator, 'SECURE_LOGIN_ENDPOINT', 'Identify the SQL injection in api/login.php and replace the vulnerable query with prepared statements.', 1, 50, 'medium', 1, '{"version":1,"verify_profile":"lab1_sqli_login","files":[{"id":"login","display_name":"login.php","relative_path":"api/login.php","vulnerable_line":10}]}'),
(2, 1, @creator, 'DATA_EXFILTRATION', 'Extract user data via UNION injection', 2, 100, 'hard', 1, NULL),
(6, 5, @creator, 'UNPROTECTED_ADMIN_PANEL', 'Access the admin panel without authorization', 1, 50, 'medium', 1, NULL),
(8, 10, @creator, 'ACADEMY_SQLI_DELETED', 'Use SQL injection to access admin and delete a user', 1, 150, 'medium', 1, NULL),
(318, 18, @creator, 'ACCESS_CONTROL_18', 'White-box: remove role-from-URL assignment and add a server-side admin gate before ADMIN_PANEL.', 1, 100, 'medium', 1, '{"version":1,"verify_profile":"lab18_admin_role_request","files":[{"id":"admin_panel","display_name":"admin_panel.php","relative_path":"public/admin_panel.php","vulnerable_line":4}]}'),
(319, 19, @creator, 'ACCESS_CONTROL_19', 'Solve the access-control challenge and submit the flag.', 1, 100, 'medium', 1, NULL);

-- Testcases (flags) - use ON DUPLICATE to fix flags even if rows exist
INSERT INTO testcases (testcase_id, challenge_id, secret_flag_hash, secret_flag_plain, points, active, type)
VALUES
(1, 1, 'FLAG{AUTH_BYPASS_123}', 'FLAG{AUTH_BYPASS_123}', 50, 1, 'flag_match'),
(2, 2, 'FLAG{DATA_EXFIL_456}', 'FLAG{DATA_EXFIL_456}', 100, 1, 'flag_match'),
(6, 6, 'FLAG{UNPROTECTED_ADMIN_PANEL}', 'FLAG{UNPROTECTED_ADMIN_PANEL}', 50, 1, 'flag_match'),
(8, 8, 'FLAG{ACADEMY_SQLI_DELETED}', 'FLAG{ACADEMY_SQLI_DELETED}', 150, 1, 'flag_match'),
(318, 318, 'FLAG{ACCESS_CONTROL_WHITEBOX_18}', 'FLAG{ACCESS_CONTROL_WHITEBOX_18}', 100, 1, 'flag_match'),
(319, 319, 'FLAG{ACCESS_CONTROL_WHITEBOX_19}', 'FLAG{ACCESS_CONTROL_WHITEBOX_19}', 100, 1, 'flag_match')
ON DUPLICATE KEY UPDATE secret_flag_hash = VALUES(secret_flag_hash), secret_flag_plain = VALUES(secret_flag_plain), points = VALUES(points), active = 1;
