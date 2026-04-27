<?php
declare(strict_types=1);

// Start output buffering to prevent any warnings/errors from corrupting JSON response
ob_start();

// Suppress display of errors (we'll log them instead)
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL & ~E_WARNING & ~E_NOTICE);

// CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

// Respond to OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load DB Connection
require_once __DIR__ . '/../utils/db_connect.php';
require_once __DIR__ . '/../utils/permissions.php';
require_once __DIR__ . '/../utils/permissions.php';  

// Try to load mailer, but don't fail if it's not available
$GLOBALS['mailerLoaded'] = false;
if (file_exists(__DIR__ . '/../utils/mailer.php')) {
    try {
        require_once __DIR__ . '/../utils/mailer.php';
        $GLOBALS['mailerLoaded'] = function_exists('cyberops_send_admin_notification');
    } catch (Throwable $e) {
        error_log('Failed to load mailer: ' . $e->getMessage());
        $GLOBALS['mailerLoaded'] = false;
    }
}

// Validate connection
if (!isset($conn) || !$conn) {
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed'
    ]);
    exit;
}

$conn->set_charset('utf8mb4');


// Determine HTTP method
$method = $_SERVER['REQUEST_METHOD'];

try {

    if ($method === 'GET') {
        handle_get_request($conn);
    } elseif ($method === 'POST') {
        handle_post_request($conn);
    } elseif ($method === 'PUT') {
        handle_put_request($conn);
    } else {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Method Not Allowed'
        ]);
    }

} catch (Throwable $e) {
    // Clear any output that might have been generated
    ob_clean();
    http_response_code(500);
    error_log('Role Request API Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error' => $e->getFile() . ':' . $e->getLine(),
    ]);
    ob_end_flush();
    exit;
}



/**
 * -----------------------------
 *     GET Request Handler
 * -----------------------------
 */
function handle_get_request(PdoMysqliShim $conn)
{
    $all = isset($_GET['all']) && $_GET['all'] == '1';
    $status_filter = isset($_GET['status']) ? $_GET['status'] : null;
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
    
    $query = "
        SELECT 
            rr.id as request_id,
            rr.user_id,
            rr.requested_role,
            rr.comment,
            rr.status,
            rr.created_at,
            rr.updated_at,
            u.username, 
            u.email,
            u.full_name,
            u.profile_meta,
            u.created_at as user_created_at
        FROM role_requests rr 
        JOIN users u ON u.user_id = rr.user_id
    ";
    
    $conditions = [];
    $bindTypes = '';
    $bindValues = [];

    if ($user_id) {
        $conditions[] = "rr.user_id = ?";
        $bindTypes .= 'i';
        $bindValues[] = $user_id;
    }

    if ($status_filter) {
        $conditions[] = "rr.status = ?";
        $bindTypes .= 's';
        $bindValues[] = $status_filter;
    } elseif (!$all && !$user_id) {
        // Default: show only pending requests when not filtering by user_id
        $conditions[] = "(rr.status = 'pending' OR rr.status IS NULL)";
    }
    
    if (!empty($conditions)) {
        $query .= " WHERE " . implode(" AND ", $conditions);
    }
    
    $query .= " ORDER BY rr.created_at DESC";
    
    $stmt = $conn->prepare($query);

    if (!$stmt) {
        throw new Exception('Failed to prepare statement: ' . $conn->error);
    }

    if (!empty($bindValues)) {
        $bindParams = [];
        $bindParams[] = $bindTypes;
        foreach ($bindValues as $key => $value) {
            $bindParams[] = &$bindValues[$key];
        }
        call_user_func_array([$stmt, 'bind_param'], $bindParams);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $requests = [];
    while ($row = $result->fetch_assoc()) {
        // Parse profile_meta if it's JSON
        if (isset($row['profile_meta']) && is_string($row['profile_meta'])) {
            $row['profile_meta'] = json_decode($row['profile_meta'], true);
        }
        $requests[] = $row;
    }
    
    $stmt->close();

    $response = [
        'success' => true,
        'requests' => $requests,
    ];

    if ($user_id && !$all) {
        $response['request'] = $requests[0] ?? null;
    } else {
        $stats_result = $conn->query("
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM labs) as total_labs,
                (SELECT COUNT(*) FROM role_requests WHERE status = 'pending' OR status IS NULL) as pending_role_requests
        ");
        $response['stats'] = $stats_result->fetch_assoc();
    }

    ob_clean();
    echo json_encode($response);
    ob_end_flush();
}



/**
 * -----------------------------
 *     POST Request Handler
 *     (User sends role request)
 * -----------------------------
 */
function handle_post_request(PdoMysqliShim $conn)
{
    // Log the incoming request
    error_log('Role request POST received');
    error_log('Request method: ' . $_SERVER['REQUEST_METHOD']);
    error_log('Content-Type: ' . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));
    
    // Check if role_requests table exists
    $tableCheck = $conn->query("SHOW TABLES LIKE 'role_requests'");
    if ($tableCheck->num_rows === 0) {
        error_log('role_requests table does not exist');
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Database table not found. Please run the SQL schema file to create the role_requests table.'
        ]);
        return;
    }
    $tableCheck->close();

    $rawInput = file_get_contents('php://input');
    error_log('Raw input: ' . $rawInput);
    
    $data = json_decode($rawInput, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log('JSON decode error: ' . json_last_error_msg());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid JSON: ' . json_last_error_msg()
        ]);
        return;
    }
    
    error_log('Decoded data: ' . print_r($data, true));

    if (!isset($data['user_id']) || !isset($data['requested_role'])) {
        error_log('Missing fields - user_id: ' . (isset($data['user_id']) ? $data['user_id'] : 'not set') . ', requested_role: ' . (isset($data['requested_role']) ? $data['requested_role'] : 'not set'));
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'message' => 'Missing required fields: user_id and requested_role',
            'received_data' => $data
        ]);
        return;
    }

    $user_id = $data['user_id'];
    $requested_role = $data['requested_role'];
    $comment = $data['comment'] ?? '';

    // Get user information
    $user_stmt = $conn->prepare("SELECT username, email, full_name FROM users WHERE user_id = ?");
    $user_stmt->bind_param('i', $user_id);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();
    
    if ($user_result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        return;
    }
    
    $user = $user_result->fetch_assoc();
    $user_stmt->close();

    // Remove previous pending requests for this user
    $cleanup_stmt = $conn->prepare("
        DELETE FROM role_requests 
        WHERE user_id = ? AND (status = 'pending' OR status IS NULL)
    ");
    if ($cleanup_stmt) {
        $cleanup_stmt->bind_param('i', $user_id);
        $cleanup_stmt->execute();
        $cleanup_stmt->close();
    }

    // Insert role request
    // Try with comment first, fallback to without comment if column doesn't exist
    $error_msg = '';
    $insert_success = false;

    $attemptInsert = function (string $sql, string $types, array $values) use ($conn, &$error_msg) {
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            $error_msg = $conn->error;
            return false;
        }
        if (!$stmt->bind_param($types, ...$values)) {
            $error_msg = $stmt->error;
            $stmt->close();
            return false;
        }
        $exec = $stmt->execute();
        if (!$exec) {
            $error_msg = $stmt->error;
        }
        $stmt->close();
        return $exec;
    };

    $insert_success = $attemptInsert(
        "
            INSERT INTO role_requests (user_id, requested_role, comment) 
            VALUES (?, ?, ?)
        ",
        'iss',
        [$user_id, $requested_role, $comment]
    );

    if (!$insert_success) {
        $insert_success = $attemptInsert(
            "
                INSERT INTO role_requests (user_id, requested_role) 
                VALUES (?, ?)
            ",
            'is',
            [$user_id, $requested_role]
        );
    }
    
    if (!$insert_success) {
        error_log('Role request insert failed: ' . $error_msg);
        http_response_code(500);
        echo json_encode([
            'success' => false, 
            'message' => 'Failed to submit request: ' . $error_msg,
            'debug' => $conn->error
        ]);
        return;
    }
    
    $request_id = $conn->insert_id;

    // Send email notification to admin (if mailer is available)
    $mailerLoaded = $GLOBALS['mailerLoaded'] ?? false;
    if ($mailerLoaded && function_exists('cyberops_send_admin_notification')) {
        $subject = "New Role Request - " . strtoupper($requested_role);
        $body = "A new role request has been submitted:\n\n";
        $body .= "User: " . $user['username'] . " (" . $user['email'] . ")\n";
        $body .= "Full Name: " . ($user['full_name'] ?? 'N/A') . "\n";
        $body .= "Requested Role: " . strtoupper($requested_role) . "\n";
        $body .= "Request ID: #" . $request_id . "\n";
        if (!empty($comment)) {
            $body .= "Comment: " . $comment . "\n";
        }
        $body .= "\nPlease review and approve/reject this request in the Admin Dashboard.";

        $email_sent = cyberops_send_admin_notification($subject, $body);
        
        if (!$email_sent) {
            error_log("Failed to send role request notification email for request ID: " . $request_id);
        }
    } else {
        error_log("Mailer not available - skipping email notification for role request ID: " . $request_id);
    }

    // Clean any output that might have been generated (warnings, etc.)
    ob_clean();
    echo json_encode([
        'success' => true, 
        'message' => 'Role request submitted',
        'request' => [
            'id' => $request_id,
            'status' => 'pending'
        ]
    ]);
    ob_end_flush();
}



/**
 * -----------------------------
 *     PUT Request Handler
 *     (Admin approves / rejects)
 * -----------------------------
 */
function handle_put_request(PdoMysqliShim $conn)
{
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['request_id']) || !isset($data['status'])) {
        echo json_encode(['success' => false, 'message' => 'Missing fields']);
        return;
    }

    $request_id = $data['request_id'];
    $status = $data['status'];  // approved | rejected

    // Get request details first
    $req_stmt = $conn->prepare("SELECT user_id, requested_role FROM role_requests WHERE id = ?");
    $req_stmt->bind_param('i', $request_id);
    $req_stmt->execute();
    $req_result = $req_stmt->get_result();
    
    if ($req_result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Request not found']);
        $req_stmt->close();
        return;
    }
    
    $request = $req_result->fetch_assoc();
    $req_stmt->close();

    if ($status === 'approved') {
        // Get the requested role
        $requested_role = strtolower(trim($request['requested_role']));
        $userId = (int)$request['user_id'];
        
        // Remove all existing roles first (single role system)
        $existingRoles = getUserRoles($conn, $userId);
        foreach ($existingRoles as $existingRole) {
            removeRole($conn, $userId, $existingRole);
        }
        
        // Assign new role using the new role-based system
        $roleAssigned = assignRole($conn, $userId, $requested_role, null);
        
        if (!$roleAssigned) {
            ob_clean();
            echo json_encode(['success' => false, 'message' => 'Failed to assign role. Role may not exist.']);
            ob_end_flush();
            return;
        }
        
        // Also update profile_meta for backward compatibility
        $requested_role_upper = strtoupper($requested_role);
        $update_stmt = $conn->prepare("
            UPDATE users 
            SET profile_meta = JSON_SET(
                COALESCE(profile_meta, '{}'),
                '$.rank', ?
            )
            WHERE user_id = ?
        ");
        if ($update_stmt) {
            $update_stmt->bind_param('si', $requested_role_upper, $userId);
            $update_stmt->execute();
            $update_stmt->close();
        }

        // Update request status
        $update_status_stmt = $conn->prepare("UPDATE role_requests SET status = 'approved', updated_at = NOW() WHERE id = ?");
        if ($update_status_stmt) {
            $update_status_stmt->bind_param('i', $request_id);
            $update_status_stmt->execute();
            $update_status_stmt->close();
        }

        ob_clean();
        echo json_encode(['success' => true, 'message' => 'Request approved and role assigned']);
        ob_end_flush();

    } elseif ($status === 'rejected') {
        $reject_stmt = $conn->prepare("UPDATE role_requests SET status = 'rejected', updated_at = NOW() WHERE id = ?");
        if ($reject_stmt) {
            $reject_stmt->bind_param('i', $request_id);
            $reject_stmt->execute();
            $reject_stmt->close();
        }

        ob_clean();
        echo json_encode(['success' => true, 'message' => 'Request rejected']);
        ob_end_flush();

    } else {
        ob_clean();
        echo json_encode(['success' => false, 'message' => 'Invalid status']);
        ob_end_flush();
    }
}

