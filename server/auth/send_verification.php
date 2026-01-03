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

    $mail->setFrom('deboabdo1234@gmail.com', 'HACK_ME Platform');
    $mail->addAddress($email, $username);
    $mail->isHTML(true);
    $mail->Subject = 'HACK_ME - Email Verification Code';
    
    // Beautiful HTML Email Template
    $emailBody = "
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Verification Code</title>
    </head>
    <body style='margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif; background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);'>
        <table role='presentation' cellspacing='0' cellpadding='0' border='0' width='100%' style='background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); padding: 40px 20px;'>
            <tr>
                <td align='center'>
                    <table role='presentation' cellspacing='0' cellpadding='0' border='0' width='600' style='max-width: 600px; background: #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); border: 1px solid rgba(34, 197, 94, 0.2);'>
                        <!-- Header with gradient -->
                        <tr>
                            <td style='background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%); padding: 40px 30px; text-align: center; position: relative;'>
                                <div style='position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\") repeat; opacity: 0.3;'></div>
                                <div style='position: relative; z-index: 1;'>
                                    <h1 style='margin: 0; font-size: 32px; font-weight: bold; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; font-family: \"Courier New\", monospace; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);'>HACK_ME</h1>
                                    <p style='margin: 8px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.9); font-family: \"Courier New\", monospace; letter-spacing: 1px;'>// VERIFICATION_CODE</p>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style='padding: 40px 30px; background: #1f2937;'>
                                <div style='text-align: center; margin-bottom: 30px;'>
                                    <div style='display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%); border-radius: 50%; border: 3px solid #22c55e; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;'>
                                        <span style='font-size: 32px;'>🔐</span>
                                    </div>
                                    <h2 style='margin: 0 0 15px 0; font-size: 24px; font-weight: 600; color: #f9fafb; font-family: \"Courier New\", monospace;'>IDENTITY_VERIFICATION</h2>
                                    <p style='margin: 0; font-size: 14px; color: #9ca3af; line-height: 1.6; font-family: \"Courier New\", monospace;'>Hello <strong style='color: #22c55e;'>$username</strong>,</p>
                                </div>
                                
                                <div style='background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%); border: 2px solid #22c55e; border-radius: 12px; padding: 30px; margin: 30px 0;'>
                                    <p style='margin: 0 0 15px 0; font-size: 13px; color: #d1d5db; text-transform: uppercase; letter-spacing: 1px; font-family: \"Courier New\", monospace; text-align: center;'>YOUR_VERIFICATION_CODE</p>
                                    <div style='background: #111827; border: 2px dashed #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0;'>
                                        <div style='font-size: 42px; font-weight: bold; color: #22c55e; letter-spacing: 8px; text-align: center; font-family: \"Courier New\", monospace; text-shadow: 0 0 20px rgba(34, 197, 94, 0.5);'>$code</div>
                                    </div>
                                    <p style='margin: 15px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center; font-family: \"Courier New\", monospace;'>⚠️ This code expires in <strong style='color: #fbbf24;'>5 minutes</strong></p>
                                </div>
                                
                                <div style='background: rgba(34, 197, 94, 0.05); border-left: 4px solid #22c55e; padding: 15px; border-radius: 6px; margin: 25px 0;'>
                                    <p style='margin: 0; font-size: 13px; color: #d1d5db; line-height: 1.6; font-family: \"Courier New\", monospace;'>
                                        <strong style='color: #22c55e;'>SECURITY_NOTE:</strong> Never share this code with anyone. Our team will never ask for your verification code.
                                    </p>
                                </div>
                                
                                <p style='margin: 25px 0 0 0; font-size: 13px; color: #6b7280; text-align: center; line-height: 1.6; font-family: \"Courier New\", monospace;'>
                                    If you didn't request this code, please ignore this email or contact support if you have concerns.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style='background: #111827; padding: 25px 30px; text-align: center; border-top: 1px solid rgba(34, 197, 94, 0.2);'>
                                <p style='margin: 0 0 10px 0; font-size: 12px; color: #6b7280; font-family: \"Courier New\", monospace;'>
                                    © 2025 HACK_ME Platform. All rights reserved.
                                </p>
                                <p style='margin: 0; font-size: 11px; color: #4b5563; font-family: \"Courier New\", monospace;'>
                                    // PENETRATION_TESTING_PLATFORM
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    ";
    
    $mail->Body = $emailBody;
    
    // Plain text fallback
    $mail->AltBody = "HACK_ME Platform\n\nHello $username,\n\nYour verification code is: $code\n\nThis code expires in 5 minutes.\n\nIf you didn't request this code, please ignore this email.\n\n© 2025 HACK_ME Platform";

    $mail->send();
    echo json_encode(['success'=>true, 'message'=>'Verification code sent successfully']);
    exit;
} catch (Exception $e) {
    echo json_encode(['success'=>false, 'message'=>'Mailer error: '.$mail->ErrorInfo]);
    exit;
}

?>
