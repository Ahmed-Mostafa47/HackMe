<?php
declare(strict_types=1);

require_once __DIR__ . '/pdo_mysqli_shim.php';
require_once __DIR__ . '/mailer.php';

/**
 * Send immediate security alert email to all active superadmins.
 */
function hackme_send_security_alert_meta(
    PdoMysqliShim $conn,
    string $attackType,
    string $attackerName,
    string $ipAddress,
    string $eventTimeUtc,
    array $extra = []
): array {
    $attackType = trim($attackType);
    if ($attackType === '') {
        $attackType = 'unknown_attack';
    }
    $attackerName = trim($attackerName);
    if ($attackerName === '') {
        $attackerName = 'unknown';
    }
    $ipAddress = trim($ipAddress);
    if ($ipAddress === '') {
        $ipAddress = 'unknown';
    }
    $eventTimeUtc = trim($eventTimeUtc);
    if ($eventTimeUtc === '') {
        $eventTimeUtc = gmdate('Y-m-d\TH:i:s\Z');
    }

    $recipients = [];
    $q = $conn->query("
        SELECT DISTINCT u.user_id, u.email, u.profile_meta
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.user_id
        LEFT JOIN roles r ON r.role_id = ur.role_id
        WHERE COALESCE(u.is_active, 1) = 1
          AND TRIM(IFNULL(u.email, '')) <> ''
        ORDER BY u.user_id ASC
    ");
    if ($q) {
        while ($row = $q->fetch_assoc()) {
            $isSuperAdmin = false;
            $roleName = strtolower(trim((string)($row['name'] ?? '')));
            if ($roleName === 'superadmin') {
                $isSuperAdmin = true;
            }
            $profileMeta = $row['profile_meta'] ?? null;
            if (!$isSuperAdmin && is_string($profileMeta)) {
                $decoded = json_decode($profileMeta, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $rank = strtoupper(trim((string)($decoded['rank'] ?? '')));
                    if ($rank === 'SUPERADMIN') {
                        $isSuperAdmin = true;
                    }
                }
            }
            if (!$isSuperAdmin && (int)($row['user_id'] ?? 0) === 9) {
                $isSuperAdmin = true;
            }
            if (!$isSuperAdmin) {
                continue;
            }
            $email = trim((string)($row['email'] ?? ''));
            if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $recipients[strtolower($email)] = $email;
            }
        }
    }

    if (empty($recipients)) {
        return ['sent' => false, 'sent_count' => 0, 'recipients' => 0, 'error' => 'no_superadmin_recipients'];
    }

    $subject = '[HackMe Security Alert] Attack attempt detected: ' . $attackType;
    $eventTimeLocal = $eventTimeUtc;
    $clientTz = trim((string)($extra['client_timezone'] ?? ''));
    if ($clientTz !== '') {
        try {
            $utc = new DateTime($eventTimeUtc, new DateTimeZone('UTC'));
            $utc->setTimezone(new DateTimeZone($clientTz));
            $eventTimeLocal = $utc->format('Y-m-d H:i:s') . ' (' . $clientTz . ')';
        } catch (Throwable $e) {
            $eventTimeLocal = $eventTimeUtc;
        }
    }
    $extraLines = '';
    foreach ($extra as $k => $v) {
        $key = trim((string)$k);
        if ($key === '') {
            continue;
        }
        $val = is_scalar($v) ? (string)$v : json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $extraLines .= '<li><strong>' . htmlspecialchars($key) . ':</strong> ' . htmlspecialchars((string)$val) . '</li>';
    }
    $body = '
        <h3>Security Alert: Attack Attempt</h3>
        <p>An attack attempt was detected on the platform.</p>
        <ul>
            <li><strong>Attack Type:</strong> ' . htmlspecialchars($attackType) . '</li>
            <li><strong>Attacker Name:</strong> ' . htmlspecialchars($attackerName) . '</li>
            <li><strong>IP Address:</strong> ' . htmlspecialchars($ipAddress) . '</li>
            <li><strong>Time (Local):</strong> ' . htmlspecialchars($eventTimeLocal) . '</li>
            <li><strong>Time (UTC):</strong> ' . htmlspecialchars($eventTimeUtc) . '</li>
            ' . $extraLines . '
        </ul>
    ';

    try {
        $sentCount = 0;
        $lastError = '';
        foreach ($recipients as $email) {
            $mail = cyberops_mailer();
            if (!$mail) {
                $lastError = 'mailer_unavailable';
                continue;
            }
            $mail->clearAddresses();
            $mail->addAddress($email);
            $mail->Subject = $subject;
            $mail->Body = $body;
            $mail->AltBody = "Security Alert\nAttack Type: {$attackType}\nAttacker: {$attackerName}\nIP: {$ipAddress}\nTime (Local): {$eventTimeLocal}\nTime (UTC): {$eventTimeUtc}";
            if ($mail->send()) {
                $sentCount++;
            } else {
                $lastError = trim((string)$mail->ErrorInfo);
            }
        }
        return [
            'sent' => $sentCount > 0,
            'sent_count' => $sentCount,
            'recipients' => count($recipients),
            'error' => $lastError,
        ];
    } catch (Throwable $e) {
        error_log('Security alert mail failed: ' . $e->getMessage());
        return ['sent' => false, 'sent_count' => 0, 'recipients' => count($recipients), 'error' => $e->getMessage()];
    }
}

function hackme_send_security_alert(
    PdoMysqliShim $conn,
    string $attackType,
    string $attackerName,
    string $ipAddress,
    string $eventTimeUtc,
    array $extra = []
): bool {
    $meta = hackme_send_security_alert_meta($conn, $attackType, $attackerName, $ipAddress, $eventTimeUtc, $extra);
    return !empty($meta['sent']);
}

