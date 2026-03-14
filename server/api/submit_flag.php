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

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
    exit;
}

$labId = (int) ($input['lab_id'] ?? 0);
$flag = trim((string) ($input['flag'] ?? ''));
$userId = (int) ($input['user_id'] ?? 0);

if ($labId < 1 || $flag === '' || $userId < 1) {
    echo json_encode(['success' => false, 'message' => 'Missing lab_id, flag, or user_id']);
    exit;
}

$flagEsc = $conn->real_escape_string($flag);

// Find matching flag in DB (simple query, no prepared stmt)
$res = $conn->query("
    SELECT c.challenge_id, t.points
    FROM challenges c
    JOIN testcases t ON t.challenge_id = c.challenge_id AND t.active = 1
    WHERE c.lab_id = $labId
    AND (TRIM(COALESCE(t.secret_flag_plain,'')) = '$flagEsc' OR TRIM(COALESCE(t.secret_flag_hash,'')) = '$flagEsc')
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

// Check if lab already solved - first time only, no points on repeat
$check = $conn->query("
    SELECT 1 FROM submissions s
    JOIN lab_instances li ON li.instance_id = s.instance_id
    WHERE li.lab_id = $labId AND s.user_id = $userId AND s.status = 'graded'
    LIMIT 1
");
if ($check && $check->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => 'LAB_ALREADY_SOLVED']);
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

// Check duplicate
$dup = $conn->query("SELECT 1 FROM submissions WHERE instance_id = $instanceId AND user_id = $userId AND challenge_id = $challengeId AND status = 'graded' LIMIT 1");
if ($dup && $dup->num_rows > 0) {
    echo json_encode(['success' => true, 'message' => 'FLAG_ALREADY_SUBMITTED', 'points' => $points]);
    exit;
}

// Insert submission
$ok1 = $conn->query("INSERT INTO submissions (instance_id, user_id, challenge_id, type, payload_text, auto_score, final_score, status) VALUES ($instanceId, $userId, $challengeId, 'flag', '$flagEsc', $points, $points, 'graded')");

if (!$ok1) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB error (submissions): ' . $conn->error]);
    exit;
}

// Update leaderboard
$conn->query("INSERT INTO leaderboard (user_id, total_points, last_update) VALUES ($userId, $points, NOW()) ON DUPLICATE KEY UPDATE total_points = total_points + $points, last_update = NOW()");

echo json_encode(['success' => true, 'message' => 'FLAG_CAPTURED', 'points' => $points]);
