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
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/vendor/autoload.php';

$data = file_get_contents('php://input');
$input = json_decode($data, true);

// Check if JSON decoding failed
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON data: ' . json_last_error_msg()]);
    exit;
}

// Check if input is null or not an array
if (!is_array($input)) {
    echo json_encode(['success' => false, 'message' => 'Invalid request data']);
    exit;
}

$username = isset($input['username']) ? trim($input['username']) : '';
$email = isset($input['email']) ? trim($input['email']) : '';
$fullName = isset($input['fullName']) ? trim($input['fullName']) : '';

// Error handling for database connection
if (!isset($conn) || !$conn) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

if(empty($username) || empty($email) || empty($fullName)){
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit;
}
else if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        exit;
    }
    else if (!preg_match("/^[a-zA-Z0-9_]{3,20}$/", $username)) {
        echo json_encode(['success' => false, 'message' => 'Invalid username format']);
        exit;
    }else if (strlen($fullName) < 3 || strlen($fullName) > 50) {
        echo json_encode(['success' => false, 'message' => 'Full name must be between 3 and 50 characters']);
        exit;
    }


// Generate 6-digit numeric code
$code = str_pad(strval(rand(0, 999999)), 6, '0', STR_PAD_LEFT);

// Delete previous verifications
$stmt = $conn->prepare('DELETE FROM email_verifications WHERE email = ?');
$stmt->bind_param('s', $email);
$stmt->execute();
$stmt->close();

// Insert new verification
$stmt = $conn->prepare('INSERT INTO email_verifications (email, username, verification_code, is_verified, expires_at) VALUES (?, ?, ?, 0, DATE_ADD(NOW(), INTERVAL 5 MINUTE))');
if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Database prepare failed: ' . $conn->error]);
    exit;
}
$stmt->bind_param('sss', $email, $username, $code);
if (!$stmt->execute()) {
    echo json_encode(['success' => false, 'message' => 'Database insert failed: ' . $stmt->error]);
    $stmt->close();
    exit;
}
$stmt->close();

// Send email via PHPMailer
try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'deboabdo1234@gmail.com'; 
    $mail->Password = 'gjlwqkofrqlyozop';      
    $mail->SMTPSecure = 'tls';
    $mail->Port = 587;

    $mail->setFrom('deboabdo1234@gmail.com', 'CTF Platform');
    $mail->addAddress($email, $username);
    $mail->isHTML(false);
    $mail->Subject = 'CTF Platform - Verification Code';
    $mail->Body = "Hello $username,\n\nYour verification code is: $code\nIt expires in 5 minutes.";

    $mail->send();
    echo json_encode(['success'=>true, 'message'=>'Verification code sent successfully']);
    exit;
} catch (Exception $e) {
    echo json_encode(['success'=>false, 'message'=>'Mailer error: '.$mail->ErrorInfo]);
    exit;
}

?>