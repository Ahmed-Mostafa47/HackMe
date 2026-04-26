<?php
declare(strict_types=1);

require_once __DIR__ . '/../../utils/permissions.php';

function sanitize_comment_text(string $text): string
{
    $clean = trim($text);
    $clean = strip_tags($clean); // Remove HTML tags to prevent XSS
    $clean = preg_replace('/\s+/', ' ', $clean) ?? $clean; // Normalize whitespace
    $clean = mb_substr($clean, 0, 500, 'UTF-8'); // Limit length

    // Don't HTML-encode here - React will handle XSS protection when rendering
    // Prepared statements already protect against SQL injection
    return $clean;
}

function parse_profile_meta(?string $meta): array
{
    if (!$meta) {
        return [];
    }

    $decoded = json_decode($meta, true);
    return is_array($decoded) ? $decoded : [];
}

function format_comment_row(array $row): array
{
    $profileMeta = [];
    if (isset($row['profile_meta'])) {
        $profileMeta = parse_profile_meta($row['profile_meta']);
    }

    // Format timestamp - use UNIX timestamp from MySQL for accurate timezone-independent calculation
    $createdAt = $row['created_at'] ?? null;
    if ($createdAt) {
        // Prefer UNIX timestamp if available (timezone-independent)
        if (isset($row['created_at_unix']) && $row['created_at_unix'] !== null) {
            $unixTimestamp = (int)$row['created_at_unix'];
            // Convert UNIX timestamp to ISO 8601 UTC format
            $dt = new DateTime('@' . $unixTimestamp);
            $dt->setTimezone(new DateTimeZone('UTC'));
            $createdAt = $dt->format('Y-m-d\TH:i:s\Z');
        } else {
            // Fallback: use datetime string, convert space to T
            if (is_string($createdAt) && strpos($createdAt, 'T') === false) {
                $createdAt = str_replace(' ', 'T', $createdAt);
            }
        }
    }
    
    $updatedAt = $row['updated_at'] ?? null;
    if ($updatedAt) {
        if (isset($row['updated_at_unix']) && $row['updated_at_unix'] !== null) {
            $unixTimestamp = (int)$row['updated_at_unix'];
            $dt = new DateTime('@' . $unixTimestamp);
            $dt->setTimezone(new DateTimeZone('UTC'));
            $updatedAt = $dt->format('Y-m-d\TH:i:s\Z');
        } else {
            if (is_string($updatedAt) && strpos($updatedAt, 'T') === false) {
                $updatedAt = str_replace(' ', 'T', $updatedAt);
            }
        }
    }

    // Decode HTML entities in content (for backward compatibility with old encoded comments)
    $content = $row['content'] ?? '';
    $content = html_entity_decode($content, ENT_QUOTES | ENT_HTML5, 'UTF-8');

    return [
        'id' => (int)($row['id'] ?? 0),
        'parent_id' => isset($row['parent_id']) ? (int)$row['parent_id'] : null,
        'user_id' => (int)($row['user_id'] ?? 0),
        'user' => $row['username'] ?? 'OPERATIVE',
        'avatar' => $profileMeta['avatar'] ?? '💀',
        'rank' => $profileMeta['rank'] ?? null,
        'text' => $content,
        'likes' => (int)($row['likes'] ?? 0),
        'liked_by_current_user' => isset($row['liked_by_current_user'])
            ? (bool)$row['liked_by_current_user']
            : false,
        'created_at' => $createdAt,
        'updated_at' => $updatedAt,
        'replies' => isset($row['replies']) ? $row['replies'] : [],
    ];
}

function fetch_comment_by_id(mysqli $conn, int $commentId, ?int $currentUserId = null): ?array
{
    if ($currentUserId) {
        $sql = "
            SELECT 
                c.id,
                c.parent_id,
                c.user_id,
                c.content,
                c.created_at,
                UNIX_TIMESTAMP(c.created_at) as created_at_unix,
                c.updated_at,
                UNIX_TIMESTAMP(c.updated_at) as updated_at_unix,
                u.username,
                u.profile_meta,
                (
                    SELECT COUNT(*) 
                    FROM comment_likes cl 
                    WHERE cl.comment_id = c.id
                ) AS likes,
                EXISTS(
                    SELECT 1 FROM comment_likes cl2 
                    WHERE cl2.comment_id = c.id 
                      AND cl2.user_id = ?
                ) AS liked_by_current_user
            FROM comments c
            LEFT JOIN users u ON u.user_id = c.user_id
            WHERE c.id = ?
            LIMIT 1
        ";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new RuntimeException('Failed to prepare statement: ' . $conn->error);
        }
        $stmt->bind_param('ii', $currentUserId, $commentId);
    } else {
        $sql = "
            SELECT 
                c.id,
                c.parent_id,
                c.user_id,
                c.content,
                c.created_at,
                UNIX_TIMESTAMP(c.created_at) as created_at_unix,
                c.updated_at,
                UNIX_TIMESTAMP(c.updated_at) as updated_at_unix,
                u.username,
                u.profile_meta,
                (
                    SELECT COUNT(*) 
                    FROM comment_likes cl 
                    WHERE cl.comment_id = c.id
                ) AS likes,
                0 AS liked_by_current_user
            FROM comments c
            LEFT JOIN users u ON u.user_id = c.user_id
            WHERE c.id = ?
            LIMIT 1
        ";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new RuntimeException('Failed to prepare statement: ' . $conn->error);
        }
        $stmt->bind_param('i', $commentId);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();

    if (!$row) {
        return null;
    }

    $comment = format_comment_row($row);
    $comment['replies'] = [];
    return $comment;
}
// user_is_admin function is now provided by permissions.php
// This file includes permissions.php at the top, so the function is available here


