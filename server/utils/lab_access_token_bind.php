<?php
declare(strict_types=1);

/**
 * Lab access token binding: REMOTE_ADDR + browser device_bind + optional real MAC and IPv4
 * (from local identity server; browsers cannot read hardware MAC).
 * Use REMOTE_ADDR only (not X-Forwarded-For) to reduce client-spoofed header risk unless you
 * terminate TLS at a trusted reverse proxy.
 */
function hackme_request_client_ip(): string
{
    return trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
}

/** Normalize to AA:BB:CC:DD:EE:FF or empty if invalid. */
function hackme_normalize_mac(string $raw): string
{
    $s = strtoupper(preg_replace('/[^a-fA-F0-9]/', '', $raw));
    if (strlen($s) !== 12) {
        return '';
    }
    return implode(':', str_split($s, 2));
}

function hackme_normalize_client_local_ip(string $raw): string
{
    $t = trim($raw);
    if ($t === '' || !filter_var($t, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        return '';
    }
    return $t;
}

function hackme_lab_access_tokens_ensure_bind_columns(PDO|PdoMysqliShim $db): void
{
    $columnMissing = static function (string $name) use ($db): bool {
        $check = $db->query("SHOW COLUMNS FROM lab_access_tokens LIKE '" . $name . "'");
        if ($check === false) {
            return false;
        }
        if ($check instanceof PDOStatement) {
            return $check->fetch(PDO::FETCH_ASSOC) === false;
        }
        return $check->fetch_assoc() === false;
    };

    if ($columnMissing('client_ip')) {
        $db->query("ALTER TABLE lab_access_tokens ADD COLUMN client_ip VARCHAR(64) NULL DEFAULT NULL AFTER expires_at");
    }
    if ($columnMissing('device_bind')) {
        $db->query("ALTER TABLE lab_access_tokens ADD COLUMN device_bind VARCHAR(128) NULL DEFAULT NULL AFTER client_ip");
    }
    if ($columnMissing('client_local_ip')) {
        $db->query("ALTER TABLE lab_access_tokens ADD COLUMN client_local_ip VARCHAR(64) NULL DEFAULT NULL AFTER device_bind");
    }
    if ($columnMissing('client_mac')) {
        $db->query("ALTER TABLE lab_access_tokens ADD COLUMN client_mac VARCHAR(32) NULL DEFAULT NULL AFTER client_local_ip");
    }
}

/**
 * $row: DB row with optional keys client_ip, device_bind, client_mac, client_local_ip
 * $req: keys ip, device_bind, mac_address (normalized or raw), client_local_ip
 *
 * Legacy rows (nothing meaningful stored in any bind field): accept any client.
 */
function hackme_lab_token_bind_row_matches(array $row, array $req): bool
{
    $sip = isset($row['client_ip']) ? trim((string) $row['client_ip']) : '';
    $sbd = isset($row['device_bind']) ? trim((string) $row['device_bind']) : '';
    $smc = isset($row['client_mac']) ? trim((string) $row['client_mac']) : '';
    $slc = isset($row['client_local_ip']) ? trim((string) $row['client_local_ip']) : '';

    if ($sip === '' && $sbd === '' && $smc === '' && $slc === '') {
        return true;
    }

    $rip = trim((string) ($req['ip'] ?? ''));
    $rbd = trim((string) ($req['device_bind'] ?? ''));
    $rmc = isset($req['mac_address']) && (string) $req['mac_address'] !== ''
        ? hackme_normalize_mac((string) $req['mac_address'])
        : '';
    $rlc = hackme_normalize_client_local_ip((string) ($req['client_local_ip'] ?? ''));

    if ($sip !== '' && strcasecmp($sip, $rip) !== 0) {
        return false;
    }
    if ($sbd !== '') {
        if ($rbd === '' || !hash_equals($sbd, $rbd)) {
            return false;
        }
    }
    if ($smc !== '') {
        if ($rmc === '' || strcasecmp($smc, $rmc) !== 0) {
            return false;
        }
    }
    if ($slc !== '') {
        if ($rlc === '' || strcasecmp($slc, $rlc) !== 0) {
            return false;
        }
    }
    return true;
}

/**
 * @deprecated Prefer hackme_lab_token_bind_row_matches; kept for a few call sites.
 */
function hackme_lab_token_bind_matches(
    ?string $storedIp,
    ?string $storedBind,
    string $reqIp,
    string $reqBind,
    ?string $storedMac = null,
    ?string $storedLocalIp = null,
    string $reqMac = '',
    string $reqLocalIp = ''
): bool {
    return hackme_lab_token_bind_row_matches(
        [
            'client_ip' => $storedIp,
            'device_bind' => $storedBind,
            'client_mac' => $storedMac,
            'client_local_ip' => $storedLocalIp,
        ],
        [
            'ip' => $reqIp,
            'device_bind' => $reqBind,
            'mac_address' => $reqMac,
            'client_local_ip' => $reqLocalIp,
        ]
    );
}
