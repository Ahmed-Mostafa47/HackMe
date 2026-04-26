<?php
// Enable error display for debugging 500 errors (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

try {
    require_once __DIR__ . '/../utils/db_connect.php';
    require_once __DIR__ . '/../utils/lab_access_token_bind.php';
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Load error: ' . $e->getMessage()]);
    exit;
}

if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$conn->set_charset('utf8mb4');

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
    exit;
}

$labId = (int) ($input['lab_id'] ?? 0);
$flag = trim((string) ($input['flag'] ?? ''));
$flag = preg_replace('/[\r\n]+/', '', $flag);
$userId = (int) ($input['user_id'] ?? 0);
$deviceBindInput = trim((string) ($input['device_bind'] ?? ''));
$macInput = trim((string) ($input['mac_address'] ?? $input['mac'] ?? ''));
$localInput = trim((string) ($input['client_local_ip'] ?? $input['local_ipv4'] ?? ''));

hackme_lab_access_tokens_ensure_bind_columns($conn);

// Labs opened in a new tab may send user_id=0; resolve HackMe user from lab access token (same rules as verify_lab_token.php)
$accessToken = trim((string) ($input['access_token'] ?? ''));
if ($userId < 1 && $accessToken !== '' && $labId >= 1) {
    $atEsc = $conn->real_escape_string($accessToken);
    $labIdInt = (int) $labId;
    $tr = $conn->query(
        "SELECT user_id, client_ip, device_bind, client_mac, client_local_ip FROM lab_access_tokens WHERE token = '$atEsc' AND lab_id = $labIdInt " .
        "AND used_at IS NULL AND expires_at > NOW() LIMIT 1"
    );
    if ($tr && ($trow = $tr->fetch_assoc())) {
        if (!hackme_lab_token_bind_row_matches($trow, [
            'ip' => hackme_request_client_ip(),
            'device_bind' => $deviceBindInput,
            'mac_address' => $macInput,
            'client_local_ip' => $localInput,
        ])) {
            echo json_encode([
                'success' => false,
                'message' => 'LAB_TOKEN_BIND_MISMATCH',
                'detail' => 'This access token was issued for a different IP or browser session.',
            ]);
            exit;
        }
        $rawUid = $trow['user_id'] ?? null;
        if ($rawUid !== null && (int) $rawUid > 0) {
            $userId = (int) $rawUid;
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'LAB_TOKEN_MISSING_USER',
                'detail' => 'This lab link is not tied to your HackMe account. Close the lab, log in on HackMe, and click Start Lab again.',
            ]);
            exit;
        }
    }
}

if ($labId < 1 || $flag === '' || $userId < 1) {
    echo json_encode(['success' => false, 'message' => 'Missing lab_id, flag, or user_id']);
    exit;
}

$flagEsc = $conn->real_escape_string($flag);

// Lab 8 + FLAG{UNPROTECTED_ADMIN_PANEL}: ensure lab/challenge/testcase exist (use ids 100+ to avoid conflict with seed)
if ($labId === 8 && $flag === 'FLAG{UNPROTECTED_ADMIN_PANEL}') {
    $conn->query("INSERT IGNORE INTO lab_types (labtype_id, name, description) VALUES (3, 'ACCESS_CONTROL', 'Access Control')");
    $ur = $conn->query("SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1");
    $creator = $ur && ($r = $ur->fetch_assoc()) ? (int) $r['user_id'] : 0;
    if ($creator > 0) {
        if ($conn->query("SELECT 1 FROM labs WHERE lab_id = 8")->num_rows === 0) {
            $q = $conn->query("INSERT INTO labs (lab_id, title, description, labtype_id, difficulty, points_total, created_by, is_published, visibility, docker_image, reset_interval) VALUES (8, 'ACCESS_CONTROL_BYPASS', 'Test role-based access control', 3, 'medium', 100, $creator, 1, 'public', 'cyberops/access-control-lab', 3600)");
            if (!$q && $conn->errno) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'labs insert: ' . $conn->error]);
                exit;
            }
        }
        if ($conn->query("SELECT 1 FROM challenges WHERE lab_id = 8")->num_rows === 0) {
            $q = $conn->query("INSERT INTO challenges (challenge_id, lab_id, created_by, title, statement, order_index, max_score, difficulty, is_active) VALUES (100, 8, $creator, 'UNPROTECTED_ADMIN_PANEL', 'Access the admin panel without authorization', 1, 50, 'medium', 1)");
            if (!$q && $conn->errno) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'challenges insert: ' . $conn->error]);
                exit;
            }
        }
        if ($conn->query("SELECT 1 FROM challenges WHERE challenge_id = 100 AND lab_id = 8")->num_rows > 0 && $conn->query("SELECT 1 FROM testcases WHERE challenge_id = 100")->num_rows === 0) {
            $q = $conn->query("INSERT INTO testcases (testcase_id, challenge_id, secret_flag_hash, secret_flag_plain, points, active, type) VALUES (100, 100, 'FLAG{UNPROTECTED_ADMIN_PANEL}', 'FLAG{UNPROTECTED_ADMIN_PANEL}', 50, 1, 'flag_match')");
            if (!$q && $conn->errno) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'testcases insert: ' . $conn->error]);
                exit;
            }
        }
        $conn->query("UPDATE testcases t INNER JOIN challenges c ON c.challenge_id = t.challenge_id AND c.lab_id = 8 SET t.secret_flag_plain = 'FLAG{UNPROTECTED_ADMIN_PANEL}', t.secret_flag_hash = 'FLAG{UNPROTECTED_ADMIN_PANEL}', t.points = 50, t.active = 1");
    }
}

// Lab 9 + FLAG{IDOR_ACCESS_CONTROL_BYPASS}: ensure lab/challenge/testcase exist (use ids 101 to avoid conflict)
if ($labId === 9 && $flag === 'FLAG{IDOR_ACCESS_CONTROL_BYPASS}') {
    $conn->query("INSERT IGNORE INTO lab_types (labtype_id, name, description) VALUES (3, 'ACCESS_CONTROL', 'Access Control')");
    $ur = $conn->query("SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1");
    $creator = $ur && ($r = $ur->fetch_assoc()) ? (int) $r['user_id'] : 0;
    if ($creator > 0) {
        if ($conn->query("SELECT 1 FROM labs WHERE lab_id = 9")->num_rows === 0) {
            $q = $conn->query("INSERT INTO labs (lab_id, title, description, labtype_id, difficulty, points_total, created_by, is_published, visibility, docker_image, reset_interval) VALUES (9, 'IDOR_ACCESS_CONTROL_BYPASS', 'IDOR and access control bypass', 3, 'medium', 50, $creator, 1, 'public', '', 3600)");
            if (!$q && $conn->errno) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'labs insert lab9: ' . $conn->error]);
                exit;
            }
        }
        if ($conn->query("SELECT 1 FROM challenges WHERE lab_id = 9")->num_rows === 0) {
            $q = $conn->query("INSERT INTO challenges (challenge_id, lab_id, created_by, title, statement, order_index, max_score, difficulty, is_active) VALUES (101, 9, $creator, 'IDOR_ACCESS_CONTROL_BYPASS', 'Bypass access control via IDOR', 1, 50, 'medium', 1)");
            if (!$q && $conn->errno) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'challenges insert lab9: ' . $conn->error]);
                exit;
            }
        }
        if ($conn->query("SELECT 1 FROM challenges WHERE challenge_id = 101 AND lab_id = 9")->num_rows > 0 && $conn->query("SELECT 1 FROM testcases WHERE challenge_id = 101")->num_rows === 0) {
            $q = $conn->query("INSERT INTO testcases (testcase_id, challenge_id, secret_flag_hash, secret_flag_plain, points, active, type) VALUES (101, 101, 'FLAG{IDOR_ACCESS_CONTROL_BYPASS}', 'FLAG{IDOR_ACCESS_CONTROL_BYPASS}', 50, 1, 'flag_match')");
            if (!$q && $conn->errno) {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'testcases insert lab9: ' . $conn->error]);
                exit;
            }
        }
        $conn->query("UPDATE testcases t INNER JOIN challenges c ON c.challenge_id = t.challenge_id AND c.lab_id = 9 SET t.secret_flag_plain = 'FLAG{IDOR_ACCESS_CONTROL_BYPASS}', t.secret_flag_hash = 'FLAG{IDOR_ACCESS_CONTROL_BYPASS}', t.points = 50, t.active = 1");
    }
}

// Lab 10 + FLAG{ACADEMY_SQLI_DELETED}: SQLi academy lab, 150 points
// Seed SQL does not include lab 10 — create/upsert here. Prefer submitting user as created_by (always valid if token resolved).
if ($labId === 10 && $flag === 'FLAG{ACADEMY_SQLI_DELETED}') {
    $conn->query("INSERT IGNORE INTO lab_types (labtype_id, name, description) VALUES (2, 'BLACK_BOX', 'Black Box Testing Labs')");
    $creator = $userId > 0 ? (int) $userId : 0;
    if ($creator < 1) {
        $ur = $conn->query("SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1");
        $creator = $ur && ($r = $ur->fetch_assoc()) ? (int) $r['user_id'] : 0;
    }
    if ($creator > 0) {
        $c = (int) $creator;
        $conn->query(
            "INSERT INTO labs (lab_id, title, description, labtype_id, difficulty, points_total, created_by, is_published, visibility, docker_image, reset_interval) " .
            "VALUES (10, 'SQL_INJECTION_ACADEMY', 'Exploit SQL injection on a programming academy site: use sqlmap to find tables and users, get admin email, login and delete a user', 2, 'medium', 150, $c, 1, 'public', '', 3600) " .
            "ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), labtype_id = VALUES(labtype_id), " .
            "difficulty = VALUES(difficulty), points_total = VALUES(points_total), created_by = VALUES(created_by)"
        );
        // challenge_id 8 must belong to lab_id 10 or flag lookup (JOIN c.lab_id = 10) returns nothing → INVALID_FLAG
        $conn->query(
            "INSERT INTO challenges (challenge_id, lab_id, created_by, title, statement, order_index, max_score, difficulty, is_active) " .
            "VALUES (8, 10, $c, 'ACADEMY_SQLI_DELETED', 'Use SQL injection to access admin and delete a user', 1, 150, 'medium', 1) " .
            "ON DUPLICATE KEY UPDATE lab_id = VALUES(lab_id), created_by = VALUES(created_by), title = VALUES(title), " .
            "statement = VALUES(statement), order_index = VALUES(order_index), max_score = VALUES(max_score), " .
            "difficulty = VALUES(difficulty), is_active = VALUES(is_active)"
        );
        $conn->query(
            "INSERT INTO testcases (testcase_id, challenge_id, secret_flag_hash, secret_flag_plain, points, active, type) " .
            "VALUES (8, 8, 'FLAG{ACADEMY_SQLI_DELETED}', 'FLAG{ACADEMY_SQLI_DELETED}', 150, 1, 'flag_match') " .
            "ON DUPLICATE KEY UPDATE challenge_id = VALUES(challenge_id), secret_flag_hash = VALUES(secret_flag_hash), " .
            "secret_flag_plain = VALUES(secret_flag_plain), points = VALUES(points), active = VALUES(active), type = VALUES(type)"
        );
        $conn->query(
            "UPDATE testcases t INNER JOIN challenges c ON c.challenge_id = t.challenge_id AND c.lab_id = 10 AND c.challenge_id = 8 " .
            "SET t.secret_flag_plain = 'FLAG{ACADEMY_SQLI_DELETED}', t.secret_flag_hash = 'FLAG{ACADEMY_SQLI_DELETED}', t.points = 150, t.active = 1"
        );
    }
}

// Lab 40 + FLAG{FROGGER_DEVTOOLS_OVERRIDE}: Frogger lab, 200 points
// Ensure lab/challenge/testcase rows exist so valid flag does not fail with INVALID_FLAG.
if ($labId === 40 && $flag === 'FLAG{FROGGER_DEVTOOLS_OVERRIDE}') {
    $conn->query("INSERT IGNORE INTO lab_types (labtype_id, name, description) VALUES (2, 'BLACK_BOX', 'Black Box Testing Labs')");
    $creator = $userId > 0 ? (int) $userId : 0;
    if ($creator < 1) {
        $ur = $conn->query("SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1");
        $creator = $ur && ($r = $ur->fetch_assoc()) ? (int) $r['user_id'] : 0;
    }
    if ($creator > 0) {
        $c = (int) $creator;
        $conn->query(
            "INSERT INTO labs (lab_id, title, description, labtype_id, difficulty, points_total, created_by, is_published, visibility, docker_image, reset_interval) " .
            "VALUES (40, 'Frogger', 'Frogger challenge: win by crossing the road safely. To do that, use browser DevTools to modify runtime game settings.', 2, 'hard', 200, $c, 1, 'public', '', 3600) " .
            "ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), labtype_id = VALUES(labtype_id), " .
            "difficulty = VALUES(difficulty), points_total = VALUES(points_total), created_by = VALUES(created_by)"
        );
        $conn->query(
            "INSERT INTO challenges (challenge_id, lab_id, created_by, title, statement, order_index, max_score, difficulty, is_active) " .
            "VALUES (340, 40, $c, 'Frogger', 'Win by crossing the road; use browser DevTools to adjust runtime settings.', 1, 200, 'hard', 1) " .
            "ON DUPLICATE KEY UPDATE lab_id = VALUES(lab_id), created_by = VALUES(created_by), title = VALUES(title), " .
            "statement = VALUES(statement), order_index = VALUES(order_index), max_score = VALUES(max_score), " .
            "difficulty = VALUES(difficulty), is_active = VALUES(is_active)"
        );
        $conn->query(
            "INSERT INTO testcases (testcase_id, challenge_id, secret_flag_hash, secret_flag_plain, points, active, type) " .
            "VALUES (340, 340, 'FLAG{FROGGER_DEVTOOLS_OVERRIDE}', 'FLAG{FROGGER_DEVTOOLS_OVERRIDE}', 200, 1, 'flag_match') " .
            "ON DUPLICATE KEY UPDATE challenge_id = VALUES(challenge_id), secret_flag_hash = VALUES(secret_flag_hash), " .
            "secret_flag_plain = VALUES(secret_flag_plain), points = VALUES(points), active = VALUES(active), type = VALUES(type)"
        );
        $conn->query(
            "UPDATE testcases t INNER JOIN challenges c ON c.challenge_id = t.challenge_id AND c.lab_id = 40 AND c.challenge_id = 340 " .
            "SET t.secret_flag_plain = 'FLAG{FROGGER_DEVTOOLS_OVERRIDE}', t.secret_flag_hash = 'FLAG{FROGGER_DEVTOOLS_OVERRIDE}', t.points = 200, t.active = 1"
        );
    }
}

// Labs 18 / 19: white-box listed access-control labs (ensure rows so flags validate without manual seed).
if ($labId === 18 || $labId === 19) {
    $conn->query("INSERT IGNORE INTO lab_types (labtype_id, name, description) VALUES (1, 'WHITE_BOX', 'White Box Testing Labs')");
    $ur = $conn->query("SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1");
    $creator = $ur && ($r = $ur->fetch_assoc()) ? (int) $r['user_id'] : 0;
    if ($userId > 0) {
        $creator = (int) $userId;
    }
    if ($creator > 0) {
        $c = (int) $creator;
        if ($labId === 18) {
            $conn->query(
                "INSERT INTO labs (lab_id, title, description, labtype_id, difficulty, points_total, created_by, is_published, visibility, docker_image, reset_interval) " .
                "VALUES (18, 'Access Control Bypass', 'Broken access control (white-box): bypass authorization via session/role; capture FLAG{ACCESS_CONTROL_WHITEBOX_18}.', 1, 'medium', 100, $c, 1, 'public', 'cyberops/access-control-lab', 3600) " .
                "ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), labtype_id = 1, " .
                "difficulty = VALUES(difficulty), points_total = VALUES(points_total)"
            );
            $conn->query(
                "INSERT INTO challenges (challenge_id, lab_id, created_by, title, statement, order_index, max_score, difficulty, is_active) " .
                "VALUES (318, 18, $c, 'ACCESS_CONTROL_18', 'Solve the access-control challenge and submit the flag.', 1, 100, 'medium', 1) " .
                "ON DUPLICATE KEY UPDATE lab_id = 18, is_active = 1, title = VALUES(title), statement = VALUES(statement), max_score = VALUES(max_score)"
            );
            $conn->query(
                "INSERT INTO testcases (testcase_id, challenge_id, secret_flag_hash, secret_flag_plain, points, active, type) " .
                "VALUES (318, 318, 'FLAG{ACCESS_CONTROL_WHITEBOX_18}', 'FLAG{ACCESS_CONTROL_WHITEBOX_18}', 100, 1, 'flag_match') " .
                "ON DUPLICATE KEY UPDATE challenge_id = 318, secret_flag_plain = VALUES(secret_flag_plain), secret_flag_hash = VALUES(secret_flag_hash), points = 100, active = 1"
            );
            $wb18 = $conn->real_escape_string('{"version":1,"verify_profile":"lab18_admin_role_request","files":[{"id":"admin_panel","display_name":"admin_panel.php","relative_path":"public/admin_panel.php"},{"id":"index","display_name":"index.php","relative_path":"public/index.php"},{"id":"auth_bootstrap","display_name":"auth_bootstrap.php","relative_path":"includes/auth_bootstrap.php"}]}');
            $conn->query("UPDATE challenges SET whitebox_files_ref = '$wb18' WHERE challenge_id = 318 AND lab_id = 18");
        } else {
            $conn->query(
                "INSERT INTO labs (lab_id, title, description, labtype_id, difficulty, points_total, created_by, is_published, visibility, docker_image, reset_interval) " .
                "VALUES (19, 'IDOR (White-box)', 'White-box: profile follows user_id in the URL — patch sources to bind access to the session user and block horizontal access.', 1, 'medium', 100, $c, 1, 'public', 'cyberops/access-control-lab', 3600) " .
                "ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), labtype_id = 1, " .
                "difficulty = VALUES(difficulty), points_total = VALUES(points_total)"
            );
            $conn->query(
                "INSERT INTO challenges (challenge_id, lab_id, created_by, title, statement, order_index, max_score, difficulty, is_active) " .
                "VALUES (319, 19, $c, 'ACCESS_CONTROL_19', 'White-box: remove IDOR via user_id in URL; bind profile to session viewer + 403.', 1, 100, 'medium', 1) " .
                "ON DUPLICATE KEY UPDATE lab_id = 19, is_active = 1, title = VALUES(title), statement = VALUES(statement), max_score = VALUES(max_score)"
            );
            $conn->query(
                "INSERT INTO testcases (testcase_id, challenge_id, secret_flag_hash, secret_flag_plain, points, active, type) " .
                "VALUES (319, 319, 'FLAG{ACCESS_CONTROL_WHITEBOX_19}', 'FLAG{ACCESS_CONTROL_WHITEBOX_19}', 100, 1, 'flag_match') " .
                "ON DUPLICATE KEY UPDATE challenge_id = 319, secret_flag_plain = VALUES(secret_flag_plain), secret_flag_hash = VALUES(secret_flag_hash), points = 100, active = 1"
            );
            $wb19 = $conn->real_escape_string('{"version":1,"verify_profile":"lab19_idor_user_param","files":[{"id":"user_profile","display_name":"user_profile.php","relative_path":"public/user_profile.php"},{"id":"entry","display_name":"lab19_entry.php","relative_path":"public/lab19_entry.php"},{"id":"scaffold","display_name":"lab19_scaffold.php","relative_path":"includes/lab19_scaffold.php"}]}');
            $conn->query("UPDATE challenges SET whitebox_files_ref = '$wb19' WHERE challenge_id = 319 AND lab_id = 19");
        }
    }
}

// Find matching flag in DB
$res = $conn->query("
    SELECT c.challenge_id, t.points
    FROM challenges c
    JOIN testcases t ON t.challenge_id = c.challenge_id AND t.active = 1
    WHERE c.lab_id = $labId
    AND (
        TRIM(COALESCE(t.secret_flag_plain,'')) = '$flagEsc'
        OR TRIM(COALESCE(t.secret_flag_hash,'')) = '$flagEsc'
    )
    LIMIT 1
");

if (!$res) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB query error (challenges/testcases): ' . $conn->error]);
    exit;
}
if ($res->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'INVALID_FLAG']);
    exit;
}

$row = $res->fetch_assoc();
$challengeId = (int) $row['challenge_id'];
$points = (int) $row['points'];
// SQL Lab (lab_id=1): ensure 50 points if testcases has 0
if ($points < 1 && $labId === 1) {
    $points = 50;
}
// Lab 10: ensure 150 points
if ($points < 1 && $labId === 10) {
    $points = 150;
}

// Apply score penalties based on viewed resources in this lab.
// Hint viewed: -25%, Solution viewed: -75% (cumulative, capped at 100%).
$penaltyRes = $conn->query("
    SELECT hint_viewed, solution_viewed
    FROM lab_resource_usage
    WHERE user_id = $userId AND lab_id = $labId
    LIMIT 1
");
if ($penaltyRes && $penaltyRes->num_rows > 0) {
    $penaltyRow = $penaltyRes->fetch_assoc();
    $hintViewed = ((int)($penaltyRow['hint_viewed'] ?? 0) === 1);
    $solutionViewed = ((int)($penaltyRow['solution_viewed'] ?? 0) === 1);
    $penaltyPercent = 0;
    if ($hintViewed) {
        $penaltyPercent += 25;
    }
    if ($solutionViewed) {
        $penaltyPercent += 75;
    }
    if ($penaltyPercent > 100) {
        $penaltyPercent = 100;
    }
    $points = (int) floor($points * (1 - ($penaltyPercent / 100)));
}

// Check if lab already solved - first time only, no points on repeat
$check = $conn->query("
    SELECT 1 FROM submissions s
    INNER JOIN lab_instances li ON li.instance_id = s.instance_id
    WHERE li.lab_id = $labId AND s.user_id = $userId AND s.status = 'graded'
    LIMIT 1
");
if ($check && $check->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => 'LAB_ALREADY_SOLVED', 'already_solved' => true]);
    exit;
}

// Get or create lab_instance
$inst = $conn->query("SELECT instance_id FROM lab_instances WHERE lab_id = $labId AND user_id = $userId AND status = 'running' ORDER BY instance_id DESC LIMIT 1");
if ($inst && $inst->num_rows > 0) {
    $instRow = $inst->fetch_assoc();
    $instanceId = (int) $instRow['instance_id'];
} else {
    $ins = $conn->query("INSERT INTO lab_instances (lab_id, user_id, container_id, status) VALUES ($labId, $userId, 'web_sandbox', 'running')");
    if (!$ins) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'DB error (lab_instances): ' . $conn->error]);
        exit;
    }
    $instanceId = (int) $conn->insert_id;
    if ($instanceId < 1) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create lab_instance']);
        exit;
    }
}

// Prevent double submit: same user+instance+challenge already graded → do not insert or add points again
$dup = $conn->query("SELECT 1 FROM submissions WHERE instance_id = $instanceId AND user_id = $userId AND challenge_id = $challengeId AND status = 'graded' LIMIT 1");
if ($dup && $dup->num_rows > 0) {
    echo json_encode(['success' => true, 'message' => 'FLAG_ALREADY_SUBMITTED', 'points' => $points, 'already_solved' => true]);
    exit;
}

// Insert submission (only reached on first valid submit for this lab)
$ok1 = $conn->query("INSERT INTO submissions (instance_id, user_id, challenge_id, type, payload_text, auto_score, final_score, status) VALUES ($instanceId, $userId, $challengeId, 'flag', '$flagEsc', $points, $points, 'graded')");

if (!$ok1) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB error (submissions): ' . $conn->error]);
    exit;
}

// Update leaderboard
$conn->query("INSERT INTO leaderboard (user_id, total_points, last_update) VALUES ($userId, $points, NOW()) ON DUPLICATE KEY UPDATE total_points = total_points + $points, last_update = NOW()");

echo json_encode(['success' => true, 'message' => 'FLAG_CAPTURED', 'points' => $points]);

