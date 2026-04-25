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

$input = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
    exit;
}

$userId = (int) ($input['user_id'] ?? 0);
$token = trim((string) ($input['upload_token'] ?? ''));

if (!hackme_user_is_instructor_or_admin($conn, $userId)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Insufficient permissions']);
    exit;
}

$manifest = hackme_load_staged_manifest($token);
if (!$manifest) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid or expired upload token']);
    exit;
}

$meta = $manifest['metadata'] ?? [];
$title = trim((string) ($meta['title'] ?? ''));
$difficulty = strtolower(trim((string) ($meta['difficulty'] ?? 'medium')));
$category = trim((string) ($meta['category'] ?? 'General'));
$type = strtolower(trim((string) ($meta['type'] ?? 'whitebox')));

if ($title === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Staged metadata is incomplete']);
    exit;
}

$labtypeId = $type === 'blackbox' ? 2 : 1;
$icon = '🧪';
if (stripos($category, 'xss') !== false) {
    $icon = '⚡';
} elseif (stripos($category, 'sql') !== false) {
    $icon = '💉';
} elseif (stripos($category, 'access') !== false) {
    $icon = '🔓';
}

$storageRoot = hackme_lab_storage_root();
if (!hackme_ensure_dir($storageRoot)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to initialize storage root']);
    exit;
}

$labSlug = hackme_slugify($title) . '-' . date('Ymd-His');
$targetDir = $storageRoot . DIRECTORY_SEPARATOR . $labSlug;
$targetContentDir = $targetDir . DIRECTORY_SEPARATOR . 'content';
if (!hackme_ensure_dir($targetContentDir)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to create lab storage directory']);
    exit;
}

$extractDir = (string) ($manifest['extract_dir'] ?? '');
if (!is_dir($extractDir)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Staged extraction directory not found']);
    exit;
}

$items = scandir($extractDir);
if (!is_array($items)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to read staged content']);
    exit;
}
foreach ($items as $item) {
    if ($item === '.' || $item === '..') {
        continue;
    }
    $src = $extractDir . DIRECTORY_SEPARATOR . $item;
    $dst = $targetContentDir . DIRECTORY_SEPARATOR . $item;
    if (@rename($src, $dst)) {
        continue;
    }
    // Fallback copy when rename across drives fails.
    if (is_file($src)) {
        @copy($src, $dst);
    } elseif (is_dir($src)) {
        hackme_ensure_dir($dst);
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($src, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($iterator as $node) {
            $nodePath = $node->getPathname();
            $rel = substr($nodePath, strlen($src) + 1);
            $destPath = $dst . DIRECTORY_SEPARATOR . $rel;
            if ($node->isDir()) {
                hackme_ensure_dir($destPath);
            } else {
                hackme_ensure_dir(dirname($destPath));
                @copy($nodePath, $destPath);
            }
        }
    }
}

$descRel = 'content/description.pdf';
$hintsRel = 'content/hints.pdf';
$solutionRel = 'content/solution.pdf';
$filesRef = json_encode([
    'package' => $labSlug,
    'root' => 'lab-files',
], JSON_UNESCAPED_SLASHES);

$titleEsc = $conn->real_escape_string($title);
$descEsc = $conn->real_escape_string('Uploaded lab package: ' . $category);
$difficultyEsc = $conn->real_escape_string(in_array($difficulty, ['easy', 'medium', 'hard'], true) ? $difficulty : 'medium');
$iconEsc = $conn->real_escape_string($icon);
$dockerEsc = $conn->real_escape_string('uploaded/' . $labSlug);
$launchEsc = $conn->real_escape_string('/');

$insertLabSql = "
  INSERT INTO labs
  (title, description, solution, icon, port, launch_path, labtype_id, difficulty, points_total, created_by, is_published, visibility, docker_image, reset_interval)
  VALUES
  ('$titleEsc', '$descEsc', '', '$iconEsc', NULL, '$launchEsc', $labtypeId, '$difficultyEsc', 100, $userId, 0, 'private', '$dockerEsc', 3600)
";
if (!$conn->query($insertLabSql)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to save lab metadata: ' . $conn->error]);
    exit;
}

$labId = (int) $conn->insert_id;
if ($labId < 1) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to allocate lab id']);
    exit;
}

$challengeTitle = $conn->real_escape_string('UPLOADED_PACKAGE_CHALLENGE');
$statement = $conn->real_escape_string('Lab uploaded via secure ZIP workflow.');
$filesRefEsc = $conn->real_escape_string((string) $filesRef);
$insertChSql = "
  INSERT INTO challenges
  (lab_id, created_by, title, statement, order_index, max_score, difficulty, is_active, whitebox_files_ref)
  VALUES
  ($labId, $userId, '$challengeTitle', '$statement', 1, 100, '$difficultyEsc', 1, '$filesRefEsc')
";
$conn->query($insertChSql);
$challengeId = (int) $conn->insert_id;

$insertFile = function (string $filename, string $mime) use ($conn, $userId, $labId, $targetContentDir) {
    $path = $targetContentDir . DIRECTORY_SEPARATOR . $filename;
    if (!is_file($path)) {
        return;
    }
    $size = filesize($path);
    $checksum = hash_file('sha256', $path) ?: '';
    $pathEsc = $conn->real_escape_string($path);
    $nameEsc = $conn->real_escape_string($filename);
    $mimeEsc = $conn->real_escape_string($mime);
    $sumEsc = $conn->real_escape_string($checksum);
    $sizeInt = (int) ($size ?: 0);
    $conn->query("
      INSERT INTO file_resources (owner_id, lab_id, filename, path, mime_type, size, checksum, access_level)
      VALUES ($userId, $labId, '$nameEsc', '$pathEsc', '$mimeEsc', $sizeInt, '$sumEsc', 'restricted')
    ");
};

$insertFile('description.pdf', 'application/pdf');
$insertFile('hints.pdf', 'application/pdf');
$insertFile('solution.pdf', 'application/pdf');

hackme_recursive_remove((string) ($manifest['stage_dir'] ?? ''));

echo json_encode([
    'success' => true,
    'message' => 'Lab package saved',
    'data' => [
        'lab_id' => $labId,
        'challenge_id' => $challengeId,
        'title' => $title,
        'category' => $category,
        'type' => $type,
        'uploaded_documents' => [
            'description' => is_file($targetContentDir . DIRECTORY_SEPARATOR . 'description.pdf') ? $descRel : null,
            'hints' => is_file($targetContentDir . DIRECTORY_SEPARATOR . 'hints.pdf') ? $hintsRel : null,
            'solution' => is_file($targetContentDir . DIRECTORY_SEPARATOR . 'solution.pdf') ? $solutionRel : null,
        ],
        'warnings' => $manifest['warnings'] ?? [],
    ],
]);
