-- ====================================================
-- Verify tables required for submit_flag API
-- Run: mysql -u user -p ctf_platform < verify_submit_flag_tables.sql
-- Or run in phpMyAdmin
-- ====================================================

USE ctf_platform;

-- These queries will FAIL if table/column is missing (shows what to fix)
SELECT 'users' AS tbl, COUNT(*) AS cnt FROM users;
SELECT 'labs' AS tbl, COUNT(*) AS cnt FROM labs;
SELECT 'lab_types' AS tbl, COUNT(*) AS cnt FROM lab_types;
SELECT 'challenges' AS tbl, COUNT(*) AS cnt FROM challenges;
SELECT 'testcases' AS tbl, COUNT(*) AS cnt FROM testcases WHERE active = 1;
SELECT 'lab_instances' AS tbl, COUNT(*) AS cnt FROM lab_instances;
SELECT 'submissions' AS tbl, COUNT(*) AS cnt FROM submissions;
SELECT 'leaderboard' AS tbl, COUNT(*) AS cnt FROM leaderboard;

-- Show flags for lab 1 (for quick reference)
SELECT c.challenge_id, c.title, t.secret_flag_plain, t.points
FROM challenges c
JOIN testcases t ON t.challenge_id = c.challenge_id
WHERE c.lab_id = 1 AND t.active = 1;
