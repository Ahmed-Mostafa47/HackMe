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
require_once __DIR__ . '/../utils/permissions.php';
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

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

// Error handling for database connection
if (!isset($conn) || !$conn) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$email = isset($input['email']) ? trim($input['email']) : '';
$password = isset($input['password']) ? $input['password'] : '';
$fullName = isset($input['fullName']) ? trim($input['fullName']) : '';
$username = isset($input['username']) ? trim($input['username']) : '';

if (!$email || !$password || !$username) {
    echo json_encode(['success'=>false,'message'=>'Missing fields']);
    exit;
}
// check verification
$stmt = $conn->prepare('SELECT id, is_verified, username FROM email_verifications WHERE email = ? ORDER BY created_at DESC LIMIT 1');
if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Database prepare failed: ' . $conn->error]);
    exit;
}
$stmt->bind_param('s', $email);
if (!$stmt->execute()) {
    echo json_encode(['success' => false, 'message' => 'Database query failed: ' . $stmt->error]);
    $stmt->close();
    exit;
}
$res = $stmt->get_result();
$row = $res->fetch_assoc();
$stmt->close();

if (!$row || !$row['is_verified']) {
    echo json_encode(['success'=>false,'message'=>'Email not verified. Please verify your email first.']);
    exit;
}

// check user/email not exists
$chk = $conn->prepare('SELECT user_id FROM users WHERE email = ? OR username = ? LIMIT 1');
if (!$chk) {
    echo json_encode(['success' => false, 'message' => 'Database prepare failed: ' . $conn->error]);
    exit;
}
$chk->bind_param('ss', $email, $username);
if (!$chk->execute()) {
    echo json_encode(['success' => false, 'message' => 'Database query failed: ' . $chk->error]);
    $chk->close();
    exit;
}
if ($chk->get_result()->fetch_assoc()) {
    echo json_encode(['success'=>false,'message'=>'User with this email or username already exists']);
    $chk->close();
    exit;
}
$chk->close();

// hash password and insert
$hash = password_hash($password, PASSWORD_BCRYPT);
$profile_meta = json_encode(['avatar'=>'🆕','rank'=>'USER','specialization'=>'TRAINING','join_date'=>date('c')]);

$ins = $conn->prepare('INSERT INTO users (username, email, password_hash, full_name, profile_meta) VALUES (?, ?, ?, ?, ?)');
if (!$ins) {
    echo json_encode(['success' => false, 'message' => 'Database prepare failed: ' . $conn->error]);
    exit;
}
$ins->bind_param('sssss', $username, $email, $hash, $fullName, $profile_meta);
if (!$ins->execute()) {
    echo json_encode(['success'=>false,'message'=>'Insert failed: ' . $ins->error]);
    $ins->close();
    exit;
}
$userid = $ins->insert_id;
$ins->close();

// Assign default 'user' role to new user
assignRole($conn, $userid, 'user', null);

// optional: delete verification entries for this email
$del = $conn->prepare('DELETE FROM email_verifications WHERE email = ?');
$del->bind_param('s', $email);
$del->execute();
$del->close();

echo json_encode(['success'=>true,'message'=>'Account created','user_id'=>$userid]);
exit;

?>
