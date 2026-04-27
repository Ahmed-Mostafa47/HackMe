<?php
/**
 * Start Lab Container API - runs docker-compose up -d for the lab
 * Called when user clicks Start Lab so the container is running before opening the URL
 */
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    require_once __DIR__ . '/../../utils/labs_config.php';
    require_once __DIR__ . '/../../utils/db_connect.php';
    require_once __DIR__ . '/../../utils/audit_log.php';
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Config load error']);
    exit;
}

$input = $_SERVER['REQUEST_METHOD'] === 'POST'
    ? (json_decode(file_get_contents('php://input'), true) ?? [])
    : ['lab_id' => (int)($_GET['lab_id'] ?? 0)];

$labId = (int)($input['lab_id'] ?? $input['labId'] ?? 0);
$actorUserId = (int)($input['user_id'] ?? 0);
$actorUsername = trim((string)($input['username'] ?? ''));
$clientLocalIp = trim((string)($input['client_local_ip'] ?? ''));
$clientTimeUtc = trim((string)($input['client_time_utc'] ?? ''));
$clientTimezone = trim((string)($input['client_timezone'] ?? ''));
$clientTzOffsetMinutes = isset($input['client_tz_offset_minutes']) ? (int)$input['client_tz_offset_minutes'] : null;
if ($labId < 1) {
    echo json_encode(['success' => false, 'message' => 'Missing lab_id']);
    exit;
}

// Find lab config by lab_id
$config = null;
foreach ($GLOBALS['LABS_REGISTRY'] ?? [] as $cfg) {
    if (($cfg['lab_id'] ?? 0) === $labId) {
        $config = $cfg;
        break;
    }
}

$writeAudit = function (string $status, string $message, string $labTitle = '', array $extra = []) use (&$conn, $actorUserId, &$actorUsername, $clientLocalIp, $labId, $clientTimeUtc, $clientTimezone, $clientTzOffsetMinutes): void {
    if (!isset($conn) || !$conn || $actorUserId < 1) {
        return;
    }
    if ($actorUsername === '') {
        $actorRes = $conn->query("SELECT username FROM users WHERE user_id = {$actorUserId} LIMIT 1");
        if ($actorRes && $actorRes->num_rows > 0) {
            $row = $actorRes->fetch_assoc();
            $actorUsername = (string)($row['username'] ?? '');
        }
    }
    $details = array_merge([
        'message' => $message,
        'lab_id' => $labId,
        'lab_title' => $labTitle,
        'client_time_utc' => $clientTimeUtc,
        'client_timezone' => $clientTimezone,
        'client_tz_offset_minutes' => $clientTzOffsetMinutes,
    ], $extra);
    hackme_write_audit_log($conn, [
        'actor_user_id' => $actorUserId,
        'actor_username' => $actorUsername,
        'action' => 'lab_start',
        'status' => $status,
        'details' => json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'ip_address' => hackme_client_ip(),
        'client_local_ip' => $clientLocalIp,
        'user_agent' => (string)($_SERVER['HTTP_USER_AGENT'] ?? ''),
    ]);
};

if (!$config) {
    $writeAudit('success', 'Started lab (warning: lab not found in registry)');
    echo json_encode(['success' => false, 'message' => 'Lab not found']);
    exit;
}

$labTitle = trim((string)($config['title'] ?? ''));
$folder = trim((string)($config['folder'] ?? ''));
$basePath = defined('LABS_BASE_PATH') ? rtrim(LABS_BASE_PATH, '\\/') : '';
if ($basePath === '' || $folder === '') {
    $writeAudit('success', 'Started lab (warning: lab path not configured)', $labTitle);
    echo json_encode(['success' => false, 'message' => 'Lab path not configured']);
    exit;
}

$labPath = $basePath . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $folder);
$labPath = realpath($labPath);
if (!$labPath || !is_dir($labPath)) {
    $writeAudit('success', 'Started lab (warning: lab folder not found)', $labTitle);
    echo json_encode(['success' => false, 'message' => 'Lab folder not found: ' . ($config['folder'] ?? '')]);
    exit;
}

$composeFile = $labPath . DIRECTORY_SEPARATOR . ($config['compose_file'] ?? 'docker-compose.yml');
if (!is_file($composeFile)) {
    $writeAudit('success', 'Started lab (warning: docker-compose file not found)', $labTitle);
    echo json_encode(['success' => false, 'message' => 'docker-compose.yml not found']);
    exit;
}

// Try "docker compose" (plugin) first, fallback to "docker-compose" (standalone)
$cmd = 'cd /d "' . str_replace('"', '""', $labPath) . '" && (docker compose up -d 2>nul || docker-compose up -d 2>nul)';
if (strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN') {
    $cmd = 'cd "' . addslashes($labPath) . '" && (docker compose up -d 2>/dev/null || docker-compose up -d 2>/dev/null)';
}
$output = [];
$returnCode = 0;
exec($cmd, $output, $returnCode);

if ($returnCode !== 0) {
    $out = implode("\n", $output);
    $writeAudit(
        'success',
        'Started lab (container start warning)',
        $labTitle,
        ['error_detail' => $out ? substr($out, 0, 200) : 'exec failed']
    );
    echo json_encode([
        'success' => false,
        'message' => 'Failed to start container. Ensure Docker is running.',
        'detail' => $out ? substr($out, 0, 200) : 'exec failed',
    ]);
    exit;
}

$writeAudit('success', 'Started lab successfully', $labTitle);
echo json_encode(['success' => true, 'message' => 'Lab container started']);
