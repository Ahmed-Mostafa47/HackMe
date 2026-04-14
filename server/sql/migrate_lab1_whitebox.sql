-- Lab 1: white-box SQLi on Training Labs sources (challenges.whitebox_files_ref + lab_types)
USE ctf_platform;

UPDATE lab_types SET name = 'WHITE_BOX', description = 'White Box Testing Labs' WHERE labtype_id = 1;

UPDATE labs
SET
  labtype_id = 1,
  title = 'SQL_INJECTION_WHITEBOX',
  description = 'White-box: review the vulnerable login endpoint source, then submit the vulnerable file name, exact line, and a safe replacement. Your patch is validated with PHP syntax checks and static rules (parameterized queries). You can attempt unlimited wrong fixes; only one successful graded completion is recorded per user.'
WHERE lab_id = 1;

UPDATE challenges
SET
  title = 'SECURE_LOGIN_ENDPOINT',
  statement = 'Identify the SQL injection in api/login.php and replace the vulnerable query construction with a safe parameterized approach.',
  whitebox_files_ref = '{"version":1,"verify_profile":"lab1_sqli_login","files":[{"id":"login","display_name":"login.php","relative_path":"api/login.php","vulnerable_line":10}]}'
WHERE lab_id = 1 AND challenge_id = 1;
