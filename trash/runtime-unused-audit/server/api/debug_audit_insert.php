<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../utils/db_connect.php';
require_once __DIR__ . '/../utils/audit_log.php';

$u = $conn->query("SELECT user_id, username FROM users ORDER BY user_id ASC LIMIT 1");
if (!$u || $u->num_rows < 1) {
    echo json_encode(['success' => false, 'message' => 'no users', 'err' => $conn->error]);
    exit;
}
$user = $u->fetch_assoc();
$uid = (int)$user['user_id'];
$uname = (string)$user['username'];

$ok = hackme_write_audit_log($conn, [
    'actor_user_id' => $uid,
    'actor_username' => $uname,
    'action' => 'login',
    'status' => 'success',
    'details' => 'debug insert',
    'ip_address' => '127.0.0.1',
    'user_agent' => 'debug-agent',
]);

$countRes = $conn->query("SELECT COUNT(*) AS c FROM audit_logs");
$count = null;
if ($countRes) {
    $row = $countRes->fetch_assoc();
    $count = (int)($row['c'] ?? 0);
}

echo json_encode([
    'success' => $ok,
    'uid' => $uid,
    'username' => $uname,
    'count' => $count,
    'conn_error' => $conn->error,
]);
