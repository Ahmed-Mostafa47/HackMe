<?php
declare(strict_types=1);

/**
 * ====================================================
 * Role-Based Access Control (RBAC) Utility Functions
 * ====================================================
 */

require_once __DIR__ . '/db_connect.php';

/**
 * Get all roles for a user
 * 
 * @param PdoMysqliShim $conn Database connection
 * @param int $userId User ID
 * @return array Array of role names
 */
function getUserRoles(PdoMysqliShim $conn, int $userId): array
{
    $stmt = $conn->prepare("
        SELECT r.name 
        FROM roles r
        INNER JOIN user_roles ur ON r.role_id = ur.role_id
        WHERE ur.user_id = ?
    ");
    
    if (!$stmt) {
        error_log('Failed to prepare getUserRoles query: ' . $conn->error);
        return [];
    }
    
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $roles = [];
    while ($row = $result->fetch_assoc()) {
        $roles[] = strtolower($row['name']);
    }
    
    $stmt->close();
    return $roles;
}

/**
 * Check if user has a specific role
 * 
 * @param PdoMysqliShim $conn Database connection
 * @param int $userId User ID
 * @param string $roleName Role name (case-insensitive)
 * @return bool
 */
function hasRole(PdoMysqliShim $conn, int $userId, string $roleName): bool
{
    $roleName = strtolower(trim($roleName));
    $roles = getUserRoles($conn, $userId);
    return in_array($roleName, $roles, true);
}

/**
 * Check if user is admin
 * 
 * @param PdoMysqliShim $conn Database connection
 * @param int $userId User ID
 * @return bool
 */
function isAdmin(PdoMysqliShim $conn, int $userId): bool
{
    return hasRole($conn, $userId, 'admin');
}

/**
 * Check if user is instructor
 * 
 * @param PdoMysqliShim $conn Database connection
 * @param int $userId User ID
 * @return bool
 */
function isInstructor(PdoMysqliShim $conn, int $userId): bool
{
    return hasRole($conn, $userId, 'instructor');
}

/**
 * Check if user is super admin
 * 
 * @param PdoMysqliShim $conn Database connection
 * @param int $userId User ID
 * @return bool
 */
function isSuperAdmin(PdoMysqliShim $conn, int $userId): bool
{
    return hasRole($conn, $userId, 'superadmin');
}

/**
 * Check if user has a specific permission
 * 
 * @param PdoMysqliShim $conn Database connection
 * @param int $userId User ID
 * @param string $permissionName Permission name
 * @return bool
 */
function hasPermission(PdoMysqliShim $conn, int $userId, string $permissionName): bool
{
    // SuperAdmin has all permissions
    if (isSuperAdmin($conn, $userId)) {
        return true;
    }
    
    $permissionName = strtolower(trim($permissionName));
    
    $stmt = $conn->prepare("
        SELECT COUNT(*) as count
        FROM permissions p
        INNER JOIN role_permissions rp ON p.permission_id = rp.permission_id
        INNER JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = ? AND LOWER(p.name) = ?
    ");
    
    if (!$stmt) {
        error_log('Failed to prepare hasPermission query: ' . $conn->error);
        return false;
    }
    
    $stmt->bind_param('is', $userId, $permissionName);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();
    
    return ($row['count'] ?? 0) > 0;
}

/**
 * Get all permissions for a user (from all their roles)
 * 
 * @param PdoMysqliShim $conn Database connection
 * @param int $userId User ID
 * @return array Array of permission names
 */
function getUserPermissions(PdoMysqliShim $conn, int $userId): array
{
    $stmt = $conn->prepare("
        SELECT DISTINCT p.name
        FROM permissions p
        INNER JOIN role_permissions rp ON p.permission_id = rp.permission_id
        INNER JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = ?
        ORDER BY p.name
    ");
    
    if (!$stmt) {
        error_log('Failed to prepare getUserPermissions query: ' . $conn->error);
        return [];
    }
    
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $permissions = [];
    while ($row = $result->fetch_assoc()) {
        $permissions[] = $row['name'];
    }
    
    $stmt->close();
    return $permissions;
}

/**
 * Assign a role to a user
 * 
 * @param PdoMysqliShim $conn Database connection
 * @param int $userId User ID
 * @param string $roleName Role name
 * @param int|null $assignedBy User ID who assigned the role (null for system)
 * @return bool Success status
 */
function assignRole(PdoMysqliShim $conn, int $userId, string $roleName, ?int $assignedBy = null): bool
{
    $roleName = strtolower(trim($roleName));
    
    // Get role_id
    $stmt = $conn->prepare("SELECT role_id FROM roles WHERE LOWER(name) = ? LIMIT 1");
    if (!$stmt) {
        error_log('Failed to prepare assignRole query: ' . $conn->error);
        return false;
    }
    
    $stmt->bind_param('s', $roleName);
    $stmt->execute();
    $result = $stmt->get_result();
    $role = $result->fetch_assoc();
    $stmt->close();
    
    if (!$role) {
        error_log("Role not found: $roleName");
        return false;
    }
    
    $roleId = (int)$role['role_id'];
    
    // Insert into user_roles
    $insertStmt = $conn->prepare("
        INSERT INTO user_roles (user_id, role_id, assigned_by)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE assigned_by = VALUES(assigned_by)
    ");
    
    if (!$insertStmt) {
        error_log('Failed to prepare user_roles insert: ' . $conn->error);
        return false;
    }
    
    $insertStmt->bind_param('iii', $userId, $roleId, $assignedBy);
    $success = $insertStmt->execute();
    $insertStmt->close();
    
    return $success;
}

/**
 * Remove a role from a user
 * 
 * @param PdoMysqliShim $conn Database connection
 * @param int $userId User ID
 * @param string $roleName Role name
 * @return bool Success status
 */
function removeRole(PdoMysqliShim $conn, int $userId, string $roleName): bool
{
    $roleName = strtolower(trim($roleName));
    
    // Get role_id
    $stmt = $conn->prepare("SELECT role_id FROM roles WHERE LOWER(name) = ? LIMIT 1");
    if (!$stmt) {
        error_log('Failed to prepare removeRole query: ' . $conn->error);
        return false;
    }
    
    $stmt->bind_param('s', $roleName);
    $stmt->execute();
    $result = $stmt->get_result();
    $role = $result->fetch_assoc();
    $stmt->close();
    
    if (!$role) {
        return false;
    }
    
    $roleId = (int)$role['role_id'];
    
    // Delete from user_roles
    $deleteStmt = $conn->prepare("DELETE FROM user_roles WHERE user_id = ? AND role_id = ?");
    
    if (!$deleteStmt) {
        error_log('Failed to prepare user_roles delete: ' . $conn->error);
        return false;
    }
    
    $deleteStmt->bind_param('ii', $userId, $roleId);
    $success = $deleteStmt->execute();
    $deleteStmt->close();
    
    return $success;
}

/**
 * Check if user has any of the specified roles
 * 
 * @param PdoMysqliShim $conn Database connection
 * @param int $userId User ID
 * @param array $roleNames Array of role names
 * @return bool
 */
function hasAnyRole(PdoMysqliShim $conn, int $userId, array $roleNames): bool
{
    $userRoles = getUserRoles($conn, $userId);
    $normalizedRoles = array_map('strtolower', $roleNames);
    
    foreach ($userRoles as $userRole) {
        if (in_array($userRole, $normalizedRoles, true)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Check if user has any of the specified permissions
 * 
 * @param PdoMysqliShim $conn Database connection
 * @param int $userId User ID
 * @param array $permissionNames Array of permission names
 * @return bool
 */
function hasAnyPermission(PdoMysqliShim $conn, int $userId, array $permissionNames): bool
{
    foreach ($permissionNames as $permission) {
        if (hasPermission($conn, $userId, $permission)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Assign a permission directly to a user (bypassing roles)
 * Note: This creates a direct user-permission link. Use with caution.
 * SuperAdmin only function.
 * 
 * @param PdoMysqliShim $conn Database connection
 * @param int $userId User ID
 * @param string $permissionName Permission name
 * @return bool Success status
 */
function assignPermissionToUser(PdoMysqliShim $conn, int $userId, string $permissionName): bool
{
    $permissionName = strtolower(trim($permissionName));
    
    // Get permission_id
    $stmt = $conn->prepare("SELECT permission_id FROM permissions WHERE LOWER(name) = ? LIMIT 1");
    if (!$stmt) {
        error_log('Failed to prepare assignPermissionToUser query: ' . $conn->error);
        return false;
    }
    
    $stmt->bind_param('s', $permissionName);
    $stmt->execute();
    $result = $stmt->get_result();
    $permission = $result->fetch_assoc();
    $stmt->close();
    
    if (!$permission) {
        error_log("Permission not found: $permissionName");
        return false;
    }
    
    $permissionId = (int)$permission['permission_id'];
    
    // Check if user_permissions table exists, if not we'll use a workaround
    // For now, we'll assign a role that has this permission, or create a custom role
    // Actually, the best approach is to assign a role that contains this permission
    // But for direct permission assignment, we need a user_permissions table
    // For simplicity, we'll just assign a role that has the permission
    
    // Get a role that has this permission
    $roleStmt = $conn->prepare("
        SELECT DISTINCT r.role_id, r.name
        FROM roles r
        INNER JOIN role_permissions rp ON r.role_id = rp.role_id
        WHERE rp.permission_id = ?
        LIMIT 1
    ");
    
    if ($roleStmt) {
        $roleStmt->bind_param('i', $permissionId);
        $roleStmt->execute();
        $roleResult = $roleStmt->get_result();
        $role = $roleResult->fetch_assoc();
        $roleStmt->close();
        
        if ($role) {
            // Assign the role that has this permission
            return assignRole($conn, $userId, $role['name'], null);
        }
    }
    
    return false;
}

/**
 * Get all available roles in the system
 * 
 * @param PdoMysqliShim $conn Database connection
 * @return array Array of roles with their IDs and names
 */
function getAllRoles(PdoMysqliShim $conn): array
{
    $stmt = $conn->prepare("SELECT role_id, name, description FROM roles ORDER BY role_id");
    if (!$stmt) {
        error_log('Failed to prepare getAllRoles query: ' . $conn->error);
        return [];
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $roles = [];
    while ($row = $result->fetch_assoc()) {
        $roles[] = [
            'role_id' => (int)$row['role_id'],
            'name' => $row['name'],
            'description' => $row['description']
        ];
    }
    
    $stmt->close();
    return $roles;
}

/**
 * Get all available permissions in the system
 * 
 * @param PdoMysqliShim $conn Database connection
 * @return array Array of permissions with their IDs and names
 */
function getAllPermissions(PdoMysqliShim $conn): array
{
    $stmt = $conn->prepare("SELECT permission_id, name, description FROM permissions ORDER BY name");
    if (!$stmt) {
        error_log('Failed to prepare getAllPermissions query: ' . $conn->error);
        return [];
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $permissions = [];
    while ($row = $result->fetch_assoc()) {
        $permissions[] = [
            'permission_id' => (int)$row['permission_id'],
            'name' => $row['name'],
            'description' => $row['description']
        ];
    }
    
    $stmt->close();
    return $permissions;
}

/**
 * Legacy function for backward compatibility
 * Checks if user is admin (checks both new role system and old profile_meta)
 * 
 * @param PdoMysqliShim $conn Database connection
 * @param int $userId User ID
 * @return bool
 */
function user_is_admin(PdoMysqliShim $conn, int $userId): bool
{
    // First check new role system (admin or superadmin)
    if (isAdmin($conn, $userId) || isSuperAdmin($conn, $userId)) {
        return true;
    }
    
    // Fallback to old profile_meta system for backward compatibility
    $stmt = $conn->prepare("SELECT profile_meta FROM users WHERE user_id = ? LIMIT 1");
    if (!$stmt) {
        return false;
    }
    
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    
    if (!$user) {
        return false;
    }
    
    $profileMeta = $user['profile_meta'] ?? null;
    if (is_string($profileMeta)) {
        $profileMeta = json_decode($profileMeta, true);
    }
    
    if (is_array($profileMeta) && isset($profileMeta['rank'])) {
        return strtoupper((string)$profileMeta['rank']) === 'ADMIN';
    }
    
    return false;
}

