<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

try {
    require_once __DIR__ . '/../../utils/db_connect.php';
    require_once __DIR__ . '/../../utils/lab_zip_upload.php';
    require_once __DIR__ . '/../../utils/lab_submission_requests_zip.php';
} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Load error']);
    exit;
}

if (!isset($conn) || !$conn) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}
$conn->set_charset('utf8mb4');

hackme_ensure_lab_submission_requests_zip_columns($conn);

$userId = (int) ($_GET['user_id'] ?? 0);
$submissionId = (int) ($_GET['submission_id'] ?? 0);
if ($userId < 1 || $submissionId < 1) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Missing user_id or submission_id']);
    exit;
}

$rolesRes = $conn->query("
  SELECT 1
  FROM user_roles ur
  INNER JOIN roles r ON r.role_id = ur.role_id
  WHERE ur.user_id = $userId
    AND LOWER(r.name) IN ('admin','superadmin')
  LIMIT 1
");
if (!$rolesRes || $rolesRes->num_rows === 0) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Admin or superadmin privileges required']);
    exit;
}

$sid = $submissionId;
$res = $conn->query("
  SELECT zip_package_path, zip_original_name
  FROM lab_submission_requests
  WHERE submission_id = $sid
  LIMIT 1
");
if (!$res || $res->num_rows === 0) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Submission not found']);
    exit;
}
$row = $res->fetch_assoc();
$relPath = trim((string) ($row['zip_package_path'] ?? ''));
$origName = trim((string) ($row['zip_original_name'] ?? ''));
if ($relPath === '') {
    $relPath = 'submissions/' . $sid;
}
if (str_contains($relPath, '..') || str_starts_with($relPath, '/') || str_starts_with($relPath, '\\')) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Invalid package path']);
    exit;
}

$base = hackme_lab_storage_root();
$abs = $base . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relPath);
$realBase = realpath($base);
$realAbs = is_dir($abs) ? realpath($abs) : false;
if ($realBase === false || $realAbs === false || !str_starts_with($realAbs, $realBase)) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'No lab package files for this submission']);
    exit;
}

$tmpZip = tempnam(sys_get_temp_dir(), 'hklabsub_');
if ($tmpZip === false) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Failed to create temp file']);
    exit;
}
$zipPath = $tmpZip . '.zip';
if (!@rename($tmpZip, $zipPath)) {
    @unlink($tmpZip);
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Failed to prepare ZIP path']);
    exit;
}

if (!hackme_zip_directory_to_file($realAbs, $zipPath)) {
    @unlink($zipPath);
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Failed to build ZIP archive']);
    exit;
}

$downloadBase = 'lab-submission-' . $sid . '.zip';
if ($origName !== '' && preg_match('/\.zip$/i', $origName)) {
    $safe = preg_replace('/[^A-Za-z0-9._\-]/', '_', basename($origName)) ?? $downloadBase;
    $downloadBase = $safe !== '' ? $safe : 'lab-submission-' . $sid . '.zip';
}

header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $downloadBase . '"');
header('Content-Length: ' . (string) filesize($zipPath));
header('Cache-Control: no-store');
readfile($zipPath);
@unlink($zipPath);
exit;
