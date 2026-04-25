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
    require_once __DIR__ . '/../../utils/lab_zip_upload.php';
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

$userId = (int) ($_POST['user_id'] ?? 0);
if (!hackme_user_is_instructor_or_admin($conn, $userId)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Insufficient permissions']);
    exit;
}

if (!isset($_FILES['lab_zip']) || !is_array($_FILES['lab_zip'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'lab_zip file is required']);
    exit;
}

$file = $_FILES['lab_zip'];
$name = (string) ($file['name'] ?? '');
$tmpPath = (string) ($file['tmp_name'] ?? '');
$err = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

if ($err !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Upload failed', 'data' => ['upload_error' => $err]]);
    exit;
}

if (!preg_match('/\.zip$/i', $name)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Only .zip files are allowed']);
    exit;
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = $finfo ? (string) finfo_file($finfo, $tmpPath) : '';
if ($finfo) {
    finfo_close($finfo);
}
$allowedMimes = [
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream',
];
if (!in_array($mime, $allowedMimes, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid MIME type for ZIP']);
    exit;
}

$scanRaw = file_get_contents($tmpPath);
if ($scanRaw === false) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Failed to scan uploaded file']);
    exit;
}
$scanLower = strtolower($scanRaw);
if (str_contains($scanLower, '<?php') || str_contains($scanLower, '<script')) {
    // This is intentionally conservative for archive payload scanning.
    // We do not block on this because labs may include code samples; we only report warning.
    $scanWarning = 'Archive contains executable-looking content; ensure this lab stays isolated.';
} else {
    $scanWarning = '';
}

$fallbackTitle = preg_replace('/\.zip$/i', '', $name) ?? 'Uploaded Lab';
$result = hackme_validate_and_stage_lab_zip($tmpPath, 20 * 1024 * 1024, $fallbackTitle);
if (!$result['success']) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'ZIP validation failed',
        'data' => [
            'errors' => $result['errors'] ?? [],
            'warnings' => $result['warnings'] ?? [],
        ],
    ]);
    exit;
}

$warnings = $result['warnings'] ?? [];
if ($scanWarning !== '') {
    $warnings[] = $scanWarning;
}

echo json_encode([
    'success' => true,
    'message' => 'ZIP validated and staged',
    'data' => [
        'upload_token' => $result['token'],
        'metadata' => $result['metadata'],
        'validation' => $result['validation'] ?? [],
        'warnings' => array_values(array_unique($warnings)),
    ],
]);
