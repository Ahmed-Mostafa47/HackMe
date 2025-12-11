<?php
declare(strict_types=1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method Not Allowed',
    ]);
    exit;
}

require_once __DIR__ . '/../../utils/db_connect.php';
require_once __DIR__ . '/comments_repository.php';
require_once __DIR__ . '/../../utils/notification_helper.php';

try {
    $payload = json_decode(file_get_contents('php://input') ?: '[]', true);
    if (!is_array($payload)) {
        throw new InvalidArgumentException('Invalid payload');
    }

    $commentId = isset($payload['comment_id']) ? (int)$payload['comment_id'] : 0;
    $userId = isset($payload['user_id']) ? (int)$payload['user_id'] : 0;

    if ($commentId < 1 || $userId < 1) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'comment_id and user_id are required',
        ]);
        exit;
    }

    $commentCheck = $conn->prepare("SELECT 1 FROM comments WHERE id = ? LIMIT 1");
    if (!$commentCheck) {
        throw new RuntimeException('Failed to prepare comment lookup: ' . $conn->error);
    }
    $commentCheck->bind_param('i', $commentId);
    $commentCheck->execute();
    $commentExists = $commentCheck->get_result()->num_rows > 0;
    $commentCheck->close();

    if (!$commentExists) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Comment not found',
        ]);
        exit;
    }

    $toggleStmt = $conn->prepare("SELECT 1 FROM comment_likes WHERE comment_id = ? AND user_id = ? LIMIT 1");
    if (!$toggleStmt) {
        throw new RuntimeException('Failed to prepare toggle statement: ' . $conn->error);
    }
    $toggleStmt->bind_param('ii', $commentId, $userId);
    $toggleStmt->execute();
    $toggleResult = $toggleStmt->get_result();
    $alreadyLiked = $toggleResult->num_rows > 0;
    $toggleStmt->close();

    if ($alreadyLiked) {
        $deleteStmt = $conn->prepare("DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?");
        if (!$deleteStmt) {
            throw new RuntimeException('Failed to prepare unlike statement: ' . $conn->error);
        }
        $deleteStmt->bind_param('ii', $commentId, $userId);
        $deleteStmt->execute();
        $deleteStmt->close();
        $liked = false;
    } else {
        $insertStmt = $conn->prepare("INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)");
        if (!$insertStmt) {
            throw new RuntimeException('Failed to prepare like statement: ' . $conn->error);
        }
        $insertStmt->bind_param('ii', $commentId, $userId);
        $insertStmt->execute();
        $insertStmt->close();
        $liked = true;

        // Send notification to comment owner
        $commentOwnerStmt = $conn->prepare("SELECT user_id, content FROM comments WHERE id = ? LIMIT 1");
        if ($commentOwnerStmt) {
            $commentOwnerStmt->bind_param('i', $commentId);
            $commentOwnerStmt->execute();
            $commentResult = $commentOwnerStmt->get_result()->fetch_assoc();
            $commentOwnerStmt->close();

            if ($commentResult && (int)$commentResult['user_id'] !== $userId) {
                $commentOwnerId = (int)$commentResult['user_id'];
                $commentContent = mb_substr($commentResult['content'], 0, 50);
                if (mb_strlen($commentResult['content']) > 50) {
                    $commentContent .= '...';
                }

                send_notification(
                    $conn,
                    $commentOwnerId,
                    $userId,
                    'like',
                    'New Like',
                    "Someone liked your comment: \"$commentContent\"",
                    '/comments'
                );
            }
        }
    }

    $countStmt = $conn->prepare("SELECT COUNT(*) AS likes FROM comment_likes WHERE comment_id = ?");
    if (!$countStmt) {
        throw new RuntimeException('Failed to prepare count statement: ' . $conn->error);
    }
    $countStmt->bind_param('i', $commentId);
    $countStmt->execute();
    $countResult = $countStmt->get_result()->fetch_assoc();
    $countStmt->close();

    $likes = (int)($countResult['likes'] ?? 0);
    $comment = fetch_comment_by_id($conn, $commentId, $userId);

    echo json_encode([
        'success' => true,
        'liked' => $liked,
        'likes' => $likes,
        'comment' => $comment,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ]);
}

