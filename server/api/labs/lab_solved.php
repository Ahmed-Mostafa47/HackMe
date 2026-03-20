<?php
/**
 * Lab Solved API - Same flow as lab 1 (submit_flag): points + leaderboard.
 * NO flag required. NO new tables. Uses: lab_access_tokens, lab_instances, submissions, leaderboard.
 * Accepts lab_id + token. Verifies token, gets user_id, credits points.
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
    require_once __DIR__ . '/../../utils/db_connect.php';
    require_once __DIR__ . '/../../utils/labs_config.php';
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

// Ensure table for hint/solution usage exists.
$conn->query("
  CREATE TABLE IF NOT EXISTS lab_resource_usage (
    usage_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    lab_id INT NOT NULL,
    hint_viewed TINYINT(1) NOT NULL DEFAULT 0,
    solution_viewed TINYINT(1) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_lab (user_id, lab_id)
  )
");

$input = $_SERVER['REQUEST_METHOD'] === 'POST'
    ? (json_decode(file_get_contents('php://input'), true) ?? [])
    : ['lab_id' => (int)($_GET['lab_id'] ?? 0), 'token' => trim((string)($_GET['token'] ?? ''))];

$labId = (int)($input['lab_id'] ?? $input['labId'] ?? 0);
$token = trim((string)($input['token'] ?? ''));

if ($labId < 1 || $token === '') {
    echo json_encode(['success' => false, 'message' => 'Missing lab_id or token', 'data' => ['points_earned' => 0]]);
    exit;
}

$tokenEsc = $conn->real_escape_string($token);
$labIdEsc = (int)$labId;

// Verify token and get user_id from lab_access_tokens (existing table)
$res = $conn->query("
  SELECT user_id FROM lab_access_tokens
  WHERE token = '$tokenEsc'
    AND lab_id = $labIdEsc
    AND expires_at > NOW()
  LIMIT 1
");

if (!$res || $res->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid or expired token', 'data' => ['points_earned' => 0]]);
    exit;
}

$row = $res->fetch_assoc();
$userId = (int)($row['user_id'] ?? 0);
if ($userId < 1) {
    echo json_encode(['success' => false, 'message' => 'Token has no associated user', 'data' => ['points_earned' => 0]]);
    exit;
}

// Points from labs_config (same source as get_labs)
$points = 100;
foreach ($GLOBALS['LABS_REGISTRY'] ?? [] as $cfg) {
    if (($cfg['lab_id'] ?? 0) === $labId) {
        $points = (int)($cfg['points'] ?? 100);
        break;
    }
}
if ($points <= 0) {
    $labRow = $conn->query("SELECT points_total FROM labs WHERE lab_id = $labIdEsc LIMIT 1");
    if ($labRow && $labRow->num_rows > 0) {
        $lab = $labRow->fetch_assoc();
        $points = (int)($lab['points_total'] ?? 100);
    }
}
if ($points <= 0) {
    $points = 100;
}

// Apply score penalties based on viewed resources in this lab.
// Hint viewed: -25%, Solution viewed: -75% (cumulative, capped at 100%).
$penaltyRes = $conn->query("
  SELECT hint_viewed, solution_viewed
  FROM lab_resource_usage
  WHERE user_id = $userId AND lab_id = $labIdEsc
  LIMIT 1
");
if ($penaltyRes && $penaltyRes->num_rows > 0) {
    $penaltyRow = $penaltyRes->fetch_assoc();
    $hintViewed = ((int)($penaltyRow['hint_viewed'] ?? 0) === 1);
    $solutionViewed = ((int)($penaltyRow['solution_viewed'] ?? 0) === 1);
    $penaltyPercent = 0;
    if ($hintViewed) {
        $penaltyPercent += 25;
    }
    if ($solutionViewed) {
        $penaltyPercent += 75;
    }
    if ($penaltyPercent > 100) {
        $penaltyPercent = 100;
    }
    $points = (int) floor($points * (1 - ($penaltyPercent / 100)));
}

// Get challenge for lab (existing tables - no new table)
$chRes = $conn->query("SELECT challenge_id FROM challenges WHERE lab_id = $labIdEsc ORDER BY challenge_id ASC LIMIT 1");
$challengeId = null;
if ($chRes && $chRes->num_rows > 0) {
    $challengeId = (int)$chRes->fetch_assoc()['challenge_id'];
}

// If lab/challenge missing, insert rows into EXISTING tables (no CREATE TABLE)
if (!$challengeId) {
    $creator = $conn->query("SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1");
    $creatorId = 1;
    if ($creator && $creator->num_rows > 0) {
        $creatorId = (int)$creator->fetch_assoc()['user_id'];
    }
    $conn->query("INSERT IGNORE INTO labs (lab_id, title, description, labtype_id, difficulty, points_total, created_by, is_published, visibility, docker_image, reset_interval)
      VALUES ($labIdEsc, 'Lab $labIdEsc', 'Lab completion', 1, 'medium', $points, $creatorId, 1, 'public', '', 3600)");
    $chMax = $conn->query("SELECT COALESCE(MAX(challenge_id), 0) + 1 AS next_id FROM challenges");
    $nextCh = $chMax && $chMax->num_rows > 0 ? (int)$chMax->fetch_assoc()['next_id'] : 6;
    $conn->query("INSERT IGNORE INTO challenges (challenge_id, lab_id, created_by, title, statement, order_index, max_score, difficulty, is_active)
      VALUES ($nextCh, $labIdEsc, $creatorId, 'LAB_COMPLETION', 'Lab completed', 1, $points, 'medium', 1)");
    $chRes = $conn->query("SELECT challenge_id FROM challenges WHERE lab_id = $labIdEsc LIMIT 1");
    if ($chRes && $chRes->num_rows > 0) {
        $challengeId = (int)$chRes->fetch_assoc()['challenge_id'];
    }
}

if (!$challengeId) {
    echo json_encode(['success' => false, 'message' => 'No challenge for lab', 'data' => ['points_earned' => 0]]);
    exit;
}

// Check if already solved (same logic as submit_flag for lab 1)
$check = $conn->query("
  SELECT 1 FROM submissions s
  JOIN lab_instances li ON li.instance_id = s.instance_id
  WHERE li.lab_id = $labIdEsc AND s.user_id = $userId AND s.status = 'graded'
  LIMIT 1
");
if ($check && $check->num_rows > 0) {
    echo json_encode(['success' => true, 'message' => 'LAB_ALREADY_SOLVED', 'data' => ['points_earned' => 0]]);
    exit;
}

// Get or create lab_instance (same as submit_flag)
$inst = $conn->query("SELECT instance_id FROM lab_instances WHERE lab_id = $labIdEsc AND user_id = $userId AND status = 'running' ORDER BY instance_id DESC LIMIT 1");
if ($inst && $inst->num_rows > 0) {
    $instanceId = (int)$inst->fetch_assoc()['instance_id'];
} else {
    $conn->query("INSERT INTO lab_instances (lab_id, user_id, container_id, status) VALUES ($labIdEsc, $userId, 'web_sandbox', 'running')");
    $instanceId = (int)$conn->insert_id;
    if ($instanceId < 1) {
        echo json_encode(['success' => false, 'message' => 'Failed to create lab instance', 'data' => ['points_earned' => 0]]);
        exit;
    }
}

// Insert submission (same structure as submit_flag - no flag, type 'flag', payload 'lab_completed')
$payloadEsc = $conn->real_escape_string('lab_completed');
$ok = $conn->query("INSERT INTO submissions (instance_id, user_id, challenge_id, type, payload_text, auto_score, final_score, status)
  VALUES ($instanceId, $userId, $challengeId, 'flag', '$payloadEsc', $points, $points, 'graded')");

if (!$ok) {
    echo json_encode(['success' => false, 'message' => 'DB error: ' . $conn->error, 'data' => ['points_earned' => 0]]);
    exit;
}

// Update leaderboard (same as submit_flag for lab 1)
$conn->query("INSERT INTO leaderboard (user_id, total_points, last_update) VALUES ($userId, $points, NOW())
  ON DUPLICATE KEY UPDATE total_points = total_points + $points, last_update = NOW()");

// Stop the lab container (docker compose down)
$labConfig = null;
foreach ($GLOBALS['LABS_REGISTRY'] ?? [] as $cfg) {
    if (($cfg['lab_id'] ?? 0) === $labId) {
        $labConfig = $cfg;
        break;
    }
}
if ($labConfig) {
    $folder = trim((string)($labConfig['folder'] ?? ''));
    $basePath = defined('LABS_BASE_PATH') ? rtrim(LABS_BASE_PATH, '\\/') : '';
    if ($basePath !== '' && $folder !== '') {
        $labPath = $basePath . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $folder);
        $labPath = realpath($labPath);
        if ($labPath && is_dir($labPath)) {
            $cmd = 'cd /d "' . str_replace('"', '""', $labPath) . '" && (docker compose down 2>nul || docker-compose down 2>nul)';
            if (strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN') {
                $cmd = 'cd "' . addslashes($labPath) . '" && (docker compose down 2>/dev/null || docker-compose down 2>/dev/null)';
            }
            exec($cmd);
        }
    }
}

echo json_encode(['success' => true, 'message' => 'LAB_SOLVED', 'data' => ['points_earned' => $points]]);
