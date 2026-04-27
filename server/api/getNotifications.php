<?php
declare(strict_types=1);

/**
 * Get Notifications API Endpoint
 * Returns all notifications for a user
 * 
 * GET /api/getNotifications.php?user_id=123&limit=20&unread_only=0
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../utils/db_connect.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed'
        ]);
        exit;
    }

    $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
    
    // Security: Validate user_id
    if ($userId < 1) {
        throw new InvalidArgumentException('Invalid user_id');
    }
    
    // LIMIT cannot use bound parameters reliably on all MySQL/PDO setups (may become quoted string).
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 20;
    if ($limit < 1) {
        $limit = 20;
    }
    if ($limit > 100) {
        $limit = 100;
    }
    $unreadOnly = isset($_GET['unread_only']) ? (int)$_GET['unread_only'] : 0;

    // Build query - optimized with UNIX_TIMESTAMP for timezone-independent timestamps
    $whereClause = "WHERE n.user_id = ?";
    if ($unreadOnly) {
        $whereClause .= " AND n.is_read = 0";
    }

    $sql = "
        SELECT 
            n.id,
            n.user_id,
            n.from_user_id,
            n.type,
            n.title,
            n.message,
            n.link,
            n.is_read,
            UNIX_TIMESTAMP(n.created_at) as created_at_unix,
            u.username as from_username,
            u.profile_meta as from_profile_meta
        FROM notifications n
        LEFT JOIN users u ON u.user_id = n.from_user_id
        {$whereClause}
        ORDER BY n.created_at DESC
        LIMIT {$limit}
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Failed to prepare statement: ' . $conn->error);
    }

    $stmt->bind_param('i', $userId);

    if (!$stmt->execute()) {
        throw new RuntimeException('Failed to execute query: ' . $stmt->error);
    }
    $result = $stmt->get_result();
    if ($result === false) {
        throw new RuntimeException('Failed to read notification results');
    }
    $notifications = [];

    while ($row = $result->fetch_assoc()) {
        $profileMeta = [];
        if (isset($row['from_profile_meta'])) {
            $decoded = json_decode($row['from_profile_meta'], true);
            $profileMeta = is_array($decoded) ? $decoded : [];
        }

        // Format timestamp from UNIX timestamp to ISO 8601 UTC
        $createdAt = null;
        if (isset($row['created_at_unix']) && $row['created_at_unix'] !== null) {
            $unixTimestamp = (int)$row['created_at_unix'];
            $dt = new DateTime('@' . $unixTimestamp);
            $dt->setTimezone(new DateTimeZone('UTC'));
            $createdAt = $dt->format('Y-m-d\TH:i:s\Z');
        }

        // Decode HTML entities in title and message (for backward compatibility with old encoded notifications)
        $title = html_entity_decode($row['title'] ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $message = html_entity_decode($row['message'] ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $link = isset($row['link']) ? html_entity_decode($row['link'], ENT_QUOTES | ENT_HTML5, 'UTF-8') : null;

        $notifications[] = [
            'id' => (int)$row['id'],
            'user_id' => (int)$row['user_id'],
            'from_user_id' => $row['from_user_id'] ? (int)$row['from_user_id'] : null,
            'from_username' => $row['from_username'] ?? null,
            'from_avatar' => $profileMeta['avatar'] ?? '💀',
            'type' => $row['type'],
            'title' => $title,
            'message' => $message,
            'link' => $link,
            'is_read' => (bool)$row['is_read'],
            'created_at' => $createdAt
        ];
    }

    $stmt->close();

    // Get unread count - optimized with single query
    $countStmt = $conn->prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0");
    if (!$countStmt) {
        throw new RuntimeException('Failed to prepare count statement: ' . $conn->error);
    }
    $countStmt->bind_param('i', $userId);
    $countStmt->execute();
    $countResult = $countStmt->get_result();
    $countRow = $countResult->fetch_assoc();
    $unreadCount = (int)($countRow['count'] ?? 0);
    $countStmt->close();

    echo json_encode([
        'success' => true,
        'notifications' => $notifications,
        'unread_count' => $unreadCount,
        'total' => count($notifications)
    ]);

} catch (Exception $e) {
    http_response_code(400);
    error_log('Get Notifications API Error: ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

