<?php
declare(strict_types=1);

/**
 * White-box lab: source files from Training Labs on disk + metadata from challenges.whitebox_files_ref
 * GET: lab_id, user_id (must be >= 1)
 */
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
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
    require_once __DIR__ . '/../../utils/labs_config.php';
    require_once __DIR__ . '/../../utils/whitebox_lab1_defaults.php';
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

$labId = (int) ($_GET['lab_id'] ?? $_GET['labId'] ?? 0);
$userId = (int) ($_GET['user_id'] ?? $_GET['userId'] ?? 0);

if ($labId < 1 || $userId < 1) {
    echo json_encode(['success' => false, 'message' => 'Missing lab_id or user_id']);
    exit;
}

$labIdEsc = (int) $labId;
$labRes = $conn->query("
  SELECT lab_id, title, labtype_id, description
  FROM labs
  WHERE lab_id = $labIdEsc AND is_published = 1 AND visibility = 'public'
  LIMIT 1
");
if (!$labRes || $labRes->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Lab not found']);
    exit;
}
$labRow = $labRes->fetch_assoc();
if ($labIdEsc === 1) {
    $labRow['labtype_id'] = 1;
}

$chRes = $conn->query("
  SELECT challenge_id, title, whitebox_files_ref
  FROM challenges
  WHERE lab_id = $labIdEsc AND is_active = 1
  ORDER BY order_index ASC, challenge_id ASC
  LIMIT 1
");
if (!$chRes || $chRes->num_rows === 0) {
    if ($labIdEsc !== 1) {
        echo json_encode(['success' => false, 'message' => 'No challenge for this lab']);
        exit;
    }
    $ch = [
        'challenge_id' => 0,
        'title' => 'SECURE_LOGIN_ENDPOINT',
        'whitebox_files_ref' => hackme_whitebox_lab1_meta_json(),
    ];
} else {
    $ch = $chRes->fetch_assoc();
}

$rawRef = trim((string) ($ch['whitebox_files_ref'] ?? ''));
if ($rawRef === '' && $labIdEsc === 1) {
    $rawRef = hackme_whitebox_lab1_meta_json();
}

if ($rawRef === '') {
    echo json_encode(['success' => false, 'message' => 'This lab is not configured for white-box mode']);
    exit;
}

$meta = json_decode($rawRef, true);
if ((!is_array($meta) || empty($meta['files']) || !is_array($meta['files'])) && $labIdEsc === 1) {
    $meta = hackme_whitebox_lab1_meta();
}

if (!is_array($meta) || empty($meta['files']) || !is_array($meta['files'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid whitebox_files_ref JSON']);
    exit;
}

$labRoot = null;
foreach ($GLOBALS['LABS_REGISTRY'] ?? [] as $cfg) {
    if ((int) ($cfg['lab_id'] ?? 0) !== $labIdEsc) {
        continue;
    }
    $folder = trim((string) ($cfg['folder'] ?? ''));
    $basePath = defined('LABS_BASE_PATH') ? rtrim(LABS_BASE_PATH, '\\/') : '';
    if ($basePath === '' || $folder === '') {
        break;
    }
    $joined = $basePath . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $folder);
    $labRoot = realpath($joined) ?: null;
    break;
}

if ($labRoot === null || !is_dir($labRoot)) {
    echo json_encode([
        'success' => false,
        'message' => 'Lab sources path is not available on the server. Set LABS_BASE_PATH in server/utils/labs_config.php to your Training Labs root.',
    ]);
    exit;
}

$filesOut = [];
foreach ($meta['files'] as $f) {
    if (!is_array($f)) {
        continue;
    }
    $rel = trim((string) ($f['relative_path'] ?? $f['path'] ?? ''));
    $rel = str_replace(['\\', "\0"], ['/', ''], $rel);
    if ($rel === '' || strpos($rel, '..') !== false) {
        continue;
    }
    $abs = realpath($labRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel));
    if ($abs === false || !hackme_path_is_under_lab_root($abs, $labRoot)) {
        continue;
    }
    if (!is_file($abs) || !is_readable($abs)) {
        continue;
    }
    $content = file_get_contents($abs);
    if ($content === false) {
        continue;
    }
    if (strlen($content) > 512000) {
        $content = substr($content, 0, 512000) . "\n/* … truncated for IDE … */\n";
    }
    $filesOut[] = [
        'id' => (string) ($f['id'] ?? basename($rel)),
        'display_name' => (string) ($f['display_name'] ?? basename($rel)),
        'relative_path' => $rel,
        'vulnerable_line' => isset($f['vulnerable_line']) ? (int) $f['vulnerable_line'] : null,
        'content' => $content,
    ];
}

if ($filesOut === []) {
    echo json_encode(['success' => false, 'message' => 'No readable source files matched the lab configuration']);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'OK',
    'data' => [
        'lab' => [
            'lab_id' => (int) ($labRow['lab_id'] ?? 0),
            'title' => (string) ($labRow['title'] ?? ''),
            'description' => (string) ($labRow['description'] ?? ''),
            'labtype_id' => (int) ($labRow['labtype_id'] ?? 0),
        ],
        'challenge' => [
            'challenge_id' => (int) ($ch['challenge_id'] ?? 0),
            'title' => (string) ($ch['title'] ?? ''),
        ],
        'verify_profile' => (string) ($meta['verify_profile'] ?? ''),
        'verification_help' => 'Submissions are checked in an isolated temp file: PHP syntax (php -l) plus static rules ensuring SQL is parameterized (no username/password concatenated into query strings).',
        'files' => $filesOut,
    ],
]);
