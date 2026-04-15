<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
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

$labId = (int) ($_GET['lab_id'] ?? 0);
$kind = strtolower(trim((string) ($_GET['kind'] ?? '')));
$allowedKinds = ['description', 'hints', 'solution'];
if ($labId < 1 || !in_array($kind, $allowedKinds, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid lab_id or kind']);
    exit;
}

$filename = $kind . '.pdf';
$filenameEsc = $conn->real_escape_string($filename);
$res = $conn->query("
  SELECT file_id, filename, path, mime_type, size
  FROM file_resources
  WHERE lab_id = $labId
    AND filename = '$filenameEsc'
  ORDER BY file_id DESC
  LIMIT 1
");

if (!$res || $res->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Document not available']);
    exit;
}
$row = $res->fetch_assoc();
$path = (string) ($row['path'] ?? '');
if ($path === '' || !is_file($path) || !is_readable($path)) {
    echo json_encode(['success' => false, 'message' => 'Stored document file is missing']);
    exit;
}

$raw = file_get_contents($path);
if ($raw === false) {
    echo json_encode(['success' => false, 'message' => 'Failed to read stored document']);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'OK',
    'data' => [
        'kind' => $kind,
        'filename' => (string) ($row['filename'] ?? $filename),
        'mime_type' => (string) ($row['mime_type'] ?? 'application/pdf'),
        'size' => (int) ($row['size'] ?? 0),
        // UI embeds this in a sandboxed iframe/object only. No server-side execution.
        'base64' => base64_encode($raw),
    ],
]);
