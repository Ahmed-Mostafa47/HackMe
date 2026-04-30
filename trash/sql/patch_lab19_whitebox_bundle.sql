-- Lab 19: IDOR white-box bundle (multi-file, no hints).
USE ctf_platform;

UPDATE labs
SET title = 'IDOR (White-box)',
    description = 'White-box: profile follows user_id in the URL — patch sources to bind access to the session user and block horizontal access.'
WHERE lab_id = 19;

UPDATE challenges
SET statement = 'White-box: remove IDOR via user_id in URL; bind profile to session viewer + 403.',
    whitebox_files_ref = '{"version":1,"verify_profile":"lab19_idor_user_param","files":[{"id":"user_profile","display_name":"user_profile.php","relative_path":"public/user_profile.php"},{"id":"entry","display_name":"lab19_entry.php","relative_path":"public/lab19_entry.php"},{"id":"scaffold","display_name":"lab19_scaffold.php","relative_path":"includes/lab19_scaffold.php"}]}'
WHERE challenge_id = 319 AND lab_id = 19;

DELETE FROM hints WHERE challenge_id = 319;
