USE ctf_platform;

SET @creator = (SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1);

INSERT INTO labs (
  lab_id, title, description, solution, icon, port, launch_path,
  labtype_id, difficulty, points_total, created_by, is_published, visibility, docker_image, reset_interval
)
VALUES
(20, 'XSS Lab 1 - Whitebox',
 'White-box reflected XSS: inspect vulnerable source, test payloads in isolated sandbox, and patch secure output encoding.',
 'Render untrusted reflected input with strict context-aware encoding (e.g., htmlspecialchars ENT_QUOTES UTF-8).',
 '⚡', 4001, '/',
 1, 'medium', 100, @creator, 1, 'public', 'cyberops/xss-reflected-whitebox', 3600),
(21, 'XSS Lab 2 - Whitebox',
 'White-box DOM XSS: inspect JavaScript sink and replace unsafe DOM injection with safe text rendering.',
 'Remove innerHTML sink for untrusted input and use textContent/createTextNode instead.',
 '⚡', 4002, '/',
 1, 'medium', 100, @creator, 1, 'public', 'cyberops/xss-dom-whitebox', 3600)
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

INSERT INTO challenges (challenge_id, lab_id, created_by, title, statement, order_index, max_score, difficulty, is_active, whitebox_files_ref)
VALUES
(320, 20, @creator, 'REFLECTED_XSS_WHITEBOX_FIX', 'Patch reflected output to prevent script execution.', 1, 100, 'medium', 1, '{"version":1,"verify_profile":"lab20_reflected_xss","files":[{"id":"search","display_name":"search.php","relative_path":"search.php","vulnerable_line":6}]}'),
(321, 21, @creator, 'DOM_XSS_WHITEBOX_FIX', 'Patch DOM sink to prevent unsafe HTML execution.', 1, 100, 'medium', 1, '{"version":1,"verify_profile":"lab21_dom_xss","files":[{"id":"appjs","display_name":"app.js","relative_path":"app.js","vulnerable_line":4}]}')
ON DUPLICATE KEY UPDATE
  statement = VALUES(statement),
  max_score = VALUES(max_score),
  difficulty = VALUES(difficulty),
  is_active = VALUES(is_active),
  whitebox_files_ref = VALUES(whitebox_files_ref);

DELETE FROM hints WHERE challenge_id IN (320, 321);
INSERT INTO hints (challenge_id, text, penalty_points)
VALUES
(320, 'Encode reflected user input before rendering in HTML response.', 0),
(320, 'Avoid direct concatenation of untrusted query values into markup.', 0),
(321, 'Do not pass untrusted data to innerHTML.', 0),
(321, 'Use textContent/createTextNode for user-controlled values.', 0);
