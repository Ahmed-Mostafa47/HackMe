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

hackme_lab_access_tokens_ensure_bind_columns($conn);

$input = $_SERVER['REQUEST_METHOD'] === 'POST'
    ? (json_decode(file_get_contents('php://input'), true) ?? [])
    : (['lab_id' => (int)($_GET['lab_id'] ?? 0), 'user_id' => (int)($_GET['user_id'] ?? 0)]);

$labId = (int)($input['lab_id'] ?? 0);
$userId = (int)($input['user_id'] ?? 0);
$deviceBind = preg_replace('/[^a-zA-Z0-9\-]/', '', trim((string) ($input['device_bind'] ?? '')));
$clientMac = hackme_normalize_mac(trim((string) ($input['mac_address'] ?? $input['mac'] ?? '')));
$clientLocal = hackme_normalize_client_local_ip((string) ($input['client_local_ip'] ?? $input['local_ipv4'] ?? ''));

if ($labId < 1) {
    echo json_encode(['success' => false, 'message' => 'Missing or invalid lab_id']);
    exit;
}

// Tie token to HackMe user so submit_flag can award points when the lab tab sends access_token only.
if ($userId < 1) {
    echo json_encode(['success' => false, 'message' => 'Login required — open this lab from HackMe while signed in.']);
    exit;
}

if (strlen($deviceBind) < 24 || strlen($deviceBind) > 128) {
    echo json_encode([
        'success' => false,
        'message' => 'Missing or invalid device_bind — refresh HackMe and click Start Lab again.',
    ]);
    exit;
}

if ($clientMac === '' || $clientLocal === '') {
    echo json_encode([
        'success' => false,
        'message' => 'Machine identity required — from the project folder run: npm run identity-server (then keep it running) and use Start Lab again.',
    ]);
    exit;
}

$token = bin2hex(random_bytes(32));
$expiresAt = date('Y-m-d H:i:s', time() + 600); // 10 minutes

$labIdEsc = (int) $labId;
$userIdEsc = $userId > 0 ? (int) $userId : null;
$tokenEsc = $conn->real_escape_string($token);
$expEsc = $conn->real_escape_string($expiresAt);
$userIdSql = $userIdEsc !== null ? (int) $userIdEsc : 'NULL';

$clientIp = hackme_request_client_ip();
$ipEsc = $conn->real_escape_string($clientIp);
$bindEsc = $conn->real_escape_string($deviceBind);
$localEsc = $conn->real_escape_string($clientLocal);
$macEsc = $conn->real_escape_string($clientMac);

$sql = "INSERT INTO lab_access_tokens (token, lab_id, user_id, expires_at, client_ip, device_bind, client_local_ip, client_mac) " .
    "VALUES ('$tokenEsc', $labIdEsc, $userIdSql, '$expEsc', '$ipEsc', '$bindEsc', '$localEsc', '$macEsc')";
if (!$conn->query($sql)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to create token: ' . $conn->error]);
    exit;
}

echo json_encode(['success' => true, 'token' => $token]);
