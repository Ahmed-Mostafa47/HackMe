<?php
declare(strict_types=1);

require_once __DIR__ . '/pdo_mysqli_shim.php';
require_once __DIR__ . '/labs_config.php';
require_once __DIR__ . '/audit_log.php';

/**
 * Shared lab completion: points, penalties, submissions, leaderboard, docker down.
 * Used by lab_solved.php and submit_whitebox_fix.php.
 *
 * @return array{success:bool,message:string,points_earned:int,already_solved:bool}
 */
function hackme_record_lab_completion(
    PdoMysqliShim $conn,
    int $labId,
    int $userId,
    string $payloadText = 'lab_completed',
    string $completionScope = 'standard',
    array $auditContext = []
): array {
    $labIdEsc = (int) $labId;
    $userIdEsc = (int) $userId;

    $points = 100;
    $labRow = $conn->query("SELECT points_total FROM labs WHERE lab_id = $labIdEsc LIMIT 1");
    if ($labRow && $labRow->num_rows > 0) {
        $lab = $labRow->fetch_assoc();
        $points = (int) ($lab['points_total'] ?? 100);
    }
    if ($points <= 0) {
        foreach ($GLOBALS['LABS_REGISTRY'] ?? [] as $cfg) {
            if (($cfg['lab_id'] ?? 0) === $labId) {
                $points = (int) ($cfg['points'] ?? 100);
                break;
            }
        }
    }
    if ($points <= 0) {
        $points = 100;
    }

    // Penalties apply to standard flag-based labs. White-box scoring is based on secure fix submission.
    if ($completionScope !== 'whitebox') {
        $penaltyRes = $conn->query("
          SELECT hint_viewed, solution_viewed
          FROM lab_resource_usage
          WHERE user_id = $userIdEsc AND lab_id = $labIdEsc
          LIMIT 1
        ");
        if ($penaltyRes && $penaltyRes->num_rows > 0) {
            $penaltyRow = $penaltyRes->fetch_assoc();
            $hintViewed = ((int) ($penaltyRow['hint_viewed'] ?? 0) === 1);
            $solutionViewed = ((int) ($penaltyRow['solution_viewed'] ?? 0) === 1);
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
    }

    $chRes = $conn->query("SELECT challenge_id FROM challenges WHERE lab_id = $labIdEsc ORDER BY challenge_id ASC LIMIT 1");
    $challengeId = null;
    if ($chRes && $chRes->num_rows > 0) {
        $challengeId = (int) $chRes->fetch_assoc()['challenge_id'];
    }

    if (!$challengeId) {
        $creator = $conn->query("SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1");
        $creatorId = 1;
        if ($creator && $creator->num_rows > 0) {
            $creatorId = (int) $creator->fetch_assoc()['user_id'];
        }
        $conn->query("INSERT IGNORE INTO labs (lab_id, title, description, labtype_id, difficulty, points_total, created_by, is_published, visibility, docker_image, reset_interval)
          VALUES ($labIdEsc, 'Lab $labIdEsc', 'Lab completion', 1, 'medium', $points, $creatorId, 1, 'public', '', 3600)");
        $chMax = $conn->query("SELECT COALESCE(MAX(challenge_id), 0) + 1 AS next_id FROM challenges");
        $nextCh = $chMax && $chMax->num_rows > 0 ? (int) $chMax->fetch_assoc()['next_id'] : 6;
        $conn->query("INSERT IGNORE INTO challenges (challenge_id, lab_id, created_by, title, statement, order_index, max_score, difficulty, is_active)
          VALUES ($nextCh, $labIdEsc, $creatorId, 'LAB_COMPLETION', 'Lab completed', 1, $points, 'medium', 1)");
        $chRes = $conn->query("SELECT challenge_id FROM challenges WHERE lab_id = $labIdEsc LIMIT 1");
        if ($chRes && $chRes->num_rows > 0) {
            $challengeId = (int) $chRes->fetch_assoc()['challenge_id'];
        }
    }

    if (!$challengeId) {
        return ['success' => false, 'message' => 'No challenge for lab', 'points_earned' => 0, 'already_solved' => false];
    }

    $scope = $completionScope === 'whitebox' ? 'whitebox' : 'standard';
    if ($scope === 'whitebox') {
        $payloadMark = $conn->real_escape_string($payloadText);
        $check = $conn->query("
          SELECT 1 FROM submissions s
          JOIN lab_instances li ON li.instance_id = s.instance_id
          WHERE li.lab_id = $labIdEsc AND s.user_id = $userIdEsc AND s.status = 'graded'
            AND s.payload_text = '$payloadMark'
          LIMIT 1
        ");
    } else {
        $check = $conn->query("
          SELECT 1 FROM submissions s
          JOIN lab_instances li ON li.instance_id = s.instance_id
          WHERE li.lab_id = $labIdEsc AND s.user_id = $userIdEsc AND s.status = 'graded'
          LIMIT 1
        ");
    }
    if ($check && $check->num_rows > 0) {
        return ['success' => true, 'message' => 'LAB_ALREADY_SOLVED', 'points_earned' => 0, 'already_solved' => true];
    }

    $inst = $conn->query("SELECT instance_id FROM lab_instances WHERE lab_id = $labIdEsc AND user_id = $userIdEsc AND status = 'running' ORDER BY instance_id DESC LIMIT 1");
    if ($inst && $inst->num_rows > 0) {
        $instanceId = (int) $inst->fetch_assoc()['instance_id'];
    } else {
        $conn->query("INSERT INTO lab_instances (lab_id, user_id, container_id, status) VALUES ($labIdEsc, $userIdEsc, 'web_sandbox', 'running')");
        $instanceId = (int) $conn->insert_id;
        if ($instanceId < 1) {
            return ['success' => false, 'message' => 'Failed to create lab instance', 'points_earned' => 0, 'already_solved' => false];
        }
    }

    $payloadEsc = $conn->real_escape_string($payloadText);
    $ok = $conn->query("INSERT INTO submissions (instance_id, user_id, challenge_id, type, payload_text, auto_score, final_score, status)
      VALUES ($instanceId, $userIdEsc, $challengeId, 'flag', '$payloadEsc', $points, $points, 'graded')");

    if (!$ok) {
        return ['success' => false, 'message' => 'DB error: ' . $conn->error, 'points_earned' => 0, 'already_solved' => false];
    }

    $conn->query("INSERT INTO leaderboard (user_id, total_points, last_update) VALUES ($userIdEsc, $points, NOW())
      ON DUPLICATE KEY UPDATE total_points = total_points + $points, last_update = NOW()");

    // Audit: log solved lab only when points are actually awarded.
    if ($points > 0) {
        $actorUsername = 'user_' . $userIdEsc;
        $actorRes = $conn->query("SELECT username FROM users WHERE user_id = $userIdEsc LIMIT 1");
        if ($actorRes && $actorRes->num_rows > 0) {
            $actorRow = $actorRes->fetch_assoc();
            $actorUsername = (string) ($actorRow['username'] ?? $actorUsername);
        }

        $labTitle = '';
        $labTitleRes = $conn->query("SELECT title FROM labs WHERE lab_id = $labIdEsc LIMIT 1");
        if ($labTitleRes && $labTitleRes->num_rows > 0) {
            $labTitleRow = $labTitleRes->fetch_assoc();
            $labTitle = (string) ($labTitleRow['title'] ?? '');
        }
        if ($labTitle === '') {
            foreach ($GLOBALS['LABS_REGISTRY'] ?? [] as $cfg) {
                if ((int) ($cfg['lab_id'] ?? 0) === $labIdEsc) {
                    $labTitle = (string) ($cfg['title'] ?? '');
                    break;
                }
            }
        }

        hackme_write_audit_log($conn, [
            'actor_user_id' => $userIdEsc,
            'actor_username' => $actorUsername,
            'action' => 'lab_solved',
            'status' => 'success',
            'details' => json_encode([
                'message' => 'User solved lab and earned points',
                'lab_id' => $labIdEsc,
                'lab_title' => $labTitle,
                'points_earned' => $points,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'ip_address' => hackme_client_ip(),
            'client_local_ip' => (string)($auditContext['client_local_ip'] ?? ''),
            'client_time_utc' => (string)($auditContext['client_time_utc'] ?? ''),
            'client_timezone' => (string)($auditContext['client_timezone'] ?? ''),
            'client_tz_offset_minutes' => isset($auditContext['client_tz_offset_minutes']) ? (int)$auditContext['client_tz_offset_minutes'] : null,
            'user_agent' => (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''),
        ]);
    }

    $labConfig = null;
    foreach ($GLOBALS['LABS_REGISTRY'] ?? [] as $cfg) {
        if (($cfg['lab_id'] ?? 0) === $labId) {
            $labConfig = $cfg;
            break;
        }
    }
    if ($labConfig) {
        $folder = trim((string) ($labConfig['folder'] ?? ''));
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

    return ['success' => true, 'message' => 'LAB_SOLVED', 'points_earned' => $points, 'already_solved' => false];
}
