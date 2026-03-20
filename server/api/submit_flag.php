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

// Ensure table for hint/solution usage exists.
$conn->query("
    CREATE TABLE IF NOT EXISTS lab_resource_usage (
        usage_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        lab_id INT NOT NULL,
        hint_viewed TINYINT(1) NOT NULL DEFAULT 0,
        solution_viewed TINYINT(1) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_user_lab (user_id, lab_id)
    )
");

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
