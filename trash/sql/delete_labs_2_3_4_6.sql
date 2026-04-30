-- ====================================================
-- Remove obsolete labs: 2 (buffer overflow), 3 (blind SQLi),
-- 4 (XSS black box), 6 (wrong access-control placeholder if present).
-- Run: mysql -u user -p ctf_platform < delete_labs_2_3_4_6.sql
-- ====================================================

USE ctf_platform;

SET FOREIGN_KEY_CHECKS = 0;

-- Findings / submission_files before submissions (if FKs exist)
DELETE f FROM findings f
INNER JOIN submissions s ON f.submission_id = s.submission_id
INNER JOIN challenges c ON s.challenge_id = c.challenge_id
WHERE c.lab_id IN (2, 3, 4, 6);

DELETE sf FROM submission_files sf
INNER JOIN submissions s ON sf.submission_id = s.submission_id
INNER JOIN challenges c ON s.challenge_id = c.challenge_id
WHERE c.lab_id IN (2, 3, 4, 6);

DELETE f FROM findings f
INNER JOIN submissions s ON f.submission_id = s.submission_id
INNER JOIN lab_instances i ON s.instance_id = i.instance_id
WHERE i.lab_id IN (2, 3, 4, 6);

DELETE sf FROM submission_files sf
INNER JOIN submissions s ON sf.submission_id = s.submission_id
INNER JOIN lab_instances i ON s.instance_id = i.instance_id
WHERE i.lab_id IN (2, 3, 4, 6);

DELETE s FROM submissions s
INNER JOIN challenges c ON s.challenge_id = c.challenge_id
WHERE c.lab_id IN (2, 3, 4, 6);

DELETE s FROM submissions s
INNER JOIN lab_instances i ON s.instance_id = i.instance_id
WHERE i.lab_id IN (2, 3, 4, 6);

-- Optional tables (omit if not present on your schema): attempt_logs, blocks, Challenges_comments

DELETE h FROM hints h
INNER JOIN challenges c ON h.challenge_id = c.challenge_id
WHERE c.lab_id IN (2, 3, 4, 6);

DELETE t FROM testcases t
INNER JOIN challenges c ON t.challenge_id = c.challenge_id
WHERE c.lab_id IN (2, 3, 4, 6);

DELETE FROM challenges WHERE lab_id IN (2, 3, 4, 6);

DELETE FROM lab_resource_usage WHERE lab_id IN (2, 3, 4, 6);
DELETE FROM file_resources WHERE lab_id IN (2, 3, 4, 6);
DELETE FROM lab_instances WHERE lab_id IN (2, 3, 4, 6);

DELETE FROM lab_access_tokens WHERE lab_id IN (2, 3, 4, 6);

DELETE FROM labs WHERE lab_id IN (2, 3, 4, 6);

SET FOREIGN_KEY_CHECKS = 1;
