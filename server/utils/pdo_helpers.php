<?php
declare(strict_types=1);

/**
 * Small helpers for migrating mysqli-style patterns to PDO.
 * PDO::rowCount() is unreliable for SELECT in MySQL; use fetchAll/first row checks.
 */
function hackme_pdo_first(PDO $pdo, string $sql, array $params = []): ?array
{
    $st = $params === [] ? $pdo->query($sql) : $pdo->prepare($sql);
    if ($st === false) {
        return null;
    }
    if ($params !== []) {
        if (!$st->execute($params)) {
            return null;
        }
    }
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return $row === false ? null : $row;
}

function hackme_pdo_all(PDO $pdo, string $sql, array $params = []): array
{
    $st = $params === [] ? $pdo->query($sql) : $pdo->prepare($sql);
    if ($st === false) {
        return [];
    }
    if ($params !== []) {
        if (!$st->execute($params)) {
            return [];
        }
    }
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    return is_array($rows) ? $rows : [];
}

function hackme_pdo_select_has_rows(PDO $pdo, string $sql): bool
{
    $st = $pdo->query($sql);
    if ($st === false) {
        return false;
    }
    return $st->fetch(PDO::FETCH_NUM) !== false;
}

function hackme_pdo_error(PDO $pdo): string
{
    $e = $pdo->errorInfo();
    return (string) ($e[2] ?? 'unknown');
}
