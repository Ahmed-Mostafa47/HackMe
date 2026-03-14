<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    require_once __DIR__ . '/../utils/db_connect.php';
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'valid' => false, 'message' => 'Load error']);
    exit;
}

if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'valid' => false]);
    exit;
}

$conn->set_charset('utf8mb4');

$token = trim((string)($_GET['token'] ?? $_POST['token'] ?? ''));
$labId = (int)($_GET['lab_id'] ?? $_POST['lab_id'] ?? 0);

if ($token === '' || $labId < 1) {
    echo json_encode(['success' => true, 'valid' => false, 'message' => 'Missing token or lab_id']);
    exit;
}

$tokenEsc = $conn->real_escape_string($token);
$labIdEsc = (int) $labId;

$res = $conn->query("
  SELECT token, COALESCE(user_id, 0) AS user_id FROM lab_access_tokens
  WHERE token = '$tokenEsc'
    AND lab_id = $labIdEsc
    AND used_at IS NULL
    AND expires_at > NOW()
  LIMIT 1
");

if (!$res || $res->num_rows === 0) {
    echo json_encode(['success' => true, 'valid' => false, 'message' => 'Invalid or expired token']);
    exit;
}

$row = $res->fetch_assoc();
$userId = (int) ($row['user_id'] ?? 0);

// Token valid - allow access (no mark-as-used so refresh works during token lifetime)
echo json_encode(['success' => true, 'valid' => true, 'user_id' => $userId]);
