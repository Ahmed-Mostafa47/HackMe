<?php
/**
 * Migration script to update all users with rank RECRUIT to USER
 * 
 * This script updates the profile_meta JSON field for all users
 * who currently have rank 'RECRUIT' to 'USER'
 * 
 * Usage: Run this script once via browser or command line:
 * php update_recruit_to_user.php
 */

require_once __DIR__ . '/../utils/db_connect.php';

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

if (!isset($conn) || !$conn) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

try {
    // Get all users with rank RECRUIT
    $selectStmt = $conn->prepare("
        SELECT user_id, profile_meta 
        FROM users 
        WHERE JSON_EXTRACT(profile_meta, '$.rank') = 'RECRUIT' 
           OR JSON_EXTRACT(profile_meta, '$.rank') = 'recruit'
    ");
    
    if (!$selectStmt) {
        throw new Exception('Failed to prepare select query: ' . $conn->error);
    }
    
    $selectStmt->execute();
    $result = $selectStmt->get_result();
    $usersToUpdate = [];
    
    while ($row = $result->fetch_assoc()) {
        $usersToUpdate[] = $row;
    }
    $selectStmt->close();
    
    $updatedCount = 0;
    
    // Update each user
    foreach ($usersToUpdate as $user) {
        $userId = (int)$user['user_id'];
        $profileMeta = $user['profile_meta'];
        
        // Parse existing profile_meta
        if (is_string($profileMeta)) {
            $profileMeta = json_decode($profileMeta, true);
        }
        
        if (!is_array($profileMeta)) {
            $profileMeta = [];
        }
        
        // Update rank to USER
        $profileMeta['rank'] = 'USER';
        $updatedProfileMeta = json_encode($profileMeta);
        
        // Update in database
        $updateStmt = $conn->prepare("
            UPDATE users 
            SET profile_meta = ? 
            WHERE user_id = ?
        ");
        
        if (!$updateStmt) {
            error_log("Failed to prepare update query for user_id $userId: " . $conn->error);
            continue;
        }
        
        $updateStmt->bind_param('si', $updatedProfileMeta, $userId);
        
        if ($updateStmt->execute()) {
            $updatedCount++;
        } else {
            error_log("Failed to update user_id $userId: " . $updateStmt->error);
        }
        
        $updateStmt->close();
    }
    
    echo json_encode([
        'success' => true,
        'message' => "Migration completed successfully. Updated $updatedCount user(s) from RECRUIT to USER.",
        'updated_count' => $updatedCount,
        'total_found' => count($usersToUpdate)
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Migration failed: ' . $e->getMessage()
    ]);
}
$conn->close();
?>



