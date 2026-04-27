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
$old_password = isset($input['old_password']) ? $input['old_password'] : '';
$new_password = isset($input['new_password']) ? $input['new_password'] : '';

// Log incoming request
error_log("=== CHANGE PASSWORD REQUEST ===");
error_log("User ID: " . $user_id);
error_log("Old Password length: " . strlen($old_password));
error_log("New Password length: " . strlen($new_password));

// Validation
if (!$user_id || !$old_password || !$new_password) {
    echo json_encode(['success' => false, 'message' => 'User ID, old password, and new password are required']);
    exit;
}

if (strlen($new_password) < 8) {
    echo json_encode(['success' => false, 'message' => 'New password must be at least 8 characters long']);
    exit;
}

// Fetch current user and their password hash
$user_stmt = $conn->prepare('SELECT password_hash FROM users WHERE user_id = ? LIMIT 1');
if (!$user_stmt) {
    error_log("Prepare failed: " . $conn->error);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
    exit;
}

$user_stmt->bind_param('i', $user_id);
$user_stmt->execute();
$user_result = $user_stmt->get_result();
$user = $user_result->fetch_assoc();
$user_stmt->close();

if (!$user) {
    error_log("User not found with ID: " . $user_id);
    echo json_encode(['success' => false, 'message' => 'User not found']);
    exit;
}

// Verify old password
if (!password_verify($old_password, $user['password_hash'])) {
    error_log("Old password verification failed for user ID: " . $user_id);
    echo json_encode(['success' => false, 'message' => 'Current password is incorrect']);
    exit;
}

error_log("Old password verified successfully");

// Hash the new password
$new_password_hash = password_hash($new_password, PASSWORD_BCRYPT);

// Update user password
$update_stmt = $conn->prepare('UPDATE users SET password_hash = ? WHERE user_id = ?');
if (!$update_stmt) {
    error_log("Update prepare failed: " . $conn->error);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
    exit;
}

$update_stmt->bind_param('si', $new_password_hash, $user_id);

if (!$update_stmt->execute()) {
    error_log("Update execute failed: " . $update_stmt->error);
    echo json_encode(['success' => false, 'message' => 'Failed to update password']);
    $update_stmt->close();
    exit;
}

$update_stmt->close();

error_log("Password updated successfully for user ID: " . $user_id);

echo json_encode(['success' => true, 'message' => 'Password updated successfully']);
?>

