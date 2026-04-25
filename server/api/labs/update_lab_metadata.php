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

$input = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
    exit;
}

$userId = (int) ($input['user_id'] ?? 0);
$labId = (int) ($input['lab_id'] ?? 0);
if ($userId < 1 || $labId < 1) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing user_id or lab_id']);
    exit;
}

// Role check (admin/superadmin/instructor only)
$rolesRes = $conn->query("
  SELECT 1
  FROM user_roles ur
  INNER JOIN roles r ON r.role_id = ur.role_id
  WHERE ur.user_id = $userId
    AND LOWER(r.name) IN ('admin','superadmin','instructor')
  LIMIT 1
");
if (!$rolesRes || $rolesRes->num_rows === 0) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Insufficient permissions']);
    exit;
}

$title = trim((string) ($input['title'] ?? ''));
$description = trim((string) ($input['description'] ?? ''));
$difficulty = strtolower(trim((string) ($input['difficulty'] ?? '')));
$pointsTotal = (int) ($input['points_total'] ?? -1);
$visibility = strtolower(trim((string) ($input['visibility'] ?? '')));
$isPublishedRaw = $input['is_published'] ?? null;
$icon = trim((string) ($input['icon'] ?? ''));
$launchPath = trim((string) ($input['launch_path'] ?? ''));
$portRaw = $input['port'] ?? null;

if ($title === '' || mb_strlen($title) > 255) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Title is required (max 255 chars)']);
    exit;
}
if ($description === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Description is required']);
    exit;
}
if (!in_array($difficulty, ['easy', 'medium', 'hard'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid difficulty']);
    exit;
}
if ($pointsTotal < 0 || $pointsTotal > 10000) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid points_total range']);
    exit;
}
if (!in_array($visibility, ['public', 'private', 'unlisted'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid visibility']);
    exit;
}

$isPublished = null;
if ($isPublishedRaw !== null) {
    $isPublished = !empty($isPublishedRaw) ? 1 : 0;
}

$port = null;
if ($portRaw !== null && $portRaw !== '') {
    $port = (int) $portRaw;
    if ($port < 1 || $port > 65535) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid port range']);
        exit;
    }
}

$titleEsc = $conn->real_escape_string($title);
$descEsc = $conn->real_escape_string($description);
$difficultyEsc = $conn->real_escape_string($difficulty);
$visibilityEsc = $conn->real_escape_string($visibility);
$iconEsc = $conn->real_escape_string(mb_substr($icon, 0, 16));
$launchEsc = $conn->real_escape_string(mb_substr($launchPath, 0, 255));

$setParts = [
    "title = '$titleEsc'",
    "description = '$descEsc'",
    "difficulty = '$difficultyEsc'",
    "points_total = $pointsTotal",
    "visibility = '$visibilityEsc'",
];
if ($isPublished !== null) {
    $setParts[] = "is_published = $isPublished";
}
if ($icon !== '') {
    $setParts[] = "icon = '$iconEsc'";
}
if ($launchPath !== '') {
    $setParts[] = "launch_path = '$launchEsc'";
}
if ($port !== null) {
    $setParts[] = "port = $port";
}
if ($setParts === []) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No metadata fields to update']);
    exit;
}
$setParts[] = "updated_at = NOW()";

$sql = "UPDATE labs SET " . implode(", ", $setParts) . " WHERE lab_id = $labId LIMIT 1";
$ok = $conn->query($sql);
if (!$ok) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to update lab metadata: ' . $conn->error]);
    exit;
}
if ($conn->affected_rows < 0) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Lab metadata update failed']);
    exit;
}

$readRes = $conn->query("
  SELECT lab_id, title, description, difficulty, points_total, visibility, is_published, icon, launch_path, port
  FROM labs
  WHERE lab_id = $labId
  LIMIT 1
");
if (!$readRes || $readRes->num_rows === 0) {
    echo json_encode(['success' => true, 'message' => 'Lab metadata updated']);
    exit;
}
$lab = $readRes->fetch_assoc();

echo json_encode([
    'success' => true,
    'message' => 'Lab metadata updated',
    'data' => [
        'lab' => [
            'lab_id' => (int) ($lab['lab_id'] ?? 0),
            'title' => (string) ($lab['title'] ?? ''),
            'description' => (string) ($lab['description'] ?? ''),
            'difficulty' => (string) ($lab['difficulty'] ?? 'easy'),
            'points_total' => (int) ($lab['points_total'] ?? 0),
            'visibility' => (string) ($lab['visibility'] ?? 'private'),
            'is_published' => (int) ($lab['is_published'] ?? 0) === 1,
            'icon' => (string) ($lab['icon'] ?? ''),
            'launch_path' => (string) ($lab['launch_path'] ?? ''),
            'port' => isset($lab['port']) ? (int) $lab['port'] : null,
        ],
    ],
]);
