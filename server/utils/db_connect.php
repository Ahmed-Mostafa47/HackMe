<?php
declare(strict_types=1);

require_once __DIR__ . '/pdo_mysqli_shim.php';

// Aiven Cloud MySQL connection settings
$dbHost = 'mysql-2fba11c2-hackme-2bfc.k.aivencloud.com';
$dbUser = 'avnadmin';
$dbPass = 'AVNS_9bCdlZ5aiyIu2JCdzy2'; // use password for server aiven
$dbName = 'ctf_platform';
$dbPort = 14666;

ini_set('default_socket_timeout', '10');

$ca_cert = __DIR__ . '/certs/ca.pem';
$use_ssl = file_exists($ca_cert);

$baseOpts = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
    $dbHost,
    $dbPort,
    $dbName
);

function hackme_pdo_drain_multistatement(PDO $pdo, string $sql): bool
{
    $prev = null;
    try {
        $prev = $pdo->getAttribute(PDO::MYSQL_ATTR_MULTI_STATEMENTS);
        $pdo->setAttribute(PDO::MYSQL_ATTR_MULTI_STATEMENTS, true);
    } catch (Throwable) {
    }

    try {
        $stmt = $pdo->query($sql);
        if ($stmt === false) {
            return false;
        }
        do {
            if ($stmt->columnCount() > 0) {
                $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
        } while ($stmt->nextRowset());
    } catch (Throwable) {
        return false;
    } finally {
        try {
            if ($prev !== null) {
                $pdo->setAttribute(PDO::MYSQL_ATTR_MULTI_STATEMENTS, $prev);
            }
        } catch (Throwable) {
        }
    }

    return true;
}

try {
    if ($use_ssl) {
        $sslOpts = $baseOpts + [
            PDO::MYSQL_ATTR_SSL_CA => $ca_cert,
            PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => true,
        ];
        try {
            $pdo = new PDO($dsn, $dbUser, $dbPass, $sslOpts);
        } catch (PDOException) {
            $pdo = new PDO($dsn, $dbUser, $dbPass, $baseOpts);
        }
    } else {
        $pdo = new PDO($dsn, $dbUser, $dbPass, $baseOpts);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $e->getMessage(),
    ]);
    exit;
}

$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$conn = new PdoMysqliShim($pdo);
$conn->set_charset('utf8mb4');
