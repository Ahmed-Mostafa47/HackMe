<?php
declare(strict_types=1);

/**
 * Notification API Endpoint
 * Creates a notification and sends it to Node.js server for real-time delivery
 * 
 * POST /api/notify.php
 * Body: {
 *   "user_id": 123,
 *   "from_user_id": 456,
 *   "type": "like|comment|reply|message|update",
 *   "title": "New Like",
 *   "message": "User liked your comment",
 *   "link": "/comments"
 * }
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../utils/db_connect.php';

// Configuration
$NODE_SERVER_URL = 'http://localhost:3001/push';
$NODE_SERVER_SECRET = 'your-secret-token-change-this-in-production';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed'
        ]);
        exit;
    }

    $payload = json_decode(file_get_contents('php://input') ?: '[]', true);

    if (!is_array($payload)) {
        throw new InvalidArgumentException('Invalid payload');
    }

    // Validate required fields
    $userId = isset($payload['user_id']) ? (int)$payload['user_id'] : 0;
    $fromUserId = isset($payload['from_user_id']) ? (int)$payload['from_user_id'] : null;
    $type = isset($payload['type']) ? trim($payload['type']) : '';
    $title = isset($payload['title']) ? trim($payload['title']) : '';
    $message = isset($payload['message']) ? trim($payload['message']) : '';
    $link = isset($payload['link']) ? trim($payload['link']) : null;

    if ($userId < 1) {
        throw new InvalidArgumentException('Invalid user_id');
    }

    if (empty($type) || empty($title) || empty($message)) {
        throw new InvalidArgumentException('Missing required fields: type, title, message');
    }

    // Validate type
    $allowedTypes = ['like', 'comment', 'reply', 'message', 'update', 'role_request', 'system'];
    if (!in_array($type, $allowedTypes)) {
        throw new InvalidArgumentException('Invalid notification type');
    }

    // Sanitize inputs
    $title = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $message = htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $link = $link ? htmlspecialchars($link, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') : null;

    // Insert notification into database
    $stmt = $conn->prepare("
        INSERT INTO notifications (user_id, from_user_id, type, title, message, link, is_read)
        VALUES (?, ?, ?, ?, ?, ?, 0)
    ");

    if (!$stmt) {
        throw new RuntimeException('Failed to prepare statement: ' . $conn->error);
    }

    $stmt->bind_param('iissss', $userId, $fromUserId, $type, $title, $message, $link);

    if (!$stmt->execute()) {
        throw new RuntimeException('Failed to create notification: ' . $stmt->error);
    }

    $notificationId = (int)$conn->insert_id;
    $stmt->close();

    // Send to Node.js server for real-time delivery
    $nodePayload = [
        'notification_id' => $notificationId,
        'user_id' => $userId,
        'from_user_id' => $fromUserId,
        'type' => $type,
        'title' => $title,
        'message' => $message,
        'link' => $link,
        'created_at' => date('Y-m-d\TH:i:s\Z'),
        'secret' => $NODE_SERVER_SECRET
    ];

    // Send HTTP request to Node.js server (non-blocking)
    $ch = curl_init($NODE_SERVER_URL);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($nodePayload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-Secret-Token: ' . $NODE_SERVER_SECRET
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 1); // 1 second timeout (non-blocking)
    curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
    
    // Execute in background (don't wait for response)
    curl_exec($ch);
    curl_close($ch);

    echo json_encode([
        'success' => true,
        'message' => 'Notification created',
        'notification_id' => $notificationId
    ]);

} catch (Exception $e) {
    http_response_code(400);
    error_log('Notification API Error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}


