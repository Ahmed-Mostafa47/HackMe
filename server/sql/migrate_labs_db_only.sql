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
(3, 'ACCESS_CONTROL', 'Access Control & Privilege Escalation'),
(4, 'GAMES', 'Gamified Cybersecurity Labs');

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
 3, 'medium', 120, @creator, 1, 'public', 'cyberops/idor-lab', 3600),

(18, 'Access Control Bypass',
 'Broken access control (white-box): bypass authorization via session/role; capture FLAG{ACCESS_CONTROL_WHITEBOX_18}.',
 'Enumerate privileged routes and weak server-side checks; submit the flag in HackMe after solving the container lab.',
 '🔓', 4003, '/lab/1',
 1, 'medium', 100, @creator, 1, 'public', 'cyberops/access-control-lab', 3600),

(19, 'IDOR (White-box)',
 'White-box: profile follows user_id in the URL — patch sources to bind access to the session user and block horizontal access.',
 'Manipulate object identifiers and role boundaries; submit the flag in HackMe after solving the container lab.',
 '🔓', 4003, '/lab/2',
 1, 'medium', 100, @creator, 1, 'public', 'cyberops/access-control-lab', 3600),

(20, 'Reflected XSS (White-box)',
 'White-box reflected XSS: inspect vulnerable source, test payloads in isolated sandbox, and patch secure output encoding.',
 'Render untrusted reflected input with strict context-aware encoding (e.g., htmlspecialchars ENT_QUOTES UTF-8).',
 '⚡', 4001, '/',
 1, 'medium', 100, @creator, 1, 'public', 'cyberops/xss-reflected-whitebox', 3600),

(21, 'DOM XSS (White-box)',
 'White-box DOM XSS: inspect JavaScript sink and replace unsafe DOM injection with safe text rendering.',
 'Remove innerHTML sink for untrusted input and use textContent/createTextNode instead.',
 '⚡', 4002, '/',
 1, 'medium', 100, @creator, 1, 'public', 'cyberops/xss-dom-whitebox', 3600)
, 
(30, 'War game',
 'Game labs: complete a wargame-style challenge and submit the flag.',
 'Follow the objective in the lab and submit the correct flag to complete the challenge.',
 '🎮', 4005, '/',
 2, 'medium', 100, @creator, 1, 'public', 'cyberops/war-game', 3600)
,
(40, 'Hack The Sudoku',
 'Hack this intentionally vulnerable Sudoku game by exploiting client-side logic, hidden functions, or API secrets. The goal is to bypass validation and trigger a win state without solving the puzzle normally.',
 'The solution is not in the grid itself. Inspect browser storage, JavaScript runtime, and hidden backend API endpoints. There are multiple ways to win.',
 '🎮', 4011, '/',
 2, 'medium', 150, @creator, 1, 'public', 'cyberops/hack-the-sudoku', 3600)
,
(41, 'Frogger',
 'Frogger challenge: your goal is to win by crossing the road safely. To make that possible, use DevTools to modify runtime game settings.',
 'Inspect browser runtime values and override game variables (speed, lives, collision checks) from DevTools to complete the challenge.',
 '🐸', 4010, '/',
 2, 'hard', 200, @creator, 1, 'public', 'cyberops/frogger-game', 3600)
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
(205, 5, @creator, 'REFLECTED_XSS', 'Execute JavaScript via reflected input.', 1, 100, 'medium', 1),
(207, 7, @creator, 'DOM_XSS', 'Execute JavaScript via DOM sink.', 1, 100, 'easy', 1),
(208, 8, @creator, 'ACCESS_CONTROL_BYPASS', 'Bypass role restrictions to access admin feature.', 1, 100, 'medium', 1),
(209, 9, @creator, 'IDOR_BYPASS', 'Exploit IDOR for unauthorized access.', 1, 120, 'medium', 1),
(318, 18, @creator, 'ACCESS_CONTROL_18', 'White-box: remove role-from-URL assignment and add a server-side admin gate before ADMIN_PANEL.', 1, 100, 'medium', 1),
(319, 19, @creator, 'ACCESS_CONTROL_19', 'White-box: remove IDOR via user_id in URL; bind profile to session viewer + 403.', 1, 100, 'medium', 1),
(320, 20, @creator, 'REFLECTED_XSS_WHITEBOX_FIX', 'Patch reflected output to prevent script execution.', 1, 100, 'medium', 1),
(321, 21, @creator, 'DOM_XSS_WHITEBOX_FIX', 'Patch DOM sink to prevent unsafe HTML execution.', 1, 100, 'medium', 1)
, 
(330, 30, @creator, 'WAR_GAME', 'Complete the War game and submit the flag.', 1, 100, 'medium', 1)
,
(400, 40, @creator, 'HACK_THE_SUDOKU', 'Bypass client-side validation, discover hidden logic, or exploit API secrets to win the Sudoku game.', 1, 150, 'medium', 1)
,
(401, 41, @creator, 'FROGGER_DEVTOOLS', 'Use browser DevTools to manipulate Frogger runtime behavior and win the game.', 1, 200, 'hard', 1)
ON DUPLICATE KEY UPDATE
  statement = VALUES(statement),
  max_score = VALUES(max_score),
  difficulty = VALUES(difficulty),
  is_active = VALUES(is_active);

UPDATE challenges SET whitebox_files_ref = '{"version":1,"verify_profile":"lab18_admin_role_request","files":[{"id":"admin_panel","display_name":"admin_panel.php","relative_path":"public/admin_panel.php"},{"id":"index","display_name":"index.php","relative_path":"public/index.php"},{"id":"auth_bootstrap","display_name":"auth_bootstrap.php","relative_path":"includes/auth_bootstrap.php"}]}' WHERE challenge_id = 318;
UPDATE challenges SET whitebox_files_ref = '{"version":1,"verify_profile":"lab19_idor_user_param","files":[{"id":"user_profile","display_name":"user_profile.php","relative_path":"public/user_profile.php"},{"id":"entry","display_name":"lab19_entry.php","relative_path":"public/lab19_entry.php"},{"id":"scaffold","display_name":"lab19_scaffold.php","relative_path":"includes/lab19_scaffold.php"}]}' WHERE challenge_id = 319;
UPDATE challenges SET whitebox_files_ref = '{"version":1,"verify_profile":"lab20_reflected_xss","files":[{"id":"search","display_name":"search.php","relative_path":"search.php","vulnerable_line":6}]}' WHERE challenge_id = 320;
UPDATE challenges SET whitebox_files_ref = '{"version":1,"verify_profile":"lab21_dom_xss","files":[{"id":"appjs","display_name":"app.js","relative_path":"app.js","vulnerable_line":4}]}' WHERE challenge_id = 321;

INSERT INTO testcases (testcase_id, challenge_id, secret_flag_hash, secret_flag_plain, points, active, type)
VALUES
(201, 201, 'FLAG{AUTH_BYPASS_123}', 'FLAG{AUTH_BYPASS_123}', 150, 1, 'flag_match'),
(205, 205, 'FLAG{XSS_REFLECTED_111}', 'FLAG{XSS_REFLECTED_111}', 100, 1, 'flag_match'),
(207, 207, 'FLAG{DOM_XSS_333}', 'FLAG{DOM_XSS_333}', 100, 1, 'flag_match'),
(208, 208, 'FLAG{UNPROTECTED_ADMIN_PANEL}', 'FLAG{UNPROTECTED_ADMIN_PANEL}', 100, 1, 'flag_match'),
(209, 209, 'FLAG{IDOR_ACCESS_CONTROL_BYPASS}', 'FLAG{IDOR_ACCESS_CONTROL_BYPASS}', 120, 1, 'flag_match'),
(318, 318, 'FLAG{ACCESS_CONTROL_WHITEBOX_18}', 'FLAG{ACCESS_CONTROL_WHITEBOX_18}', 100, 1, 'flag_match'),
(319, 319, 'FLAG{ACCESS_CONTROL_WHITEBOX_19}', 'FLAG{ACCESS_CONTROL_WHITEBOX_19}', 100, 1, 'flag_match'),
(320, 320, 'FLAG{XSS_WHITEBOX_REFLECTED_20}', 'FLAG{XSS_WHITEBOX_REFLECTED_20}', 100, 1, 'flag_match'),
(321, 321, 'FLAG{XSS_WHITEBOX_DOM_21}', 'FLAG{XSS_WHITEBOX_DOM_21}', 100, 1, 'flag_match')
, 
(330, 330, 'FLAG{WAR_GAME_30}', 'FLAG{WAR_GAME_30}', 100, 1, 'flag_match')
,
(400, 400, 'FLAG{SUDOKU_PWNED}', 'FLAG{SUDOKU_PWNED}', 150, 1, 'flag_match')
,
(401, 401, 'FLAG{FROGGER_DEVTOOLS_41}', 'FLAG{FROGGER_DEVTOOLS_41}', 200, 1, 'flag_match')
ON DUPLICATE KEY UPDATE
  secret_flag_hash = VALUES(secret_flag_hash),
  secret_flag_plain = VALUES(secret_flag_plain),
  points = VALUES(points),
  active = 1;

-- 5) Hints (two per lab)
DELETE FROM hints WHERE challenge_id IN (201, 205, 207, 208, 209, 318, 319, 320, 321);

INSERT INTO hints (challenge_id, text, penalty_points)
VALUES
(201, 'Inspect authentication inputs for injectable query fragments.', 0),
(201, 'Try boolean-based payloads to force login success.', 0),
(205, 'Target the blog search parameter and test reflected payloads.', 0),
(205, 'Try a payload that directly calls alert().', 0),
(207, 'Inspect client-side sinks receiving URL/search input.', 0),
(207, 'Use event-handler payloads; script tags may not execute in innerHTML.', 0),
(208, 'Enumerate restricted endpoints and compare roles.', 0),
(208, 'Verify authorization on the server side, not only in UI.', 0),
(209, 'Look for object IDs in URLs or API requests.', 0),
(209, 'Switch identifiers to another user and test ownership checks.', 0),
(320, 'Encode reflected user input before rendering in HTML response.', 0),
(320, 'Avoid direct concatenation of untrusted query values into markup.', 0),
(321, 'Do not pass untrusted data to innerHTML.', 0),
(321, 'Use textContent/createTextNode for user-controlled values.', 0)
,
(400, 'Check browser localStorage for clues.', 0),
(400, 'Look for hidden JavaScript functions or global variables.', 0),
(400, 'Probe common API endpoint paths for hidden features.', 0),
(401, 'Open DevTools and inspect global game state in the console.', 0),
(401, 'Try overriding speed, lives, or collision checks at runtime.', 0);

INSERT INTO lab_runtime_configs (lab_id, folder, compose_file)
VALUES
(40, 'Games/hack-the-sudoku', 'docker-compose.yml'),
(41, 'BLACK_BOX/game', 'docker-compose.yml')
ON DUPLICATE KEY UPDATE folder = VALUES(folder), compose_file = VALUES(compose_file);

-- Remove lab 11 from public listings (matches get_labs.php filter).
UPDATE labs SET is_published = 0, visibility = 'private' WHERE lab_id = 11;

-- Lab 18 display title (card + white-box header).
UPDATE labs SET title = 'Access Control Bypass' WHERE lab_id = 18;
