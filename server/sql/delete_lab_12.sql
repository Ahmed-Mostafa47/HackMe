-- ====================================================
-- Remove lab_id = 12 and dependent rows (uploads, instructor tests, etc.).
-- Run: mysql -u user -p ctf_platform < delete_lab_12.sql
-- Or: php server/sql/run_delete_lab_12.php
-- ====================================================

USE ctf_platform;

SET FOREIGN_KEY_CHECKS = 0;

DELETE f FROM findings f
INNER JOIN submissions s ON f.submission_id = s.submission_id
INNER JOIN challenges c ON s.challenge_id = c.challenge_id
WHERE c.lab_id = 12;

DELETE sf FROM submission_files sf
INNER JOIN submissions s ON sf.submission_id = s.submission_id
INNER JOIN challenges c ON s.challenge_id = c.challenge_id
WHERE c.lab_id = 12;

DELETE f FROM findings f
INNER JOIN submissions s ON f.submission_id = s.submission_id
INNER JOIN lab_instances i ON s.instance_id = i.instance_id
WHERE i.lab_id = 12;

DELETE sf FROM submission_files sf
INNER JOIN submissions s ON sf.submission_id = s.submission_id
INNER JOIN lab_instances i ON s.instance_id = i.instance_id
WHERE i.lab_id = 12;

DELETE s FROM submissions s
INNER JOIN challenges c ON s.challenge_id = c.challenge_id
WHERE c.lab_id = 12;

DELETE s FROM submissions s
INNER JOIN lab_instances i ON s.instance_id = i.instance_id
WHERE i.lab_id = 12;

DELETE h FROM hints h
INNER JOIN challenges c ON h.challenge_id = c.challenge_id
WHERE c.lab_id = 12;

DELETE t FROM testcases t
INNER JOIN challenges c ON t.challenge_id = c.challenge_id
WHERE c.lab_id = 12;

DELETE FROM challenges WHERE lab_id = 12;

DELETE FROM lab_resource_usage WHERE lab_id = 12;
DELETE FROM file_resources WHERE lab_id = 12;
DELETE FROM lab_instances WHERE lab_id = 12;
DELETE FROM lab_access_tokens WHERE lab_id = 12;

DELETE FROM labs WHERE lab_id = 12;

SET FOREIGN_KEY_CHECKS = 1;
