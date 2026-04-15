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
    require_once __DIR__ . '/../../utils/labs_config.php';
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

$wbSqlId = (int) (function_exists('hackme_whitebox_sql_lab_id') ? hackme_whitebox_sql_lab_id() : 11);
$whiteboxIds = [$wbSqlId, 18, 19, 20, 21];
$isWhitebox = in_array($labId, $whiteboxIds, true);

$solution = '';

// Standard path: public published labs.
$labRes = $conn->query("
    SELECT solution
    FROM labs
    WHERE lab_id = $labId
      AND is_published = 1
      AND visibility = 'public'
    LIMIT 1
");
if ($labRes && $labRes->num_rows > 0) {
    $lab = $labRes->fetch_assoc();
    $solution = trim((string)($lab['solution'] ?? ''));
}

// White-box fallback path: if lab exists but not public/published yet.
if ($solution === '' && $isWhitebox) {
    $labAnyRes = $conn->query("
        SELECT solution
        FROM labs
        WHERE lab_id = $labId
        LIMIT 1
    ");
    if ($labAnyRes && $labAnyRes->num_rows > 0) {
        $labAny = $labAnyRes->fetch_assoc();
        $solution = trim((string)($labAny['solution'] ?? ''));
    }
}

// Built-in white-box fallback text when DB row/solution is missing.
if ($solution === '' && $isWhitebox) {
    if ($labId === 18) {
        $solution = "Remove client-controlled role assignment from URL parameters and enforce server-side admin authorization before rendering ADMIN_PANEL (return 403 for non-admin).";
    } elseif ($labId === 19) {
        $solution = "Enforce per-object ownership checks on every server-side read/write path; do not trust identifiers supplied by clients without authorization validation.";
    } elseif ($labId === 20) {
        $solution = "Reflected XSS fix: output-encode user-controlled values in HTML context (e.g., htmlspecialchars with ENT_QUOTES and UTF-8) before rendering.";
    } elseif ($labId === 21) {
        $solution = "DOM XSS fix: replace unsafe innerHTML sink with textContent/createTextNode for untrusted input.";
    } else {
        $solution = "Use parameterized queries with bound parameters and avoid concatenating untrusted input into SQL statements.";
    }
}

if ($solution === '') {
    if ($isWhitebox) {
        echo json_encode(['success' => false, 'message' => 'Solution not available for this white-box lab']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Lab not found']);
    }
    exit;
}

// Mark solution as viewed for scoring penalty.
$markOk = $conn->query("
    INSERT INTO lab_resource_usage (user_id, lab_id, hint_viewed, solution_viewed)
    VALUES ($userId, $labId, 0, 1)
    ON DUPLICATE KEY UPDATE solution_viewed = 1
");

if (!$markOk) {
    // In fallback/dev mode, lab row may not exist yet. Do not block solution display.
    error_log('[HackMe WARNING] get_solution usage mark failed for lab_id=' . $labId . ': ' . $conn->error);
}

echo json_encode([
    'success' => true,
    'message' => 'OK',
    'data' => ['solution' => $solution],
]);
