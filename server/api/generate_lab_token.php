<?php
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
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

// Ensure lab_access_tokens table exists (create if not)
$conn->query("
  CREATE TABLE IF NOT EXISTS lab_access_tokens (
    token VARCHAR(64) PRIMARY KEY,
    lab_id INT NOT NULL,
    user_id INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_lab_expires (lab_id, expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");

$input = $_SERVER['REQUEST_METHOD'] === 'POST'
    ? (json_decode(file_get_contents('php://input'), true) ?? [])
    : (['lab_id' => (int)($_GET['lab_id'] ?? 0), 'user_id' => (int)($_GET['user_id'] ?? 0)]);

$labId = (int)($input['lab_id'] ?? 0);
$userId = (int)($input['user_id'] ?? 0);

if ($labId < 1) {
    echo json_encode(['success' => false, 'message' => 'Missing or invalid lab_id']);
    exit;
}

$token = bin2hex(random_bytes(32));
$expiresAt = date('Y-m-d H:i:s', time() + 600); // 10 minutes

$labIdEsc = (int) $labId;
$userIdEsc = $userId > 0 ? (int) $userId : null;
$tokenEsc = $conn->real_escape_string($token);
$expEsc = $conn->real_escape_string($expiresAt);
$userIdSql = $userIdEsc !== null ? (int) $userIdEsc : 'NULL';

$sql = "INSERT INTO lab_access_tokens (token, lab_id, user_id, expires_at) VALUES ('$tokenEsc', $labIdEsc, $userIdSql, '$expEsc')";
if (!$conn->query($sql)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to create token: ' . $conn->error]);
    exit;
}

echo json_encode(['success' => true, 'token' => $token]);
