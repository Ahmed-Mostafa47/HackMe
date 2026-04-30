-- Split SQL black-box (lab 1) and SQL white-box (lab 11). Run once on ctf_platform.
-- After this: white-box API accepts only lab_id = 11; payload marker = whitebox_sqli_lab11.

USE ctf_platform;

-- Black-box SQL lab 1: ensure type is BLACK_BOX (2), clear white-box metadata on challenges
UPDATE labs
SET
  labtype_id = 2,
  title = IF(title IN ('SQL_INJECTION_WHITEBOX', 'SQL_INJECTION'), 'SQL_INJECTION', title),
  description = IF(description LIKE '%White-box: review%', 'Black-box: exploit SQL injection in the Training Labs SQL stack and submit the correct flag.', description)
WHERE lab_id = 1;

UPDATE challenges SET whitebox_files_ref = NULL WHERE lab_id = 1;

-- Remove legacy white-box completion rows tied to lab 1 (optional; avoids lab 1 showing solved without a flag)
DELETE s FROM submissions s
INNER JOIN lab_instances li ON li.instance_id = s.instance_id
WHERE li.lab_id = 1
  AND s.status = 'graded'
  AND TRIM(COALESCE(s.payload_text, '')) = 'whitebox_sqli_lab1';

-- Dedicated white-box lab
INSERT IGNORE INTO labs (
  lab_id, title, description, labtype_id, difficulty, points_total, created_by,
  is_published, visibility, docker_image, reset_interval, icon, port, launch_path
) VALUES (
  11,
  'SQL_INJECTION_WHITEBOX',
  'White-box: review and patch api/login.php in the Training Labs SQL tree. Graded separately from black-box SQL lab 1.',
  1,
  'medium',
  100,
  (SELECT COALESCE(MIN(user_id), 1) FROM users),
  1,
  'public',
  '',
  3600,
  '💉',
  NULL,
  ''
);

INSERT INTO challenges (
  lab_id, created_by, title, statement, order_index, max_score, difficulty, is_active, whitebox_files_ref
)
SELECT
  11,
  (SELECT COALESCE(MIN(user_id), 1) FROM users),
  'SECURE_LOGIN_ENDPOINT',
  'Identify the SQL injection in api/login.php and replace the vulnerable query with prepared statements (bind_param).',
  1,
  100,
  'medium',
  1,
  '{"version":1,"verify_profile":"lab1_sqli_login","files":[{"id":"login","display_name":"login.php","relative_path":"api/login.php","vulnerable_line":10}]}'
WHERE NOT EXISTS (SELECT 1 FROM challenges c WHERE c.lab_id = 11);
