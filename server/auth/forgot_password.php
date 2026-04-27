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

require_once __DIR__ . '/../utils/db_connect.php';
require 'vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

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

$email = isset($input['email']) ? trim($input['email']) : '';

if (!$email) {
    echo json_encode(['success' => false, 'message' => 'Email is required']);
    exit;
}

// Check if email exists in users table
$stmt = $conn->prepare('SELECT user_id, username, email FROM users WHERE email = ? LIMIT 1');
if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
    exit;
}

$stmt->bind_param('s', $email);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();
$stmt->close();

if (!$user) {
    // Don't reveal if email exists or not (security best practice)
    echo json_encode(['success' => true, 'message' => 'If an account exists with this email, you will receive reset instructions']);
    exit;
}

// Generate unique reset token
$reset_token = bin2hex(random_bytes(32));
$token_hash = hash('sha256', $reset_token);

// Insert reset token into database; let MySQL compute expires_at to avoid timezone issues
$insert_stmt = $conn->prepare('INSERT INTO password_resets (user_id, email, token_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))');
if (!$insert_stmt) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
    exit;
}

$insert_stmt->bind_param('iss', $user['user_id'], $email, $token_hash);
if (!$insert_stmt->execute()) {
    echo json_encode(['success' => false, 'message' => 'Failed to create reset token']);
    $insert_stmt->close();
    exit;
}
$insert_stmt->close();

// Generate reset link
// Update this URL to match your application's domain
// For local development: http://localhost:5173/reset-password?token=xxxxx
// For production: https://yourdomain.com/reset-password?token=xxxxx
$reset_link = 'http://localhost:5173/reset-password?token=' . $reset_token;

// Send email using PHPMailer
try {
    $mail = new PHPMailer(true);
    
    // SMTP configuration - update with your email settings
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com'; // Your SMTP host
    $mail->SMTPAuth = true;
    $mail->Username = 'deboabdo1234@gmail.com'; // Your email
    $mail->Password = 'gjlwqkofrqlyozop'; // Your app password
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = 587;

    // Email content
    $mail->setFrom('deboabdo1234@gmail.com', 'CTF Platform');
    $mail->addAddress($email, $user['username']);
    $mail->isHTML(true);
    $mail->Subject = 'Password Reset Request - CTF Platform';
    
    $mail->Body = "
        <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: #f4f4f4; }
                    .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
                    .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
                    .footer { color: #666; font-size: 12px; text-align: center; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h1>Password Reset Request</h1>
                    </div>
                    <p>Hello <strong>{$user['username']}</strong>,</p>
                    <p>You have requested to reset your password. Click the button below to proceed:</p>
                    <a href='{$reset_link}' class='button'>Reset Password</a>
                    <p>Or copy this link in your browser:</p>
                    <p style='word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;'>{$reset_link}</p>
                    <p><strong>Note:</strong> This link will expire in 1 hour.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    <div class='footer'>
                        <p>&copy; 2025 CTF Platform. All rights reserved.</p>
                    </div>
                </div>
            </body>
        </html>
    ";
    
    $mail->send();
    echo json_encode(['success' => true, 'message' => 'Reset instructions sent to your email']);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Email sending failed: ' . $mail->ErrorInfo]);
    exit;
}
?>

