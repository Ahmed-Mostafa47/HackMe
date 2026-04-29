<?php
declare(strict_types=1);

/**
 * One-off cleanup: removes duplicate audit_logs rows for action=security_block
 * burst within $windowSeconds for the same actor + block_reason (matches runtime dedupe logic).
 */

require_once __DIR__ . '/../utils/db_connect.php';

$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$windowSeconds = 70;

$stmt = $pdo->query(
    "SELECT log_id, actor_user_id, ip_address, details, created_at
     FROM audit_logs
     WHERE action = 'security_block'
     ORDER BY created_at ASC, log_id ASC"
);

$rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
if ($rows === []) {
    echo "No security_block rows.\n";
    exit(0);
}

$lastTsByKey = [];
$deleteIds = [];

foreach ($rows as $row) {
    $logId = (int)($row['log_id'] ?? 0);
    $actorId = isset($row['actor_user_id']) ? (int)$row['actor_user_id'] : 0;
    $detailsRaw = (string)($row['details'] ?? '');
    $decoded = json_decode($detailsRaw, true);
    $reason = '';
    if (is_array($decoded)) {
        $reason = trim((string)($decoded['block_reason'] ?? ''));
    }
    $key = $actorId . '|' . $reason;

    $created = $row['created_at'] ?? '';
    $ts = strtotime((string)$created);
    if ($ts === false) {
        continue;
    }

    if (!isset($lastTsByKey[$key])) {
        $lastTsByKey[$key] = $ts;
        continue;
    }

    if (($ts - $lastTsByKey[$key]) < $windowSeconds) {
        if ($logId > 0) {
            $deleteIds[] = $logId;
        }
    } else {
        $lastTsByKey[$key] = $ts;
    }
}

if ($deleteIds === []) {
    echo "No duplicate security_block rows to delete.\n";
} else {
    $placeholders = implode(',', array_fill(0, count($deleteIds), '?'));

    $del = $pdo->prepare('DELETE FROM audit_logs WHERE log_id IN (' . $placeholders . ')');
    $del->execute($deleteIds);

    echo 'deleted_duplicate_rows=' . count($deleteIds) . PHP_EOL;
}

// Fix actor_username that still holds email instead of username
$upd = $pdo->prepare(
    'UPDATE audit_logs al
     INNER JOIN users u ON u.user_id = al.actor_user_id
     SET al.actor_username = u.username
     WHERE al.action = \'security_block\' AND al.actor_user_id IS NOT NULL
       AND TRIM(IFNULL(al.actor_username, \'\')) = TRIM(IFNULL(u.email, \'\'))'
);
try {
    $upd->execute();
    echo 'updated_actor_username_from_email_rows=' . $upd->rowCount() . PHP_EOL;
} catch (Throwable $e) {
    echo 'update_actor_warning=' . $e->getMessage() . PHP_EOL;
}
