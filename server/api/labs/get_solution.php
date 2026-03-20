<?php
declare(strict_types=1);

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
    require_once __DIR__ . '/../../utils/db_connect.php';
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Load error']);
    exit;
}

if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$conn->set_charset('utf8mb4');

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
    exit;
}

$labId = (int)($input['lab_id'] ?? $input['labId'] ?? 0);
$userId = (int)($input['user_id'] ?? $input['userId'] ?? 0);
if ($labId < 1 || $userId < 1) {
    echo json_encode(['success' => false, 'message' => 'Missing lab_id or user_id']);
    exit;
}

$labRes = $conn->query("
    SELECT solution
    FROM labs
    WHERE lab_id = $labId
      AND is_published = 1
      AND visibility = 'public'
    LIMIT 1
");

if (!$labRes || $labRes->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Lab not found']);
    exit;
}

$lab = $labRes->fetch_assoc();
$solution = trim((string)($lab['solution'] ?? ''));
if ($solution === '') {
    echo json_encode(['success' => false, 'message' => 'Solution not available for this lab']);
    exit;
}

// Mark solution as viewed for scoring penalty.
$markOk = $conn->query("
    INSERT INTO lab_resource_usage (user_id, lab_id, hint_viewed, solution_viewed)
    VALUES ($userId, $labId, 0, 1)
    ON DUPLICATE KEY UPDATE solution_viewed = 1
");

if (!$markOk) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to record solution usage: ' . $conn->error]);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'OK',
    'data' => ['solution' => $solution],
]);
