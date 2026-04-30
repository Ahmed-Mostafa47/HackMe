-- ====================================================
-- أضف اللاب 8 وفلاج FLAG{UNPROTECTED_ADMIN_PANEL}
-- شغّل على قاعدة موجودة: mysql -u user -p ctf_platform < add_lab5_flag.sql
-- ====================================================

USE ctf_platform;

-- نوع اللاب Access Control إن لم يكن موجوداً
INSERT IGNORE INTO lab_types (labtype_id, name, description) VALUES
(3, 'ACCESS_CONTROL', 'Access Control & Privilege Escalation');

SET @creator = (SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1);

-- اللاب 8 (إن لم يكن موجوداً)
INSERT IGNORE INTO labs (lab_id, title, description, labtype_id, difficulty, points_total, created_by, is_published, visibility, docker_image, reset_interval)
SELECT 8, 'ACCESS_CONTROL_BYPASS', 'Test role-based access control: bypass restrictions and escalate privileges', 3, 'medium', 100, @creator, 1, 'public', 'cyberops/access-control-lab', 3600
FROM (SELECT 1) AS _tmp
WHERE NOT EXISTS (SELECT 1 FROM labs WHERE lab_id = 8);

-- التحدي للاب 8 (إن لم يكن موجوداً)
INSERT IGNORE INTO challenges (challenge_id, lab_id, created_by, title, statement, order_index, max_score, difficulty, is_active)
SELECT 6, 8, @creator, 'UNPROTECTED_ADMIN_PANEL', 'Access the admin panel without authorization', 1, 50, 'medium', 1
FROM (SELECT 1) AS _tmp
WHERE NOT EXISTS (SELECT 1 FROM challenges WHERE lab_id = 8);

-- testcase للفلاج (إدراج إن لم يوجد)
INSERT IGNORE INTO testcases (testcase_id, challenge_id, secret_flag_hash, secret_flag_plain, points, active, type)
SELECT 6, 6, 'FLAG{UNPROTECTED_ADMIN_PANEL}', 'FLAG{UNPROTECTED_ADMIN_PANEL}', 50, 1, 'flag_match'
FROM (SELECT 1) AS _tmp
WHERE EXISTS (SELECT 1 FROM challenges WHERE challenge_id = 6)
  AND NOT EXISTS (SELECT 1 FROM testcases WHERE testcase_id = 6);

-- تأكد أن أي testcase مرتبط بالاب 8 يحمل الفلاج الصحيح
UPDATE testcases t
INNER JOIN challenges c ON c.challenge_id = t.challenge_id AND c.lab_id = 8
SET t.secret_flag_plain = 'FLAG{UNPROTECTED_ADMIN_PANEL}',
    t.secret_flag_hash = 'FLAG{UNPROTECTED_ADMIN_PANEL}',
    t.points = 50,
    t.active = 1;
