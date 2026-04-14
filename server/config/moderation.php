<?php
/**
 * Comment moderation API keys.
 * Prefer environment variables on the server, or copy moderation.local.example.php
 * to moderation.local.php (see .gitignore) and set keys there.
 */
declare(strict_types=1);

$local = [];
$localPath = __DIR__ . '/moderation.local.php';
if (is_readable($localPath)) {
    $loaded = include $localPath;
    if (is_array($loaded)) {
        $local = $loaded;
    }
}

return [
    'openai_api_key' => (string) ($local['openai_api_key'] ?? (getenv('OPENAI_API_KEY') ?: '')),
    'perspective_api_key' => (string) ($local['perspective_api_key'] ?? (getenv('PERSPECTIVE_API_KEY') ?: (getenv('GOOGLE_PERSPECTIVE_KEY') ?: ''))),
    /** Score 0–1; above = flagged (Perspective) */
    'perspective_threshold' => isset($local['perspective_threshold']) ? (float) $local['perspective_threshold'] : 0.72,
];
