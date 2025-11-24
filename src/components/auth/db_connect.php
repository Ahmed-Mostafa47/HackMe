<?php
declare(strict_types=1);

// Aiven Cloud MySQL connection settings
$dbHost = 'mysql-2fba11c2-hackme-2bfc.k.aivencloud.com';
$dbUser = 'avnadmin';
$dbPass = ''; // use password for server aiven
$dbName = 'defaultdb';
$dbPort = 14666;

// Set connection timeout
ini_set('default_socket_timeout', '10');

// Try connection with SSL if certificate exists, otherwise without SSL
$ca_cert = __DIR__ . '/certs/ca.pem';
$use_ssl = file_exists($ca_cert);

if ($use_ssl) {
    // Try with SSL
    $conn = mysqli_init();
    mysqli_ssl_set($conn, NULL, NULL, $ca_cert, NULL, NULL);
    $conn_success = mysqli_real_connect(
        $conn,
        $dbHost,
        $dbUser,
        $dbPass,
        $dbName,
        $dbPort,
        NULL, // socket (null for default)
        MYSQLI_CLIENT_SSL // flags
    );
    
    if (!$conn_success) {
        // If SSL fails, try without SSL
        $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName, $dbPort);
    }
} else {
    // Connect without SSL
    $conn = new mysqli($dbHost, $dbUser, $dbPass, $dbName, $dbPort);
}

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $conn->connect_error,
    ]);
    exit;
}

$conn->set_charset('utf8mb4');

?>
