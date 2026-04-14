<?php
/**
 * Notification Helper
 * Utility functions for sending notifications
 */

/**
 * Send a notification
 * @param mysqli $conn Database connection
 * @param int $userId User who receives the notification
 * @param int|null $fromUserId User who triggered the notification
 * @param string $type Notification type (like, comment, reply, message, update, role_request)
 * @param string $title Notification title
 * @param string $message Notification message
 * @param string|null $link Optional link to related content
 * @return bool Success status
 */
function send_notification(
    mysqli $conn,
    int $userId,
    ?int $fromUserId,
    string $type,
    string $title,
    string $message,
    ?string $link = null
): bool {
    // Don't notify user about their own actions
    if ($fromUserId !== null && $userId === $fromUserId) {
        return false;
    }

    // Validate type
    $allowedTypes = ['like', 'comment', 'reply', 'message', 'update', 'role_request', 'system', 'moderation'];
    if (!in_array($type, $allowedTypes)) {
        error_log("Invalid notification type: $type");
        return false;
    }

    // Sanitize inputs - strip HTML tags but don't HTML-encode
    // React will handle XSS protection when rendering, and prepared statements protect against SQL injection
    $title = strip_tags($title);
    $message = strip_tags($message);
    $link = $link ? filter_var($link, FILTER_SANITIZE_URL) : null;

    // Insert notification into database
    $stmt = $conn->prepare("
        INSERT INTO notifications (user_id, from_user_id, type, title, message, link, is_read)
        VALUES (?, ?, ?, ?, ?, ?, 0)
    ");

    if (!$stmt) {
        error_log('Failed to prepare notification statement: ' . $conn->error);
        return false;
    }

    $stmt->bind_param('iissss', $userId, $fromUserId, $type, $title, $message, $link);

    if (!$stmt->execute()) {
        error_log('Failed to create notification: ' . $stmt->error);
        $stmt->close();
        return false;
    }

    $notificationId = (int)$conn->insert_id;
    $stmt->close();

    // Send to Node.js server for real-time delivery (non-blocking)
    $nodeServerUrl = 'http://localhost:3001/push';
    $secretToken = 'your-secret-token-change-this-in-production';

    $nodePayload = [
        'notification_id' => $notificationId,
        'user_id' => $userId,
        'from_user_id' => $fromUserId,
        'type' => $type,
        'title' => $title,
        'message' => $message,
        'link' => $link,
        'created_at' => date('Y-m-d\TH:i:s\Z'),
        'secret' => $secretToken
    ];

    // Send HTTP request to Node.js server (non-blocking)
    $ch = curl_init($nodeServerUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($nodePayload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-Secret-Token: ' . $secretToken
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 1); // 1 second timeout (non-blocking)
    curl_setopt($ch, CURLOPT_NOSIGNAL, 1);
    
    // Execute in background (don't wait for response)
    curl_exec($ch);
    curl_close($ch);

    return true;
}


