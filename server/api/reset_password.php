<?php
declare(strict_types=1);

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

require_once __DIR__ . '/../utils/db_connect.php';
$payload = json_decode(file_get_contents('php://input'), true);

if (!is_array($payload)) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON payload']);
    exit;
}

$token = isset($payload['token']) ? trim((string) $payload['token']) : '';
$userId = isset($payload['user_id']) ? (int) $payload['user_id'] : 0;
$newPassword = isset($payload['password']) ? (string) $payload['password'] : '';

if (empty($newPassword) || strlen($newPassword) < 8) {
    echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long']);
    exit;
}

if ($token) {
    $response = handle_token_reset($conn, $token, $newPassword);
    echo json_encode($response);
    exit;
}

if ($userId > 0) {
    $response = handle_authenticated_reset($conn, $userId, $newPassword);
    echo json_encode($response);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Token or user_id is required']);

function handle_token_reset(PdoMysqliShim $conn, string $token, string $password): array
{
    $tokenHash = hash('sha256', $token);
    $stmt = $conn->prepare('SELECT user_id FROM password_resets WHERE token_hash = ? AND expires_at > NOW() AND is_used = 0 LIMIT 1');
    $stmt->bind_param('s', $tokenHash);
    $stmt->execute();
    $result = $stmt->get_result();
    $record = $result->fetch_assoc();
    $stmt->close();

    if (!$record) {
        return ['success' => false, 'message' => 'Invalid or expired reset token'];
    }

    $update = update_user_password($conn, (int) $record['user_id'], $password);
    if (!$update['success']) {
        return $update;
    }

    $mark = $conn->prepare('UPDATE password_resets SET is_used = 1 WHERE token_hash = ?');
    $mark->bind_param('s', $tokenHash);
    $mark->execute();
    $mark->close();

    return ['success' => true, 'message' => 'Password updated successfully. You can now login with your new password.'];
}

function handle_authenticated_reset(PdoMysqliShim $conn, int $userId, string $password): array
{
    $userStmt = $conn->prepare('SELECT user_id FROM users WHERE user_id = ? LIMIT 1');
    $userStmt->bind_param('i', $userId);
    $userStmt->execute();
    $res = $userStmt->get_result();
    $user = $res->fetch_assoc();
    $userStmt->close();

    if (!$user) {
        return ['success' => false, 'message' => 'User not found'];
    }

    $update = update_user_password($conn, $userId, $password);
    if (!$update['success']) {
        return $update;
    }

    return ['success' => true, 'message' => 'Password updated successfully'];
}

function update_user_password(PdoMysqliShim $conn, int $userId, string $password): array
{
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $conn->prepare('UPDATE users SET password_hash = ? WHERE user_id = ?');
    $stmt->bind_param('si', $passwordHash, $userId);

    if (!$stmt->execute()) {
        $stmt->close();
        return ['success' => false, 'message' => 'Failed to update password'];
    }

    $stmt->close();
    return ['success' => true];
}

