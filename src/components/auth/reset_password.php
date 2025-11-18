<?php
// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Max-Age: 3600");
    http_response_code(200);
    exit;
}

require 'db_connect.php';

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
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

$token = isset($input['token']) ? trim($input['token']) : '';
$new_password = isset($input['password']) ? $input['password'] : '';

// Log incoming request
error_log("=== RESET PASSWORD REQUEST ===");
error_log("Token received: " . substr($token, 0, 20) . "...");
error_log("Password length: " . strlen($new_password));

if (!$token || !$new_password) {
    echo json_encode(['success' => false, 'message' => 'Token and password are required']);
    exit;
}

if (strlen($new_password) < 8) {
    echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long']);
    exit;
}

// Hash the token to match what's in database
$token_hash = hash('sha256', $token);

// Debug: Log the token hash being searched
error_log("Searching for token_hash: " . $token_hash);

// Find the reset token in database and check if it's valid
// First, let's check if the table exists and has the right structure
$check_table = $conn->query("DESCRIBE password_resets");
if (!$check_table) {
    error_log("password_resets table doesn't exist");
    echo json_encode(['success' => false, 'message' => 'System error: Password reset table not found. Please contact admin.']);
    exit;
}

$stmt = $conn->prepare('
    SELECT pr.user_id, pr.email, u.user_id as user_exists 
    FROM password_resets pr
    LEFT JOIN users u ON pr.user_id = u.user_id
    WHERE pr.token_hash = ? 
    AND pr.expires_at > NOW() 
    AND pr.is_used = 0
    LIMIT 1
');

if (!$stmt) {
    error_log("Prepare failed: " . $conn->error);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
    exit;
}

$stmt->bind_param('s', $token_hash);
$stmt->execute();
$result = $stmt->get_result();
$reset_record = $result->fetch_assoc();

// Debug logging
error_log("Query executed. Rows found: " . $result->num_rows);
if ($reset_record) {
    error_log("Token found for user: " . $reset_record['user_id']);
} else {
    error_log("No valid token found");
    // Try to find ANY token with this hash (for debugging)
    $debug_stmt = $conn->prepare('SELECT * FROM password_resets WHERE token_hash = ? LIMIT 1');
    if ($debug_stmt) {
        $debug_stmt->bind_param('s', $token_hash);
        $debug_stmt->execute();
        $debug_result = $debug_stmt->get_result();
        $debug_record = $debug_result->fetch_assoc();
        if ($debug_record) {
            error_log("Token found but failed validation. is_used: " . $debug_record['is_used'] . ", expires_at: " . $debug_record['expires_at']);
        }
        $debug_stmt->close();
    }
}
$stmt->close();

if (!$reset_record) {
    echo json_encode(['success' => false, 'message' => 'Invalid or expired reset token']);
    exit;
}

if (!$reset_record['user_exists']) {
    echo json_encode(['success' => false, 'message' => 'User not found']);
    exit;
}

// Hash the new password
$password_hash = password_hash($new_password, PASSWORD_BCRYPT);

// Update user password
$update_stmt = $conn->prepare('UPDATE users SET password_hash = ? WHERE user_id = ?');
if (!$update_stmt) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
    exit;
}

$update_stmt->bind_param('si', $password_hash, $reset_record['user_id']);
if (!$update_stmt->execute()) {
    echo json_encode(['success' => false, 'message' => 'Failed to update password']);
    $update_stmt->close();
    exit;
}
$update_stmt->close();

// Mark reset token as used
$mark_used_stmt = $conn->prepare('UPDATE password_resets SET is_used = 1 WHERE token_hash = ?');
if ($mark_used_stmt) {
    $mark_used_stmt->bind_param('s', $token_hash);
    $mark_used_stmt->execute();
    $mark_used_stmt->close();
}

echo json_encode(['success' => true, 'message' => 'Password updated successfully. You can now login with your new password.']);

?>
