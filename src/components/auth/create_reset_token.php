<?php
require 'db_connect.php';

// Generate a new token
$new_token = bin2hex(random_bytes(32));
$token_hash = hash('sha256', $new_token);
$expires_at = date('Y-m-d H:i:s', strtotime('+24 hours'));

// Get the first user
$user_result = $conn->query("SELECT user_id, email FROM users LIMIT 1");
$user = $user_result->fetch_assoc();

// Insert the new token
$stmt = $conn->prepare('INSERT INTO password_resets (user_id, email, token_hash, expires_at, is_used) VALUES (?, ?, ?, ?, 0)');
$stmt->bind_param('isss', $user['user_id'], $user['email'], $token_hash, $expires_at);
$stmt->execute();

$reset_id = $conn->insert_id;

echo "=== NEW TOKEN GENERATED ===\n\n";
echo "Reset ID: $reset_id\n";
echo "User Email: " . $user['email'] . "\n";
echo "Plain Token: $new_token\n";
echo "Token Hash: $token_hash\n";
echo "Expires At: $expires_at\n\n";
echo "Reset Link:\n";
echo "http://localhost:5173/reset-password?token=$new_token\n\n";
echo "For Testing:\n";
echo "1. Copy the Reset Link and open in browser\n";
echo "2. Enter a new password\n";
echo "3. Click UPDATE_PASSWORD\n";

$stmt->close();
?>
