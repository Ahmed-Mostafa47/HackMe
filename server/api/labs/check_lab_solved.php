<?php
/**
 * Check if a lab is solved for a user.
 * GET: ?lab_id=5&user_id=1
 * Returns: { "solved": true|false }
 */
declare(strict_types=1);
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$labId = (int)($_GET['lab_id'] ?? 0);
$userId = (int)($_GET['user_id'] ?? 0);

if ($labId < 1 || $userId < 1) {
    echo json_encode(['solved' => false]);
    exit;
}

try {
    require_once __DIR__ . '/../../utils/db_connect.php';
} catch (Throwable $e) {
    echo json_encode(['solved' => false]);
    exit;
}

if (!isset($conn) || !$conn) {
    echo json_encode(['solved' => false]);
    exit;
}

$labIdEsc = (int)$labId;
$userIdEsc = (int)$userId;

$res = $conn->query("
  SELECT 1 FROM submissions s
  JOIN lab_instances li ON li.instance_id = s.instance_id
  WHERE li.lab_id = $labIdEsc AND s.user_id = $userIdEsc AND s.status = 'graded'
  LIMIT 1
");

$solved = ($res && $res->num_rows > 0);
echo json_encode(['solved' => (bool)$solved]);
