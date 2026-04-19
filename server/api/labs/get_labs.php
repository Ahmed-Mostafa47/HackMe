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
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed', 'data' => ['labs' => []]]);
    exit;
}

try {
    require_once __DIR__ . '/../../utils/db_connect.php';
    require_once __DIR__ . '/../../utils/labs_config.php';
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Load error', 'data' => ['labs' => []]]);
    exit;
}

if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed', 'data' => ['labs' => []]]);
    exit;
}

$conn->set_charset('utf8mb4');

$wbSqlListId = (int) (defined('HACKME_WHITEBOX_SQL_LAB_ID') ? HACKME_WHITEBOX_SQL_LAB_ID : 11);

$res = $conn->query("
    SELECT
        l.lab_id,
        l.title,
        l.description,
        l.icon,
        l.port,
        l.launch_path,
        l.labtype_id,
        l.difficulty,
        l.points_total,
        l.is_published,
        l.visibility,
        COALESCE(COUNT(DISTINCT h.hint_id), 0) AS hints_count
    FROM labs l
    LEFT JOIN challenges c ON c.lab_id = l.lab_id AND c.is_active = 1
    LEFT JOIN hints h ON h.challenge_id = c.challenge_id
    WHERE l.is_published = 1
      AND l.visibility = 'public'
    GROUP BY
        l.lab_id, l.title, l.description, l.icon, l.port, l.launch_path,
        l.labtype_id, l.difficulty, l.points_total, l.is_published, l.visibility
    ORDER BY l.lab_id ASC
");

if (!$res) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB query error', 'data' => ['labs' => []]]);
    exit;
}

$labs = [];
while ($row = $res->fetch_assoc()) {
    $labId = (int) ($row['lab_id'] ?? 0);
    if ($labId === 11 && $wbSqlListId !== 11) {
        continue;
    }
    $labtypeId = (int) ($row['labtype_id'] ?? 0);
    if ($labId === $wbSqlListId || $labId === 18 || $labId === 19) {
        $labtypeId = 1;
    }
    // Lab 1 is the black-box SQL injection lab (white-box SQL uses HACKME_WHITEBOX_SQL_LAB_ID).
    if ($labId === 1) {
        $labtypeId = 2;
    }
    $title = (string) ($row['title'] ?? '');
    if ($labId === 18) {
        $title = 'Access Control Bypass';
    }
    if ($labId === 20) {
        $title = 'Reflected XSS (White-box)';
    }
    if ($labId === 21) {
        $title = 'DOM XSS (White-box)';
    }
    $labs[] = [
        'lab_id' => $labId,
        'title' => $title,
        'description' => (string)($row['description'] ?? ''),
        'icon' => (string)($row['icon'] ?? 'LAB'),
        'port' => isset($row['port']) ? (int)$row['port'] : null,
        'launch_path' => (string)($row['launch_path'] ?? ''),
        'labtype_id' => $labtypeId,
        'difficulty' => (string)($row['difficulty'] ?? 'easy'),
        'points_total' => (int)($row['points_total'] ?? 0),
        'is_published' => (int)($row['is_published'] ?? 0) === 1,
        'visibility' => (string)($row['visibility'] ?? 'private'),
        'hints_count' => (int)($row['hints_count'] ?? 0),
    ];
}

// White-box access-control cards (same category idea as Black Box) even if DB seed was not applied.
$present = [];
foreach ($labs as $L) {
    $present[(int) ($L['lab_id'] ?? 0)] = true;
}
$defaults = [
    18 => [
        'title' => 'Access Control Bypass',
        'description' => 'White-box: review the PHP bundle; client input must not set session role before ADMIN_PANEL.',
        'icon' => '🔓',
        'port' => 4003,
        'launch_path' => '/lab/1',
        'points_total' => 100,
    ],
    19 => [
        'title' => 'IDOR (White-box)',
        'description' => 'White-box: URL user_id switches profiles — patch sources to bind access to the session user and deny horizontal access.',
        'icon' => '🔓',
        'port' => 4003,
        'launch_path' => '/lab/2',
        'points_total' => 100,
    ],
    20 => [
        'title' => 'Reflected XSS (White-box)',
        'description' => 'White-box reflected XSS: review vulnerable source and apply output encoding fix.',
        'icon' => '⚡',
        'port' => 4001,
        'launch_path' => '/',
        'points_total' => 100,
    ],
    21 => [
        'title' => 'DOM XSS (White-box)',
        'description' => 'White-box DOM XSS: replace unsafe DOM sink with safe text rendering.',
        'icon' => '⚡',
        'port' => 4002,
        'launch_path' => '/',
        'points_total' => 100,
    ],
];
foreach ($defaults as $lid => $meta) {
    if (!isset($present[$lid])) {
        $labs[] = [
            'lab_id' => $lid,
            'title' => $meta['title'],
            'description' => $meta['description'],
            'icon' => $meta['icon'],
            'port' => $meta['port'],
            'launch_path' => $meta['launch_path'],
            'labtype_id' => 1,
            'difficulty' => 'medium',
            'points_total' => $meta['points_total'],
            'is_published' => true,
            'visibility' => 'public',
            'hints_count' => 0,
        ];
    }
}
usort($labs, static function ($a, $b) {
    return ((int) ($a['lab_id'] ?? 0)) <=> ((int) ($b['lab_id'] ?? 0));
});

echo json_encode([
    'success' => true,
    'message' => 'OK',
    'data' => ['labs' => $labs],
]);
