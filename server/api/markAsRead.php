<?php
declare(strict_types=1);

/**
 * Mark Notification as Read API Endpoint
 * 
 * POST /api/markAsRead.php
 * Body: {
 *   "user_id": 123,
 *   "notification_id": 456  // optional, if not provided, marks all as read
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

    $userId = isset($payload['user_id']) ? (int)$payload['user_id'] : 0;
    $notificationId = isset($payload['notification_id']) ? (int)$payload['notification_id'] : null;

    if ($userId < 1) {
        throw new InvalidArgumentException('Invalid user_id');
    }
    
    // Security: Verify user exists
    $userCheck = $conn->prepare("SELECT user_id FROM users WHERE user_id = ? LIMIT 1");
    if ($userCheck) {
        $userCheck->bind_param('i', $userId);
        $userCheck->execute();
        $userExists = $userCheck->get_result()->num_rows > 0;
        $userCheck->close();
        
        if (!$userExists) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'User not found'
            ]);
            exit;
        }
    }

    if ($notificationId !== null && $notificationId > 0) {
        // Mark specific notification as read
        $stmt = $conn->prepare("
            UPDATE notifications 
            SET is_read = 1 
            WHERE id = ? AND user_id = ?
        ");

        if (!$stmt) {
            throw new RuntimeException('Failed to prepare statement: ' . $conn->error);
        }

        $stmt->bind_param('ii', $notificationId, $userId);
        
        if (!$stmt->execute()) {
            throw new RuntimeException('Failed to update notification: ' . $stmt->error);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();

        if ($affected === 0) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Notification not found or access denied'
            ]);
            exit;
        }

        // Get updated unread count
        $countStmt = $conn->prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0");
        $countStmt->bind_param('i', $userId);
        $countStmt->execute();
        $countResult = $countStmt->get_result();
        $unreadCount = (int)$countResult->fetch_assoc()['count'];
        $countStmt->close();

        echo json_encode([
            'success' => true,
            'message' => 'Notification marked as read',
            'unread_count' => $unreadCount
        ]);

    } else {
        // Mark all notifications as read for user
        $stmt = $conn->prepare("
            UPDATE notifications 
            SET is_read = 1 
            WHERE user_id = ? AND is_read = 0
        ");

        if (!$stmt) {
            throw new RuntimeException('Failed to prepare statement: ' . $conn->error);
        }

        $stmt->bind_param('i', $userId);
        
        if (!$stmt->execute()) {
            throw new RuntimeException('Failed to update notifications: ' . $stmt->error);
        }

        $affected = $stmt->affected_rows;
        $stmt->close();

        // Get updated unread count (should be 0 after marking all as read)
        $countStmt = $conn->prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0");
        $countStmt->bind_param('i', $userId);
        $countStmt->execute();
        $countResult = $countStmt->get_result();
        $unreadCount = (int)$countResult->fetch_assoc()['count'];
        $countStmt->close();

        echo json_encode([
            'success' => true,
            'message' => 'All notifications marked as read',
            'updated_count' => $affected,
            'unread_count' => $unreadCount
        ]);
    }

} catch (Exception $e) {
    http_response_code(400);
    error_log('Mark as Read API Error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

