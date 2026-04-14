<?php
/**
 * Lab Solved API - Same flow as lab 1 (submit_flag): points + leaderboard.
 * NO flag required. NO new tables. Uses: lab_access_tokens, lab_instances, submissions, leaderboard.
 * Accepts lab_id + token. Verifies token, gets user_id, credits points.
 */
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    require_once __DIR__ . '/../../utils/db_connect.php';
    require_once __DIR__ . '/../../utils/labs_config.php';
    require_once __DIR__ . '/../../utils/lab_completion_helper.php';
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Load error', 'data' => ['points_earned' => 0]]);
    exit;
}

if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed', 'data' => ['points_earned' => 0]]);
    exit;
}

$conn->set_charset('utf8mb4');

$input = $_SERVER['REQUEST_METHOD'] === 'POST'
    ? (json_decode(file_get_contents('php://input'), true) ?? [])
    : ['lab_id' => (int)($_GET['lab_id'] ?? 0), 'token' => trim((string)($_GET['token'] ?? ''))];

$labId = (int)($input['lab_id'] ?? $input['labId'] ?? 0);
$token = trim((string)($input['token'] ?? ''));

if ($labId < 1 || $token === '') {
    echo json_encode(['success' => false, 'message' => 'Missing lab_id or token', 'data' => ['points_earned' => 0]]);
    exit;
}

$tokenEsc = $conn->real_escape_string($token);
$labIdEsc = (int)$labId;

// Verify token and get user_id from lab_access_tokens (existing table)
$res = $conn->query("
  SELECT user_id FROM lab_access_tokens
  WHERE token = '$tokenEsc'
    AND lab_id = $labIdEsc
    AND expires_at > NOW()
  LIMIT 1
");

if (!$res || $res->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid or expired token', 'data' => ['points_earned' => 0]]);
    exit;
}

$row = $res->fetch_assoc();
$userId = (int)($row['user_id'] ?? 0);
if ($userId < 1) {
    echo json_encode(['success' => false, 'message' => 'Token has no associated user', 'data' => ['points_earned' => 0]]);
    exit;
}

$result = hackme_record_lab_completion($conn, $labId, $userId, 'lab_completed', 'standard');
echo json_encode([
    'success' => (bool) ($result['success'] ?? false),
    'message' => (string) ($result['message'] ?? ''),
    'data' => ['points_earned' => (int) ($result['points_earned'] ?? 0)],
]);
