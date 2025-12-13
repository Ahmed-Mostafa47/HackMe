<?php
// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Max-Age: 3600");
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../utils/db_connect.php';

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

$data = file_get_contents('php://input');
$input = json_decode($data, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
    exit;
}

if (!is_array($input)) {
    echo json_encode(['success' => false, 'message' => 'Invalid request data']);
    exit;
}

if (!isset($conn) || !$conn) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$user_id = isset($input['user_id']) ? intval($input['user_id']) : 0;
$password = isset($input['password']) ? $input['password'] : '';

// Validation
if (!$user_id || !$password) {
    echo json_encode(['success' => false, 'message' => 'User ID and password are required']);
    exit;
}

// Fetch user and verify password
$user_stmt = $conn->prepare('SELECT user_id, password_hash FROM users WHERE user_id = ? AND is_active = 1 LIMIT 1');
if (!$user_stmt) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
    exit;
}

$user_stmt->bind_param('i', $user_id);
$user_stmt->execute();
$user_result = $user_stmt->get_result();
$user = $user_result->fetch_assoc();
$user_stmt->close();

if (!$user) {
    echo json_encode(['success' => false, 'message' => 'User not found or inactive']);
    exit;
}

// Verify password
if (!password_verify($password, $user['password_hash'])) {
    echo json_encode(['success' => false, 'message' => 'Password is incorrect']);
    exit;
}

// Start transaction for cascading deletes
$conn->begin_transaction();

try {
    // Delete user roles
    $delete_roles_stmt = $conn->prepare('DELETE FROM user_roles WHERE user_id = ?');
    if ($delete_roles_stmt) {
        $delete_roles_stmt->bind_param('i', $user_id);
        $delete_roles_stmt->execute();
        $delete_roles_stmt->close();
    }
    
    // Delete role requests
    $delete_role_requests_stmt = $conn->prepare('DELETE FROM role_requests WHERE user_id = ?');
    if ($delete_role_requests_stmt) {
        $delete_role_requests_stmt->bind_param('i', $user_id);
        $delete_role_requests_stmt->execute();
        $delete_role_requests_stmt->close();
    }
    
    // Delete password resets
    $delete_resets_stmt = $conn->prepare('DELETE FROM password_resets WHERE user_id = ?');
    if ($delete_resets_stmt) {
        $delete_resets_stmt->bind_param('i', $user_id);
        $delete_resets_stmt->execute();
        $delete_resets_stmt->close();
    }
    
    // Delete comments
    $delete_comments_stmt = $conn->prepare('DELETE FROM comments WHERE user_id = ?');
    if ($delete_comments_stmt) {
        $delete_comments_stmt->bind_param('i', $user_id);
        $delete_comments_stmt->execute();
        $delete_comments_stmt->close();
    }
    
    // Delete notifications
    $delete_notifications_stmt = $conn->prepare('DELETE FROM notifications WHERE user_id = ?');
    if ($delete_notifications_stmt) {
        $delete_notifications_stmt->bind_param('i', $user_id);
        $delete_notifications_stmt->execute();
        $delete_notifications_stmt->close();
    }
    
    // Finally, delete the user
    $delete_user_stmt = $conn->prepare('DELETE FROM users WHERE user_id = ?');
    if (!$delete_user_stmt) {
        throw new Exception('Failed to prepare delete user statement: ' . $conn->error);
    }
    
    $delete_user_stmt->bind_param('i', $user_id);
    
    if (!$delete_user_stmt->execute()) {
        throw new Exception('Failed to delete user: ' . $delete_user_stmt->error);
    }
    
    $delete_user_stmt->close();
    
    // Commit transaction
    $conn->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Account deleted successfully'
    ]);
    
} catch (Exception $e) {
    // Rollback transaction on error
    $conn->rollback();
    echo json_encode([
        'success' => false,
        'message' => 'Failed to delete account: ' . $e->getMessage()
    ]);
}

$conn->close();
?>

