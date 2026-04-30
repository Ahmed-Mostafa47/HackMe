<?php
/**
 * Public endpoint:
 * - GET: return active superadmin emails
 * - POST: send a contact message to active superadmin emails with captcha + rate limit
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../utils/db_connect.php';
require_once __DIR__ . '/../utils/mailer.php';

if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$conn->set_charset('utf8mb4');

const CONTACT_CAPTCHA_SECRET = 'hackme_contact_captcha_v1';
const CONTACT_CAPTCHA_TTL_SECONDS = 600;
const CONTACT_RATE_LIMIT_WINDOW_SECONDS = 600;
const CONTACT_RATE_LIMIT_MAX_MESSAGES = 3;

function get_client_ip()
{
    $keys = ['HTTP_X_FORWARDED_FOR', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
    foreach ($keys as $key) {
        if (!isset($_SERVER[$key])) {
            continue;
        }
        $raw = trim((string)$_SERVER[$key]);
        if ($raw === '') {
            continue;
        }
        if ($key === 'HTTP_X_FORWARDED_FOR') {
            $parts = array_map('trim', explode(',', $raw));
            if (count($parts) > 0 && $parts[0] !== '') {
                return $parts[0];
            }
        }
        return $raw;
    }
    return 'unknown';
}

function ensure_contact_messages_table($conn)
{
    $sql = "
        CREATE TABLE IF NOT EXISTS contact_messages (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            sender_name VARCHAR(120) NOT NULL,
            sender_email VARCHAR(255) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            message_text TEXT NOT NULL,
            sender_ip VARCHAR(64) NOT NULL,
            user_agent VARCHAR(255) NOT NULL,
            delivery_status ENUM('queued','sent','failed') NOT NULL DEFAULT 'queued',
            failure_reason VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            sent_at TIMESTAMP NULL DEFAULT NULL,
            INDEX idx_contact_messages_sender_ip_created (sender_ip, created_at),
            INDEX idx_contact_messages_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ";
    return (bool)$conn->query($sql);
}

function generate_captcha_payload()
{
    if (function_exists('random_int')) {
        $a = random_int(1, 9);
        $b = random_int(1, 9);
    } else {
        $a = mt_rand(1, 9);
        $b = mt_rand(1, 9);
    }
    $issuedAt = time();
    $answer = (string)($a + $b);
    $sig = hash_hmac('sha256', $issuedAt . '|' . $answer, CONTACT_CAPTCHA_SECRET);
    return [
        'question' => "What is {$a} + {$b}?",
        'token' => base64_encode($issuedAt . '|' . $sig),
    ];
}

function verify_captcha($token, $answer)
{
    if ($token === '' || $answer === '') {
        return false;
    }
    $decoded = base64_decode($token, true);
    if (!is_string($decoded) || strpos($decoded, '|') === false) {
        return false;
    }
    [$issuedAtRaw, $sig] = explode('|', $decoded, 2);
    $issuedAt = (int)$issuedAtRaw;
    if ($issuedAt <= 0 || (time() - $issuedAt) > CONTACT_CAPTCHA_TTL_SECONDS) {
        return false;
    }
    $normalizedAnswer = preg_replace('/\s+/', '', trim($answer));
    if ($normalizedAnswer === '') {
        return false;
    }
    $expected = hash_hmac('sha256', $issuedAt . '|' . $normalizedAnswer, CONTACT_CAPTCHA_SECRET);
    return hash_equals($expected, $sig);
}

function is_rate_limited($conn, $senderIp)
{
    $cutoff = date('Y-m-d H:i:s', time() - CONTACT_RATE_LIMIT_WINDOW_SECONDS);
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS cnt
         FROM contact_messages
         WHERE sender_ip = ?
           AND created_at >= ?"
    );
    if (!$stmt) {
        return false;
    }
    $stmt->bind_param('ss', $senderIp, $cutoff);
    if (!$stmt->execute()) {
        $stmt->close();
        return false;
    }
    $res = $stmt->get_result();
    $row = $res ? $res->fetch_assoc() : null;
    $stmt->close();
    $count = (int)($row['cnt'] ?? 0);
    return $count >= CONTACT_RATE_LIMIT_MAX_MESSAGES;
}

function insert_contact_message(
    $conn,
    $name,
    $email,
    $subject,
    $message,
    $senderIp,
    $userAgent
) {
    $stmt = $conn->prepare(
        "INSERT INTO contact_messages
        (sender_name, sender_email, subject, message_text, sender_ip, user_agent, delivery_status)
        VALUES (?, ?, ?, ?, ?, ?, 'queued')"
    );
    if (!$stmt) {
        return 0;
    }
    $stmt->bind_param('ssssss', $name, $email, $subject, $message, $senderIp, $userAgent);
    $ok = $stmt->execute();
    $id = $ok ? (int)$conn->insert_id : 0;
    $stmt->close();
    return $id;
}

function mark_contact_message_status($conn, $id, $status, $reason = null)
{
    if ($id <= 0) {
        return;
    }
    $normalized = ($status === 'sent') ? 'sent' : 'failed';
    $stmt = $conn->prepare(
        "UPDATE contact_messages
         SET delivery_status = ?, failure_reason = ?, sent_at = CASE WHEN ? = 'sent' THEN NOW() ELSE NULL END
         WHERE id = ?"
    );
    if (!$stmt) {
        return;
    }
    $stmt->bind_param('sssi', $normalized, $reason, $normalized, $id);
    $stmt->execute();
    $stmt->close();
}

function fetch_superadmin_contacts($conn)
{
    $res = $conn->query(
    "
    SELECT DISTINCT u.user_id, u.username, u.email
    FROM users u
    INNER JOIN user_roles ur ON ur.user_id = u.user_id
    INNER JOIN roles r ON r.role_id = ur.role_id
    WHERE LOWER(TRIM(r.name)) = 'superadmin'
      AND COALESCE(u.is_active, 1) = 1
    ORDER BY u.username ASC
    "
);

    if (!$res) {
        return [false, []];
    }

    $seen = [];
    $contacts = [];

    while ($row = $res->fetch_assoc()) {
        $email = isset($row['email']) ? strtolower(trim((string)$row['email'])) : '';
        if ($email === '' || !filter_var($row['email'], FILTER_VALIDATE_EMAIL)) {
            continue;
        }
        if (isset($seen[$email])) {
            continue;
        }
        $seen[$email] = true;
        $contacts[] = [
            'username' => (string)($row['username'] ?? ''),
            'email' => (string)$row['email'],
        ];
    }

    return [true, $contacts];
}

[$ok, $contacts] = fetch_superadmin_contacts($conn);
if (!$ok) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $captcha = generate_captcha_payload();
    echo json_encode([
        'success' => true,
        'contacts' => $contacts,
        'captcha' => $captcha,
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

$payload = json_decode(file_get_contents('php://input') ?: '[]', true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid request payload']);
    exit;
}

$name = trim((string)($payload['name'] ?? ''));
$email = trim((string)($payload['email'] ?? ''));
$subject = trim((string)($payload['subject'] ?? ''));
$message = trim((string)($payload['message'] ?? ''));
$captchaToken = trim((string)($payload['captcha_token'] ?? ''));
$captchaAnswer = trim((string)($payload['captcha_answer'] ?? ''));

if ($name === '' || $email === '' || $subject === '' || $message === '' || $captchaToken === '' || $captchaAnswer === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'All fields are required']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email address']);
    exit;
}

if (count($contacts) === 0) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'No superadmin contacts are available']);
    exit;
}

if (!verify_captcha($captchaToken, $captchaAnswer)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid or expired captcha']);
    exit;
}

if (!ensure_contact_messages_table($conn)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to initialize contact storage']);
    exit;
}

$senderIp = get_client_ip();
$userAgent = trim((string)($_SERVER['HTTP_USER_AGENT'] ?? ''));
$userAgent = substr($userAgent, 0, 255);
if (is_rate_limited($conn, $senderIp)) {
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'message' => 'Rate limit exceeded. Please wait a few minutes before sending again.',
    ]);
    exit;
}

$messageId = insert_contact_message($conn, $name, $email, $subject, $message, $senderIp, $userAgent);

if (!function_exists('cyberops_mailer')) {
    mark_contact_message_status($conn, $messageId, 'failed', 'mailer function missing');
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Mailer is not available']);
    exit;
}

try {
    $mail = cyberops_mailer();
    if (!$mail) {
        mark_contact_message_status($conn, $messageId, 'failed', 'mailer unavailable');
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Mailer is not available']);
        exit;
    }

    $safeName = htmlspecialchars($name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safeEmail = htmlspecialchars($email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safeSubject = htmlspecialchars($subject, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safeMessage = nl2br(htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));

    $mail->clearAddresses();
    foreach ($contacts as $c) {
        $mail->addAddress((string)$c['email'], (string)($c['username'] ?? 'SuperAdmin'));
    }
    $mail->Subject = '[Contact Us] ' . $subject;
    $mail->Body = "
        <h3>New Contact Us message</h3>
        <p><strong>From:</strong> {$safeName} ({$safeEmail})</p>
        <p><strong>Subject:</strong> {$safeSubject}</p>
        <hr>
        <p>{$safeMessage}</p>
    ";
    $mail->AltBody = "New Contact Us message\n"
        . "From: {$name} ({$email})\n"
        . "Subject: {$subject}\n\n"
        . $message;
    $mail->addReplyTo($email, $name);
    $mail->send();
    mark_contact_message_status($conn, $messageId, 'sent');

    echo json_encode([
        'success' => true,
        'message' => 'Your message was sent to the SuperAdmin team.',
        'next_captcha' => generate_captcha_payload(),
    ]);
} catch (Exception $e) {
    error_log('contact_superadmins mail error: ' . $e->getMessage());
    mark_contact_message_status($conn, $messageId, 'failed', substr($e->getMessage(), 0, 255));
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to send message',
        'next_captcha' => generate_captcha_payload(),
    ]);
}
