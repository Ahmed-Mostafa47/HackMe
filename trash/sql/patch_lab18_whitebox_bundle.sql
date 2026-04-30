-- Lab 18: multi-file white-box bundle, no vulnerable_line, no hints for challenge 318.
USE ctf_platform;

UPDATE challenges
SET whitebox_files_ref = '{"version":1,"verify_profile":"lab18_admin_role_request","files":[{"id":"admin_panel","display_name":"admin_panel.php","relative_path":"public/admin_panel.php"},{"id":"index","display_name":"index.php","relative_path":"public/index.php"},{"id":"auth_bootstrap","display_name":"auth_bootstrap.php","relative_path":"includes/auth_bootstrap.php"}]}'
WHERE challenge_id = 318 AND lab_id = 18;

DELETE FROM hints WHERE challenge_id = 318;
