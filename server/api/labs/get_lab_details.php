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
    require_once __DIR__ . '/../../utils/labs_config.php';
    require_once __DIR__ . '/../../utils/whitebox_lab1_defaults.php';
    require_once __DIR__ . '/../../utils/lab_production_state.php';
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

$labId = (int)($_GET['lab_id'] ?? $_GET['labId'] ?? 0);
if ($labId < 1) {
    echo json_encode(['success' => false, 'message' => 'Missing lab_id']);
    exit;
}

$wbSqlId = hackme_whitebox_sql_lab_id();
// Legacy duplicate listing row: hide lab 11 only when it is not the configured SQL white-box id.
if ($labId === 11 && $wbSqlId !== 11) {
    echo json_encode(['success' => false, 'message' => 'Lab not found']);
    exit;
}

$mapped = function_exists('hackme_whitebox_of_lab_id') ? hackme_whitebox_of_lab_id($labId) : null;
$isMappedWhitebox = is_int($mapped) && $mapped > 0;
$wbState = $isMappedWhitebox ? hackme_whitebox_production_state($conn, $labId) : null;

$labSelect = "
    SELECT
        lab_id, title, description, icon, port, launch_path,
        labtype_id, difficulty, points_total, is_published, visibility,
        CASE WHEN COALESCE(solution, '') <> '' THEN 1 ELSE 0 END AS has_solution
    FROM labs
";

$labPubRes = $conn->query($labSelect . " WHERE lab_id = $labId AND is_published = 1 AND visibility = 'public' LIMIT 1");

if ($labPubRes && $labPubRes->num_rows > 0) {
    $lab = $labPubRes->fetch_assoc();
} elseif ($isMappedWhitebox) {
    $labAnyRes = $conn->query($labSelect . " WHERE lab_id = $labId LIMIT 1");
    if ($labAnyRes && $labAnyRes->num_rows > 0) {
        error_log('[HackMe WARNING] get_lab_details: whitebox lab_id=' . $labId . ' exists but is not published/public; UI fallback row.');
        $lab = $labAnyRes->fetch_assoc();
    } else {
        error_log('[HackMe CRITICAL] get_lab_details: whitebox lab_id=' . $labId . ' missing from labs; UI fallback only.');
        // Generic fallback; title/description may be overridden from mapped black-box lab below.
        $lab = [
            'lab_id' => $labId,
            'title' => 'WHITEBOX_LAB_' . $labId,
            'description' => '',
            'icon' => '💉',
            'port' => null,
            'launch_path' => '',
            'labtype_id' => 1,
            'difficulty' => 'medium',
            'points_total' => 0,
            'is_published' => 1,
            'visibility' => 'public',
            'has_solution' => 0,
        ];
    }
} elseif ($labId === 18 || $labId === 19) {
    $is18 = $labId === 18;
    echo json_encode([
        'success' => true,
        'message' => 'OK',
        'data' => [
            'lab' => [
                'lab_id' => $labId,
                'title' => $is18 ? 'Access Control Bypass' : 'ACCESS_CONTROL_WHITEBOX_19',
                'description' => $is18
                    ? 'White-box workbench: fix admin_panel.php — the URL ?role=admin poisons $_SESSION so anyone reaches ADMIN_PANEL. Patch the highlighted line in the source.'
                    : 'Access control (WHITE_BOX listing): IDOR / horizontal access; capture the lab flag.',
                'icon' => '🔓',
                'port' => 4003,
                'launch_path' => $is18 ? '/lab/1' : '/lab/2',
                'labtype_id' => 1,
                'difficulty' => 'medium',
                'points_total' => 100,
                'is_published' => true,
                'visibility' => 'public',
                'has_solution' => false,
                'hints' => $is18
                    ? [
                        'Compare user vs admin API responses for the same endpoint.',
                        'If a feature is hidden in the UI, try calling its API path directly.',
                    ]
                    : [
                        'Try predictable or sequential IDs on object references.',
                        'Confirm whether the server re-checks ownership on every read.',
                    ],
            ],
        ],
    ]);
    exit;
} else {
    echo json_encode(['success' => false, 'message' => 'Lab not found']);
    exit;
}

$lidRow = (int) ($lab['lab_id'] ?? 0);
if ($isMappedWhitebox || $lidRow === 18 || $lidRow === 19) {
    $lab['labtype_id'] = 1;
}
if ($lidRow === 1) {
    $lab['labtype_id'] = 2;
}
if ($lidRow === 18) {
    $lab['title'] = 'Access Control Bypass';
}

// White-box display: unify title/description with mapped black-box lab (e.g. lab 11 -> lab 1).
if (is_int($mapped) && $mapped > 0) {
    $mid = (int) $mapped;
    $mRes = $conn->query("SELECT title, description FROM labs WHERE lab_id = $mid LIMIT 1");
    if ($mRes && $mRes->num_rows > 0) {
        $mrow = $mRes->fetch_assoc();
        $mt = trim((string) ($mrow['title'] ?? ''));
        $md = trim((string) ($mrow['description'] ?? ''));
        if ($mt !== '') {
            $lab['title'] = $mt;
        }
        if ($md !== '') {
            $lab['description'] = $md;
        }
    }
}

$hintsRes = $conn->query("
    SELECT h.text
    FROM hints h
    INNER JOIN challenges c ON c.challenge_id = h.challenge_id
    WHERE c.lab_id = $labId
      AND c.is_active = 1
    ORDER BY c.order_index ASC, h.hint_id ASC
");

$hints = [];
if ($hintsRes) {
    while ($h = $hintsRes->fetch_assoc()) {
        $text = trim((string)($h['text'] ?? ''));
        if ($text !== '') {
            $hints[] = $text;
        }
    }
}

$data = [
    'lab' => [
        'lab_id' => (int) ($lab['lab_id'] ?? 0),
        'title' => (string) ($lab['title'] ?? ''),
        'description' => (string) ($lab['description'] ?? ''),
        'icon' => (string) ($lab['icon'] ?? 'LAB'),
        'port' => isset($lab['port']) ? (int) $lab['port'] : null,
        'launch_path' => (string) ($lab['launch_path'] ?? ''),
        'labtype_id' => (int) ($lab['labtype_id'] ?? 0),
        'difficulty' => (string) ($lab['difficulty'] ?? 'easy'),
        'points_total' => (int) ($lab['points_total'] ?? 0),
        'is_published' => (int) ($lab['is_published'] ?? 0) === 1,
        'visibility' => (string) ($lab['visibility'] ?? 'private'),
        'has_solution' => (int) ($lab['has_solution'] ?? 0) === 1,
        'hints' => $hints,
    ],
];

if ($isMappedWhitebox && $wbState !== null) {
    $data['lab_unregistered'] = !$wbState['lab_in_db'];
    $data['setup_incomplete'] = $wbState['setup_incomplete'];
    $data['scoring_allowed'] = $wbState['scoring_allowed'];
}

echo json_encode([
    'success' => true,
    'message' => 'OK',
    'data' => $data,
]);
