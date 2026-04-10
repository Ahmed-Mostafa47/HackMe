-- ====================================================
-- DB-only labs migration
-- - Adds missing labs columns for UI/runtime fields
-- - Creates persistent lab_resource_usage table
-- - Seeds labs + challenges + testcases + hints + solutions
-- ====================================================

USE ctf_platform;

-- 1) Schema updates
SET @db := DATABASE();

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db
        AND TABLE_NAME = 'labs'
        AND COLUMN_NAME = 'solution'
    ),
    'SELECT 1',
    'ALTER TABLE labs ADD COLUMN solution LONGTEXT NULL AFTER description'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db
        AND TABLE_NAME = 'labs'
        AND COLUMN_NAME = 'icon'
    ),
    'SELECT 1',
    'ALTER TABLE labs ADD COLUMN icon VARCHAR(16) NULL AFTER solution'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db
        AND TABLE_NAME = 'labs'
        AND COLUMN_NAME = 'port'
    ),
    'SELECT 1',
    'ALTER TABLE labs ADD COLUMN port INT NULL AFTER icon'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = @db
        AND TABLE_NAME = 'labs'
        AND COLUMN_NAME = 'launch_path'
    ),
    'SELECT 1',
    'ALTER TABLE labs ADD COLUMN launch_path VARCHAR(255) NULL AFTER port'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS lab_resource_usage (
  usage_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  lab_id INT NOT NULL,
  hint_viewed TINYINT(1) NOT NULL DEFAULT 0,
  solution_viewed TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_lab (user_id, lab_id),
  CONSTRAINT fk_usage_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_usage_lab FOREIGN KEY (lab_id) REFERENCES labs(lab_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Base lookup data
INSERT IGNORE INTO lab_types (labtype_id, name, description) VALUES
(1, 'WHITE_BOX', 'White Box Testing Labs'),
(2, 'BLACK_BOX', 'Black Box Testing Labs'),
(3, 'ACCESS_CONTROL', 'Access Control & Privilege Escalation');

INSERT INTO users (username, email, password_hash, full_name, profile_meta)
SELECT 'system_labs', 'system_labs@ctf.local', '', 'System Labs', '{}'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1);

SET @creator = (SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1);

-- 3) Labs
INSERT INTO labs (
  lab_id, title, description, solution, icon, port, launch_path,
  labtype_id, difficulty, points_total, created_by, is_published, visibility, docker_image, reset_interval
)
VALUES
(1, 'SQL Injection Source Analysis',
 'Analyze vulnerable PHP source code to identify and exploit SQL injection points with full code access.',
 'The vulnerable login query is injectable through user-controlled input. Use a boolean-based SQL injection payload in the username field to bypass authentication, then enumerate data with a UNION-based payload.',
 '💉', 4000, '/',
 2, 'medium', 150, @creator, 1, 'public', 'cyberops/sql-injection-whitebox', 3600),

(2, 'Buffer Overflow Code Review',
 'Review C source code to identify buffer overflow vulnerabilities and develop exploits.',
 'Identify the unsafe copy operation and calculate the overwrite offset. Craft input that controls execution flow and trigger the target behavior safely.',
 '💥', 4000, '/',
 2, 'hard', 250, @creator, 1, 'public', 'cyberops/buffer-overflow-whitebox', 3600),

(3, 'Blind SQL Injection',
 'Exploit SQL injection vulnerabilities without source code access using blind techniques.',
 'Use time-based blind SQL injection payloads with conditional delays to infer true/false states and extract data progressively.',
 '🎯', 4000, '/',
 2, 'medium', 200, @creator, 1, 'public', 'cyberops/blind-sql-blackbox', 3600),

(4, 'XSS Black Box Detection',
 'Discover and exploit Cross-Site Scripting vulnerabilities through external testing.',
 'Find reflected user input and craft a context-appropriate XSS payload so JavaScript executes in the browser.',
 '⚡', 4000, '/',
 2, 'easy', 100, @creator, 1, 'public', 'cyberops/xss-blackbox', 3600),

(5, 'Reflected XSS Blog Lab',
 'Exploit a reflected XSS vulnerability in a blog search feature.',
 'Inject a reflected payload through the search parameter so it is rendered unsafely, then execute JavaScript to trigger alert().',
 '⚡', 4001, '/',
 2, 'medium', 100, @creator, 1, 'public', 'cyberops/xss-reflected-blog', 3600),

(7, 'DOM XSS Document Write Lab',
 'DOM-based XSS in a search flow where user input is written via innerHTML.',
 'Inject a payload with an executable event handler (for example an image error handler) to execute alert and complete the lab.',
 '⚡', 4002, '/',
 2, 'easy', 100, @creator, 1, 'public', 'cyberops/xss-dom-lab', 3600),

(8, 'Access Control Bypass',
 'Test role-based access control by bypassing restrictions and escalating privileges.',
 'Locate an endpoint protected only client-side or with weak server checks, then access it directly to retrieve the protected flag.',
 '🔐', 4003, '/lab/1',
 3, 'medium', 100, @creator, 1, 'public', 'cyberops/access-control-lab', 3600),

(9, 'IDOR and Horizontal Access',
 'Find and exploit insecure direct object reference and horizontal access control flaws.',
 'Modify object identifiers in requests to access another user records where ownership checks are missing.',
 '🔐', 4003, '/lab/2',
 3, 'medium', 120, @creator, 1, 'public', 'cyberops/idor-lab', 3600)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  solution = VALUES(solution),
  icon = VALUES(icon),
  port = VALUES(port),
  launch_path = VALUES(launch_path),
  labtype_id = VALUES(labtype_id),
  difficulty = VALUES(difficulty),
  points_total = VALUES(points_total),
  is_published = VALUES(is_published),
  visibility = VALUES(visibility),
  docker_image = VALUES(docker_image),
  reset_interval = VALUES(reset_interval);

-- 4) Challenges + testcases
INSERT INTO challenges (challenge_id, lab_id, created_by, title, statement, order_index, max_score, difficulty, is_active)
VALUES
(201, 1, @creator, 'AUTHENTICATION_BYPASS', 'Bypass login using SQL injection in authentication flow.', 1, 150, 'medium', 1),
(202, 2, @creator, 'BUFFER_OVERFLOW_EXPLOIT', 'Identify and exploit the overflow point to control execution.', 1, 250, 'hard', 1),
(203, 3, @creator, 'BLIND_TIME_BASED_SQLI', 'Extract data using timing differences.', 1, 200, 'medium', 1),
(204, 4, @creator, 'XSS_BLACKBOX', 'Discover reflected XSS in the target surface.', 1, 100, 'easy', 1),
(205, 5, @creator, 'REFLECTED_XSS', 'Execute JavaScript via reflected input.', 1, 100, 'medium', 1),
(207, 7, @creator, 'DOM_XSS', 'Execute JavaScript via DOM sink.', 1, 100, 'easy', 1),
(208, 8, @creator, 'ACCESS_CONTROL_BYPASS', 'Bypass role restrictions to access admin feature.', 1, 100, 'medium', 1),
(209, 9, @creator, 'IDOR_BYPASS', 'Exploit IDOR for unauthorized access.', 1, 120, 'medium', 1)
ON DUPLICATE KEY UPDATE
  statement = VALUES(statement),
  max_score = VALUES(max_score),
  difficulty = VALUES(difficulty),
  is_active = VALUES(is_active);

INSERT INTO testcases (testcase_id, challenge_id, secret_flag_hash, secret_flag_plain, points, active, type)
VALUES
(201, 201, 'FLAG{AUTH_BYPASS_123}', 'FLAG{AUTH_BYPASS_123}', 150, 1, 'flag_match'),
(202, 202, 'FLAG{BOF_EXPLOIT_222}', 'FLAG{BOF_EXPLOIT_222}', 250, 1, 'flag_match'),
(203, 203, 'FLAG{BLIND_SQLI_789}', 'FLAG{BLIND_SQLI_789}', 200, 1, 'flag_match'),
(204, 204, 'FLAG{XSS_BLACKBOX_444}', 'FLAG{XSS_BLACKBOX_444}', 100, 1, 'flag_match'),
(205, 205, 'FLAG{XSS_REFLECTED_111}', 'FLAG{XSS_REFLECTED_111}', 100, 1, 'flag_match'),
(207, 207, 'FLAG{DOM_XSS_333}', 'FLAG{DOM_XSS_333}', 100, 1, 'flag_match'),
(208, 208, 'FLAG{UNPROTECTED_ADMIN_PANEL}', 'FLAG{UNPROTECTED_ADMIN_PANEL}', 100, 1, 'flag_match'),
(209, 209, 'FLAG{IDOR_ACCESS_CONTROL_BYPASS}', 'FLAG{IDOR_ACCESS_CONTROL_BYPASS}', 120, 1, 'flag_match')
ON DUPLICATE KEY UPDATE
  secret_flag_hash = VALUES(secret_flag_hash),
  secret_flag_plain = VALUES(secret_flag_plain),
  points = VALUES(points),
  active = 1;

-- 5) Hints (two per lab)
DELETE FROM hints WHERE challenge_id IN (201, 202, 203, 204, 205, 207, 208, 209);

INSERT INTO hints (challenge_id, text, penalty_points)
VALUES
(201, 'Inspect authentication inputs for injectable query fragments.', 0),
(201, 'Try boolean-based payloads to force login success.', 0),
(202, 'Trace where fixed-size buffers receive untrusted data.', 0),
(202, 'Check unsafe copy routines and overwrite offsets.', 0),
(203, 'Use response timing to infer true/false conditions.', 0),
(203, 'Extract data one character at a time with conditional delays.', 0),
(204, 'Probe reflected parameters first and observe rendering context.', 0),
(204, 'Use payloads valid for attributes and text contexts.', 0),
(205, 'Target the blog search parameter and test reflected payloads.', 0),
(205, 'Try a payload that directly calls alert().', 0),
(207, 'Inspect client-side sinks receiving URL/search input.', 0),
(207, 'Use event-handler payloads; script tags may not execute in innerHTML.', 0),
(208, 'Enumerate restricted endpoints and compare roles.', 0),
(208, 'Verify authorization on the server side, not only in UI.', 0),
(209, 'Look for object IDs in URLs or API requests.', 0),
(209, 'Switch identifiers to another user and test ownership checks.', 0);
