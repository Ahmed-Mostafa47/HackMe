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

$labId = (int)($_GET['lab_id'] ?? $_GET['labId'] ?? 0);
if ($labId < 1) {
    echo json_encode(['success' => false, 'message' => 'Missing lab_id']);
    exit;
}
if ($labId === 11) {
    echo json_encode(['success' => false, 'message' => 'Lab not found']);
    exit;
}

$labRes = $conn->query("
    SELECT
        lab_id, title, description, icon, port, launch_path,
        labtype_id, difficulty, points_total, is_published, visibility,
        CASE WHEN COALESCE(solution, '') <> '' THEN 1 ELSE 0 END AS has_solution
    FROM labs
    WHERE lab_id = $labId
      AND is_published = 1
      AND visibility = 'public'
    LIMIT 1
");

if (!$labRes || $labRes->num_rows === 0) {
    // Built-in white-box access-control labs (listing) when DB rows are missing.
    if ($labId === 18 || $labId === 19) {
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
    }
    echo json_encode(['success' => false, 'message' => 'Lab not found']);
    exit;
}

$lab = $labRes->fetch_assoc();
$lidRow = (int) ($lab['lab_id'] ?? 0);
if ($lidRow === 1 || $lidRow === 18 || $lidRow === 19) {
    $lab['labtype_id'] = 1;
}
if ($lidRow === 18) {
    $lab['title'] = 'Access Control Bypass';
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

echo json_encode([
    'success' => true,
    'message' => 'OK',
    'data' => [
        'lab' => [
            'lab_id' => (int)($lab['lab_id'] ?? 0),
            'title' => (string)($lab['title'] ?? ''),
            'description' => (string)($lab['description'] ?? ''),
            'icon' => (string)($lab['icon'] ?? 'LAB'),
            'port' => isset($lab['port']) ? (int)$lab['port'] : null,
            'launch_path' => (string)($lab['launch_path'] ?? ''),
            'labtype_id' => (int)($lab['labtype_id'] ?? 0),
            'difficulty' => (string)($lab['difficulty'] ?? 'easy'),
            'points_total' => (int)($lab['points_total'] ?? 0),
            'is_published' => (int)($lab['is_published'] ?? 0) === 1,
            'visibility' => (string)($lab['visibility'] ?? 'private'),
            'has_solution' => (int)($lab['has_solution'] ?? 0) === 1,
            'hints' => $hints,
        ],
    ],
]);
