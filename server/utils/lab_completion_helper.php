<?php
declare(strict_types=1);

require_once __DIR__ . '/labs_config.php';

/**
 * Shared lab completion: points, penalties, submissions, leaderboard, docker down.
 * Used by lab_solved.php and submit_whitebox_fix.php.
 *
 * @return array{success:bool,message:string,points_earned:int,already_solved:bool}
 */
function hackme_record_lab_completion(
    PDO $pdo,
    int $labId,
    int $userId,
    string $payloadText = 'lab_completed',
    string $completionScope = 'standard'
): array {
    $labIdEsc = (int) $labId;
    $userIdEsc = (int) $userId;

    $points = 100;
    $labSt = $pdo->query("SELECT points_total FROM labs WHERE lab_id = $labIdEsc LIMIT 1");
    $lab = $labSt ? $labSt->fetch(PDO::FETCH_ASSOC) : false;
    if ($lab !== false) {
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
        $penaltySt = $pdo->query("
          SELECT hint_viewed, solution_viewed
          FROM lab_resource_usage
          WHERE user_id = $userIdEsc AND lab_id = $labIdEsc
          LIMIT 1
        ");
        $penaltyRow = $penaltySt ? $penaltySt->fetch(PDO::FETCH_ASSOC) : false;
        if ($penaltyRow !== false) {
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

    $chSt = $pdo->query("SELECT challenge_id FROM challenges WHERE lab_id = $labIdEsc ORDER BY challenge_id ASC LIMIT 1");
    $challengeId = null;
    $chRow = $chSt ? $chSt->fetch(PDO::FETCH_ASSOC) : false;
    if ($chRow !== false) {
        $challengeId = (int) $chRow['challenge_id'];
    }

    if (!$challengeId) {
        $creatorSt = $pdo->query("SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1");
        $creatorRow = $creatorSt ? $creatorSt->fetch(PDO::FETCH_ASSOC) : false;
        $creatorId = 1;
        if ($creatorRow !== false) {
            $creatorId = (int) $creatorRow['user_id'];
        }
        $pdo->exec("INSERT IGNORE INTO labs (lab_id, title, description, labtype_id, difficulty, points_total, created_by, is_published, visibility, docker_image, reset_interval)
          VALUES ($labIdEsc, 'Lab $labIdEsc', 'Lab completion', 1, 'medium', $points, $creatorId, 1, 'public', '', 3600)");
        $chMax = $pdo->query("SELECT COALESCE(MAX(challenge_id), 0) + 1 AS next_id FROM challenges");
        $chMaxRow = $chMax ? $chMax->fetch(PDO::FETCH_ASSOC) : false;
        $nextCh = $chMaxRow !== false ? (int) $chMaxRow['next_id'] : 6;
        $pdo->exec("INSERT IGNORE INTO challenges (challenge_id, lab_id, created_by, title, statement, order_index, max_score, difficulty, is_active)
          VALUES ($nextCh, $labIdEsc, $creatorId, 'LAB_COMPLETION', 'Lab completed', 1, $points, 'medium', 1)");
        $chRes2 = $pdo->query("SELECT challenge_id FROM challenges WHERE lab_id = $labIdEsc LIMIT 1");
        $ch2 = $chRes2 ? $chRes2->fetch(PDO::FETCH_ASSOC) : false;
        if ($ch2 !== false) {
            $challengeId = (int) $ch2['challenge_id'];
        }
    }

    if (!$challengeId) {
        return ['success' => false, 'message' => 'No challenge for lab', 'points_earned' => 0, 'already_solved' => false];
    }

    $scope = $completionScope === 'whitebox' ? 'whitebox' : 'standard';
    if ($scope === 'whitebox') {
        $st = $pdo->prepare("
          SELECT 1 AS x FROM submissions s
          JOIN lab_instances li ON li.instance_id = s.instance_id
          WHERE li.lab_id = ? AND s.user_id = ? AND s.status = 'graded'
            AND s.payload_text = ?
          LIMIT 1
        ");
        $st->execute([$labIdEsc, $userIdEsc, $payloadText]);
        $dup = $st->fetch(PDO::FETCH_ASSOC);
    } else {
        $st = $pdo->prepare("
          SELECT 1 AS x FROM submissions s
          JOIN lab_instances li ON li.instance_id = s.instance_id
          WHERE li.lab_id = ? AND s.user_id = ? AND s.status = 'graded'
          LIMIT 1
        ");
        $st->execute([$labIdEsc, $userIdEsc]);
        $dup = $st->fetch(PDO::FETCH_ASSOC);
    }
    if ($dup !== false) {
        return ['success' => true, 'message' => 'LAB_ALREADY_SOLVED', 'points_earned' => 0, 'already_solved' => true];
    }

    $instSt = $pdo->query("SELECT instance_id FROM lab_instances WHERE lab_id = $labIdEsc AND user_id = $userIdEsc AND status = 'running' ORDER BY instance_id DESC LIMIT 1");
    $instRow = $instSt ? $instSt->fetch(PDO::FETCH_ASSOC) : false;
    if ($instRow !== false) {
        $instanceId = (int) $instRow['instance_id'];
    } else {
        $pdo->exec("INSERT INTO lab_instances (lab_id, user_id, container_id, status) VALUES ($labIdEsc, $userIdEsc, 'web_sandbox', 'running')");
        $instanceId = (int) $pdo->lastInsertId();
        if ($instanceId < 1) {
            return ['success' => false, 'message' => 'Failed to create lab instance', 'points_earned' => 0, 'already_solved' => false];
        }
    }

    try {
        $ins = $pdo->prepare('INSERT INTO submissions (instance_id, user_id, challenge_id, type, payload_text, auto_score, final_score, status)
      VALUES (?, ?, ?, \'flag\', ?, ?, ?, \'graded\')');
        $ins->execute([$instanceId, $userIdEsc, $challengeId, $payloadText, $points, $points]);
    } catch (Throwable $e) {
        return ['success' => false, 'message' => 'DB error: ' . $e->getMessage(), 'points_earned' => 0, 'already_solved' => false];
    }

    $pdo->exec("INSERT INTO leaderboard (user_id, total_points, last_update) VALUES ($userIdEsc, $points, NOW())
      ON DUPLICATE KEY UPDATE total_points = total_points + $points, last_update = NOW()");

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
