<?php
declare(strict_types=1);

// Start output buffering to prevent warnings from corrupting JSON
ob_start();

// Suppress display of errors (we'll log them instead)
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_clean();
    http_response_code(200);
    ob_end_flush();
    exit;
}

require_once __DIR__ . '/../../utils/db_connect.php';
require_once __DIR__ . '/comments_repository.php';
require_once __DIR__ . '/../../utils/notification_helper.php';
require_once __DIR__ . '/../../utils/comment_moderation.php';

$method = $_SERVER['REQUEST_METHOD'];
$pathInfo = $_SERVER['PATH_INFO'] ?? '';
$segments = array_values(array_filter(explode('/', $pathInfo)));

try {
    switch ($method) {
        case 'GET':
            handle_get_comments($conn);
            break;
        case 'POST':
            handle_create_comment($conn);
            break;
        case 'DELETE':
            handle_delete_comment($conn, $segments);
            break;
        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Method Not Allowed',
            ]);
            break;
    }
} catch (Throwable $e) {
    ob_clean();
    http_response_code(500);
    error_log('Comments API Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error' => $e->getFile() . ':' . $e->getLine(),
    ]);
    ob_end_flush();
}

function handle_get_comments(mysqli $conn): void
{
    $currentUserId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;

    if ($currentUserId && $currentUserId < 1) {
        $currentUserId = null;
    }

    // Check if parent_id column exists
    $checkColumn = $conn->query("SHOW COLUMNS FROM comments LIKE 'parent_id'");
    $hasParentId = $checkColumn && $checkColumn->num_rows > 0;
    $parentIdSelect = $hasParentId ? 'c.parent_id,' : 'NULL AS parent_id,';

    // Fetch all comments (top-level and replies)
    // Use UNIX_TIMESTAMP for timezone-independent timestamps
    if ($currentUserId) {
        $sql = "
            SELECT 
                c.id,
                {$parentIdSelect}
                c.user_id,
                c.content,
                c.created_at,
                UNIX_TIMESTAMP(c.created_at) as created_at_unix,
                c.updated_at,
                UNIX_TIMESTAMP(c.updated_at) as updated_at_unix,
                u.username,
                u.profile_meta,
                COALESCE(l.like_count, 0) AS likes,
                EXISTS(
                    SELECT 1 
                    FROM comment_likes cl 
                    WHERE cl.comment_id = c.id 
                      AND cl.user_id = ?
                ) AS liked_by_current_user
            FROM comments c
            LEFT JOIN users u ON u.user_id = c.user_id
            LEFT JOIN (
                SELECT comment_id, COUNT(*) AS like_count
                FROM comment_likes
                GROUP BY comment_id
            ) l ON l.comment_id = c.id
            ORDER BY c.created_at ASC
        ";

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new RuntimeException('Failed to prepare statement: ' . $conn->error);
        }
        $stmt->bind_param('i', $currentUserId);
    } else {
        $sql = "
            SELECT 
                c.id,
                {$parentIdSelect}
                c.user_id,
                c.content,
                c.created_at,
                UNIX_TIMESTAMP(c.created_at) as created_at_unix,
                c.updated_at,
                UNIX_TIMESTAMP(c.updated_at) as updated_at_unix,
                u.username,
                u.profile_meta,
                COALESCE(l.like_count, 0) AS likes,
                0 AS liked_by_current_user
            FROM comments c
            LEFT JOIN users u ON u.user_id = c.user_id
            LEFT JOIN (
                SELECT comment_id, COUNT(*) AS like_count
                FROM comment_likes
                GROUP BY comment_id
            ) l ON l.comment_id = c.id
            ORDER BY c.created_at ASC
        ";

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new RuntimeException('Failed to prepare statement: ' . $conn->error);
        }
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $allComments = [];
    $commentsMap = [];

    // Build map of all comments
    while ($row = $result->fetch_assoc()) {
        $comment = format_comment_row($row);
        // Get parent_id from row (might be null if column doesn't exist)
        $parentId = null;
        if (isset($row['parent_id'])) {
            $parentId = $row['parent_id'] !== null ? (int)$row['parent_id'] : null;
        }
        $comment['parent_id'] = $parentId;
        $comment['replies'] = [];
        // Store in map
        $commentsMap[$comment['id']] = $comment;
        $allComments[] = $comment;
    }

    $stmt->close();

    // Build nested structure (only if parent_id column exists)
    $topLevelComments = [];
    $checkColumn = $conn->query("SHOW COLUMNS FROM comments LIKE 'parent_id'");
    $hasParentId = $checkColumn && $checkColumn->num_rows > 0;
    
    if ($hasParentId) {
        // First pass: identify top-level comments
        foreach ($allComments as $comment) {
            $parentId = $comment['parent_id'] ?? null;
            if ($parentId === null || $parentId === 0) {
                // Top-level comment - add to array (copy from map to ensure we have the right structure)
                $topLevelComments[] = $commentsMap[$comment['id']];
            }
        }
        
        // Second pass: add replies to their parents in the topLevelComments array
        foreach ($allComments as $comment) {
            $parentId = $comment['parent_id'] ?? null;
            if ($parentId !== null && $parentId > 0) {
                // This is a reply - find parent in topLevelComments and add reply
                $parentIdInt = (int)$parentId;
                foreach ($topLevelComments as &$topComment) {
                    if ($topComment['id'] === $parentIdInt) {
                        if (!isset($topComment['replies'])) {
                            $topComment['replies'] = [];
                        }
                        $topComment['replies'][] = $commentsMap[$comment['id']];
                        break;
                    }
                }
                unset($topComment); // Break reference
            }
        }
    } else {
        // No parent_id column - all comments are top-level
        $topLevelComments = $allComments;
    }

    // Sort top-level comments by created_at DESC
    usort($topLevelComments, function($a, $b) {
        $timeA = strtotime($a['created_at'] ?? '1970-01-01');
        $timeB = strtotime($b['created_at'] ?? '1970-01-01');
        return $timeB - $timeA;
    });

    // Sort replies within each comment by created_at ASC (oldest first)
    foreach ($topLevelComments as &$comment) {
        if (!empty($comment['replies'])) {
            usort($comment['replies'], function($a, $b) {
                $timeA = strtotime($a['created_at'] ?? '1970-01-01');
                $timeB = strtotime($b['created_at'] ?? '1970-01-01');
                return $timeA - $timeB;
            });
        }
    }
    unset($comment); // Break reference

    $extra = [];
    if ($currentUserId) {
        $st = hackme_user_comments_ban_status($conn, $currentUserId);
        $extra['comments_posting_blocked'] = $st['banned'];
        $extra['comments_banned_until'] = $st['until'];
    }

    ob_clean();
    echo json_encode(array_merge([
        'success' => true,
        'comments' => $topLevelComments,
    ], $extra));
    ob_end_flush();
}

function handle_create_comment(mysqli $conn): void
{
    $payload = json_decode(file_get_contents('php://input') ?: '[]', true);

    if (!is_array($payload)) {
        throw new InvalidArgumentException('Invalid payload');
    }

    $userId = isset($payload['user_id']) ? (int)$payload['user_id'] : 0;
    $content = isset($payload['content']) ? (string)$payload['content'] : '';
    $parentId = isset($payload['parent_id']) ? (int)$payload['parent_id'] : null;

    if ($userId < 1) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Missing or invalid user_id',
        ]);
        return;
    }

    if (trim($content) === '') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Comment content is required',
        ]);
        return;
    }

    // Check if parent_id column exists
    $checkColumn = $conn->query("SHOW COLUMNS FROM comments LIKE 'parent_id'");
    $hasParentId = $checkColumn && $checkColumn->num_rows > 0;

    // Validate parent_id if provided
    if ($parentId !== null && $parentId > 0) {
        if (!$hasParentId) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Replies feature not available. Please run database migration: server/sql/add_comments_replies.sql',
            ]);
            return;
        }
        
        $checkStmt = $conn->prepare("SELECT id FROM comments WHERE id = ? LIMIT 1");
        if (!$checkStmt) {
            throw new RuntimeException('Failed to prepare parent check: ' . $conn->error);
        }
        $checkStmt->bind_param('i', $parentId);
        $checkStmt->execute();
        $parentResult = $checkStmt->get_result();
        if ($parentResult->num_rows === 0) {
            $checkStmt->close();
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Parent comment not found',
            ]);
            return;
        }
        $checkStmt->close();
    } else {
        $parentId = null;
    }

    $ban = hackme_user_comments_ban_status($conn, $userId);
    if ($ban['banned']) {
        ob_clean();
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'You are blocked from posting comments due to repeated policy violations.',
            'code' => 'COMMENTS_BANNED',
            'banned_until' => $ban['until'],
        ]);
        ob_end_flush();
        return;
    }

    $sanitizedContent = sanitize_comment_text($content);

    $mod = hackme_moderate_comment_text($sanitizedContent);
    if ($mod['flagged']) {
        $strike = hackme_record_comment_moderation_strike($conn, $userId);
        if ($strike['strikes'] === 1) {
            send_notification(
                $conn,
                $userId,
                null,
                'moderation',
                'Comment blocked',
                'Your comment was not posted: it violates community guidelines (e.g. hate, harassment, or abuse). A second violation will permanently ban you from commenting.',
                '/comments'
            );
        } elseif (!empty($strike['banned'])) {
            send_notification(
                $conn,
                $userId,
                null,
                'moderation',
                'Banned from comments',
                'You can no longer post comments after repeated violations of our community guidelines.',
                '/comments'
            );
        }

        ob_clean();
        http_response_code(422);
        echo json_encode([
            'success' => false,
            'message' => 'This comment violates community guidelines and was not posted.',
            'code' => 'COMMENT_MODERATION_BLOCKED',
            'strike' => $strike['strikes'],
            'banned' => (bool) ($strike['banned'] ?? false),
        ]);
        ob_end_flush();
        return;
    }

    if ($parentId !== null) {
        $stmt = $conn->prepare("INSERT INTO comments (user_id, content, parent_id) VALUES (?, ?, ?)");
        if (!$stmt) {
            throw new RuntimeException('Failed to prepare insert statement: ' . $conn->error);
        }
        $stmt->bind_param('isi', $userId, $sanitizedContent, $parentId);
    } else {
        $stmt = $conn->prepare("INSERT INTO comments (user_id, content) VALUES (?, ?)");
        if (!$stmt) {
            throw new RuntimeException('Failed to prepare insert statement: ' . $conn->error);
        }
        $stmt->bind_param('is', $userId, $sanitizedContent);
    }

    if (!$stmt->execute()) {
        throw new RuntimeException('Failed to create comment: ' . $stmt->error);
    }

    $commentId = (int)$conn->insert_id;
    $stmt->close();

    $comment = fetch_comment_by_id($conn, $commentId, $userId);
    if ($comment) {
        if ($parentId !== null) {
            $comment['parent_id'] = $parentId;

            // Send notification to parent comment owner
            $parentStmt = $conn->prepare("SELECT user_id, content FROM comments WHERE id = ? LIMIT 1");
            if ($parentStmt) {
                $parentStmt->bind_param('i', $parentId);
                $parentStmt->execute();
                $parentResult = $parentStmt->get_result()->fetch_assoc();
                $parentStmt->close();

                if ($parentResult && (int)$parentResult['user_id'] !== $userId) {
                    $parentOwnerId = (int)$parentResult['user_id'];
                    $replyContent = mb_substr($sanitizedContent, 0, 50);
                    if (mb_strlen($sanitizedContent) > 50) {
                        $replyContent .= '...';
                    }

                    send_notification(
                        $conn,
                        $parentOwnerId,
                        $userId,
                        'reply',
                        'New Reply',
                        "Someone replied to your comment: \"$replyContent\"",
                        '/comments'
                    );
                }
            }
        } else {
            // New top-level comment - notify all users who have commented (optional)
            // For now, we'll skip this to avoid spam, but you can add it if needed
        }
        // Ensure replies array exists
        if (!isset($comment['replies'])) {
            $comment['replies'] = [];
        }
    }

    ob_clean();
    echo json_encode([
        'success' => true,
        'message' => $parentId ? 'Reply created' : 'Comment created',
        'comment' => $comment,
    ]);
    ob_end_flush();
}

function handle_delete_comment(mysqli $conn, array $segments): void
{
    $commentId = extract_comment_id($segments);

    $rawBody = file_get_contents('php://input');
    $body = $rawBody ? json_decode($rawBody, true) : [];

    if (!is_array($body)) {
        $body = [];
    }

    $userId = isset($body['user_id']) ? (int)$body['user_id'] : 0;

    if ($commentId < 1) {
        ob_clean();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid comment id',
        ]);
        ob_end_flush();
        return;
    }

    if ($userId < 1) {
        ob_clean();
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'User context required',
        ]);
        ob_end_flush();
        return;
    }

    if (!user_is_admin($conn, $userId)) {
        ob_clean();
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Admin privileges required',
        ]);
        ob_end_flush();
        return;
    }

    $stmt = $conn->prepare("DELETE FROM comments WHERE id = ?");
    if (!$stmt) {
        throw new RuntimeException('Failed to prepare delete statement: ' . $conn->error);
    }

    $stmt->bind_param('i', $commentId);
    $stmt->execute();

    $deleted = $stmt->affected_rows > 0;
    $stmt->close();

    if (!$deleted) {
        ob_clean();
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Comment not found',
        ]);
        ob_end_flush();
        return;
    }

    ob_clean();
    echo json_encode([
        'success' => true,
        'message' => 'Comment deleted',
    ]);
    ob_end_flush();
}

function extract_comment_id(array $segments): int
{
    // First try to get from PATH_INFO segments (e.g., /comments/3)
    // if (!empty($segments)) {
    //     $first = reset($segments);
    //     if (is_numeric($first)) {
    //         return (int)$first;
    //     }
    // }

    // Then try query parameter (e.g., /comments.php?id=3)
    if (isset($_GET['id']) && is_numeric($_GET['id'])) {
        return (int)$_GET['id'];
    }

    // Also check REQUEST_URI for numeric segments
    $requestUri = $_SERVER['REQUEST_URI'] ?? '';
    $uriParts = explode('/', trim(parse_url($requestUri, PHP_URL_PATH), '/'));
    foreach ($uriParts as $part) {
        if (is_numeric($part)) {
            return (int)$part;
        }
    }

    return 0;
}


