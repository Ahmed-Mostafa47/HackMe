<?php
declare(strict_types=1);

/**
 * Submit white-box fix (file + line + replacement). Verifies in temp sandbox, then records graded solve once.
 * POST JSON: lab_id, user_id?, access_token?, source_file (relative_path), line, replacement_code
 */
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
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
    require_once __DIR__ . '/../../utils/labs_config.php';
    require_once __DIR__ . '/../../utils/whitebox_lab1_defaults.php';
    require_once __DIR__ . '/../../utils/whitebox_sqli_verify.php';
    require_once __DIR__ . '/../../utils/lab_completion_helper.php';
    require_once __DIR__ . '/../../utils/lab_production_state.php';
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Load error', 'data' => ['points_earned' => 0]]);
    exit;
}

if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed', 'data' => ['points_earned' => 0]]);
    exit;
}

$conn->set_charset('utf8mb4');

$input = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($input)) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON', 'data' => ['points_earned' => 0]]);
    exit;
}

$labId = (int) ($input['lab_id'] ?? $input['labId'] ?? 0);
$userId = (int) ($input['user_id'] ?? $input['userId'] ?? 0);
$accessToken = trim((string) ($input['access_token'] ?? ''));

if ($userId < 1 && $accessToken !== '' && $labId >= 1) {
    $atEsc = $conn->real_escape_string($accessToken);
    $labIdInt = (int) $labId;
    $tr = $conn->query(
        "SELECT user_id FROM lab_access_tokens WHERE token = '$atEsc' AND lab_id = $labIdInt " .
        "AND expires_at > NOW() LIMIT 1"
    );
    if ($tr && ($trow = $tr->fetch_assoc())) {
        $userId = (int) ($trow['user_id'] ?? 0);
    }
}

$sourceFile = trim((string) ($input['source_file'] ?? $input['sourceFile'] ?? ''));
$sourceFile = str_replace(['\\', "\0"], ['/', ''], $sourceFile);
$line = (int) ($input['line'] ?? $input['line_number'] ?? 0);
$replacement = (string) ($input['replacement_code'] ?? $input['replacementCode'] ?? '');

if ($labId < 1 || $userId < 1) {
    echo json_encode(['success' => false, 'message' => 'Missing lab_id or authenticated user', 'data' => ['points_earned' => 0]]);
    exit;
}
if ($labId !== hackme_whitebox_sql_lab_id()) {
    echo json_encode([
        'success' => false,
        'message' => 'White-box submission is only for lab_id ' . hackme_whitebox_sql_lab_id() . ' (SQL white-box).',
        'data' => ['points_earned' => 0],
    ]);
    exit;
}
if ($sourceFile === '' || strpos($sourceFile, '..') !== false) {
    echo json_encode(['success' => false, 'message' => 'Invalid source_file', 'data' => ['points_earned' => 0]]);
    exit;
}
if ($line < 1) {
    echo json_encode(['success' => false, 'message' => 'Invalid line number', 'data' => ['points_earned' => 0]]);
    exit;
}
if (strlen($replacement) > 8000) {
    echo json_encode(['success' => false, 'message' => 'Replacement code is too long', 'data' => ['points_earned' => 0]]);
    exit;
}
$nlCount = substr_count($replacement, "\n");
if ($nlCount > 120) {
    echo json_encode(['success' => false, 'message' => 'Replacement spans too many lines', 'data' => ['points_earned' => 0]]);
    exit;
}

$labIdEsc = (int) $labId;
$prodState = hackme_whitebox_production_state($conn, $labIdEsc);

$chRes = $conn->query("
  SELECT challenge_id, whitebox_files_ref
  FROM challenges
  WHERE lab_id = $labIdEsc AND is_active = 1
  ORDER BY order_index ASC, challenge_id ASC
  LIMIT 1
");
$chRow = null;
if ($chRes && $chRes->num_rows > 0) {
    $chRow = $chRes->fetch_assoc();
}

$meta = null;
$rawMeta = $chRow !== null ? trim((string) ($chRow['whitebox_files_ref'] ?? '')) : '';
if ($rawMeta !== '') {
    $meta = json_decode($rawMeta, true);
}
if (!is_array($meta) || empty($meta['files']) || !is_array($meta['files'])) {
    $meta = hackme_whitebox_lab1_meta();
    if (!$prodState['lab_in_db']) {
        error_log('[HackMe CRITICAL] submit_whitebox_fix: lab_id=' . $labIdEsc . ' not in DB; verification may run in demo mode only.');
    } elseif (!$prodState['whitebox_ref_valid']) {
        error_log('[HackMe WARNING] submit_whitebox_fix: lab_id=' . $labIdEsc . ' missing/invalid whitebox_files_ref; using built-in meta for verify + graded completion.');
    }
}

if (!is_array($meta) || empty($meta['files']) || !is_array($meta['files'])) {
    echo json_encode(['success' => false, 'message' => 'Lab not in white-box mode', 'data' => ['points_earned' => 0]]);
    exit;
}

if ($chRow === null) {
    $chRow = [
        'challenge_id' => 0,
        'whitebox_files_ref' => json_encode($meta, JSON_UNESCAPED_SLASHES),
    ];
}

$allowed = null;
$expectedLine = null;
foreach ($meta['files'] as $f) {
    if (!is_array($f)) {
        continue;
    }
    $rel = trim((string) ($f['relative_path'] ?? $f['path'] ?? ''));
    $rel = str_replace('\\', '/', $rel);
    if ($rel === $sourceFile || $rel === ltrim($sourceFile, '/')) {
        $allowed = $rel;
        $expectedLine = isset($f['vulnerable_line']) ? (int) $f['vulnerable_line'] : null;
        break;
    }
}
if ($allowed === null) {
    echo json_encode(['success' => false, 'message' => 'File is not part of this lab bundle', 'data' => ['points_earned' => 0]]);
    exit;
}
if ($expectedLine !== null && $expectedLine > 0 && $line !== $expectedLine) {
    echo json_encode([
        'success' => false,
        'message' => 'Wrong line: the vulnerable assignment is on line ' . $expectedLine . '.',
        'data' => ['points_earned' => 0, 'expected_line' => $expectedLine],
    ]);
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
if ($labRoot === null) {
    echo json_encode(['success' => false, 'message' => 'Lab root not configured', 'data' => ['points_earned' => 0]]);
    exit;
}

$abs = realpath($labRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $allowed));
if ($abs === false || !hackme_path_is_under_lab_root($abs, $labRoot) || !is_readable($abs)) {
    echo json_encode(['success' => false, 'message' => 'Source file not found on server', 'data' => ['points_earned' => 0]]);
    exit;
}

$original = (string) file_get_contents($abs);
$profile = (string) ($meta['verify_profile'] ?? '');
if ($profile === '') {
    $profile = 'lab1_sqli_login';
}
if ($profile !== 'lab1_sqli_login') {
    echo json_encode(['success' => false, 'message' => 'Unsupported verify_profile', 'data' => ['points_earned' => 0]]);
    exit;
}

$v = whitebox_lab1_apply_and_verify($original, $line, $replacement);
if (!$v['ok']) {
    echo json_encode([
        'success' => false,
        'message' => $v['message'],
        'data' => ['points_earned' => 0, 'stage' => 'verify'],
    ]);
    exit;
}

if (!$prodState['lab_in_db']) {
    error_log('[HackMe WARNING] submit_whitebox_fix: lab_id=' . $labIdEsc . ' has no labs row yet; recording completion anyway (helper may INSERT lab/challenge).');
}

$result = hackme_record_lab_completion($conn, $labId, $userId, hackme_whitebox_sql_payload_mark(), 'whitebox');
echo json_encode([
    'success' => (bool) ($result['success'] ?? false),
    'message' => (string) ($result['message'] ?? ''),
    'data' => [
        'points_earned' => (int) ($result['points_earned'] ?? 0),
        'already_solved' => (bool) ($result['already_solved'] ?? false),
        'verify_detail' => $v['message'],
        'demo_mode' => false,
        'scoring_allowed' => true,
        'setup_incomplete' => $prodState['setup_incomplete'],
        'lab_unregistered' => !$prodState['lab_in_db'],
    ],
]);
