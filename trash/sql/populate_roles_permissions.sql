-- ====================================================
-- Populate Roles, Permissions, and Role-Permissions
-- ====================================================
-- This script populates the role-based access control tables
-- Run this after creating the database schema

USE ctf_platform;

-- ====================================================
-- 1. Insert Roles
-- ====================================================
INSERT INTO roles (name, description) VALUES
('user', 'Regular user - can access labs and submit solutions'),
('instructor', 'Instructor - can create and manage labs, review submissions'),
('admin', 'Administrator - full system access including user management'),
('superadmin', 'Super Administrator - Owner with full control, can manage all permissions')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ====================================================
-- 2. Insert Permissions
-- ====================================================

-- User Permissions
INSERT INTO permissions (name, description) VALUES
('view_labs', 'View available labs'),
('access_lab', 'Access and start lab instances'),
('submit_solution', 'Submit solutions to challenges'),
('view_leaderboard', 'View leaderboard'),
('view_profile', 'View own profile'),
('edit_profile', 'Edit own profile'),
('comment', 'Post comments on challenges'),
('like_comment', 'Like comments'),
('request_role', 'Request role upgrade')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Instructor Permissions
INSERT INTO permissions (name, description) VALUES
('create_lab', 'Create new labs'),
('edit_lab', 'Edit existing labs'),
('delete_lab', 'Delete labs'),
('publish_lab', 'Publish/unpublish labs'),
('create_challenge', 'Create challenges within labs'),
('edit_challenge', 'Edit challenges'),
('delete_challenge', 'Delete challenges'),
('review_submission', 'Review and grade student submissions'),
('view_all_submissions', 'View all submissions'),
('manage_hints', 'Add/edit/delete hints'),
('view_lab_analytics', 'View lab performance analytics')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Admin Permissions
INSERT INTO permissions (name, description) VALUES
('manage_users', 'View, edit, and manage all users'),
('assign_roles', 'Assign roles to users'),
('approve_role_requests', 'Approve or reject role requests'),
('delete_users', 'Delete user accounts'),
('manage_system', 'System-wide configuration'),
('view_audit_logs', 'View system audit logs'),
('manage_blocks', 'Block/unblock users or IPs'),
('view_all_comments', 'View and moderate all comments'),
('delete_comments', 'Delete any comment'),
('export_data', 'Export system data')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- SuperAdmin Permissions (additional permissions for super admin)
INSERT INTO permissions (name, description) VALUES
('manage_permissions', 'Assign or remove any permission to/from any user'),
('manage_all_roles', 'Manage all roles and permissions in the system'),
('override_permissions', 'Override any permission check')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ====================================================
-- 3. Assign Permissions to Roles
-- ====================================================

-- Get role IDs
SET @role_user = (SELECT role_id FROM roles WHERE name = 'user' LIMIT 1);
SET @role_instructor = (SELECT role_id FROM roles WHERE name = 'instructor' LIMIT 1);
SET @role_admin = (SELECT role_id FROM roles WHERE name = 'admin' LIMIT 1);
SET @role_superadmin = (SELECT role_id FROM roles WHERE name = 'superadmin' LIMIT 1);

-- User Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT @role_user, permission_id FROM permissions WHERE name IN (
    'view_labs',
    'access_lab',
    'submit_solution',
    'view_leaderboard',
    'view_profile',
    'edit_profile',
    'comment',
    'like_comment',
    'request_role'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Instructor Permissions (includes all user permissions + instructor-specific)
INSERT INTO role_permissions (role_id, permission_id)
SELECT @role_instructor, permission_id FROM permissions WHERE name IN (
    'view_labs',
    'access_lab',
    'submit_solution',
    'view_leaderboard',
    'view_profile',
    'edit_profile',
    'comment',
    'like_comment',
    'create_lab',
    'edit_lab',
    'delete_lab',
    'publish_lab',
    'create_challenge',
    'edit_challenge',
    'delete_challenge',
    'review_submission',
    'view_all_submissions',
    'manage_hints',
    'view_lab_analytics'
)
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Admin Permissions (includes all permissions except superadmin-specific)
INSERT INTO role_permissions (role_id, permission_id)
SELECT @role_admin, permission_id FROM permissions
WHERE name NOT IN ('manage_permissions', 'manage_all_roles', 'override_permissions')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- SuperAdmin Permissions (includes ALL permissions - full control)
INSERT INTO role_permissions (role_id, permission_id)
SELECT @role_superadmin, permission_id FROM permissions
ON DUPLICATE KEY UPDATE role_id = role_id;

-- ====================================================
-- 4. Optional: Assign default 'user' role to existing users
-- ====================================================
-- Uncomment the following if you want to assign 'user' role to all existing users
/*
INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, @role_user
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.user_id
)
ON DUPLICATE KEY UPDATE user_id = user_id;
*/

-- ====================================================
-- Verification Queries
-- ====================================================
-- Run these to verify the data was inserted correctly

-- Check roles
SELECT * FROM roles;

-- Check permissions count
SELECT COUNT(*) as total_permissions FROM permissions;

-- Check role-permission assignments
SELECT 
    r.name as role_name,
    COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
GROUP BY r.role_id, r.name
ORDER BY r.role_id;

-- View all role-permission mappings
SELECT 
    r.name as role,
    p.name as permission,
    p.description
FROM roles r
JOIN role_permissions rp ON r.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.permission_id
ORDER BY r.name, p.name;

