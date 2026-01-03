# CYBER_OPS Platform – November 19, 2025 Updates

## Frontend
- Wired the navbar avatar/name block to open `ProfilePage`, keeping the control accessible on all breakpoints.
- Enhanced `ProfilePage` with axios-backed role requests, live status badges, admin/instructor gating, and a self-service reset password entry point.
- Extended `ResetPasswordPage` to reuse the same UI for token-based recovery and authenticated self-service resets, with axios calls to the new backend endpoint.
- Surfaced instructor/admin-only Edit/Remove controls on every lab card while preserving the existing gradient/glass UI.
- Introduced a data-driven `AdminDashboardPage` that consumes live role-request stats and lists pending approvals.
- Updated routing in `App.jsx` so Profile, Admin Dashboard, and Reset Password flows integrate with the existing auth state.

## Backend
- Added `server/api/request_role.php` for CRUD-style role requests plus admin summaries, delegating email delivery to the new `server/utils/mailer.php`.
- Added `server/api/reset_password.php` to hash passwords for both token and logged-in flows, reusing a shared `server/utils/db.php` connector.
- Centralized PHPMailer configuration inside `server/utils/mailer.php` so future transactional emails can reuse the same transport.

## Database
- Provided `server/sql/add_role_requests_table.sql`, defining a `role_requests` table (with uniqueness per user and FK enforcement) to persist pending/approved/rejected states.
- Reused the existing `password_resets` table for token verification; no schema change required there.

## Integration Notes
- All new API calls originate from `http://localhost/HackeMe/server/api/*` and use Axios for consistent error handling.
- Responsive layouts were verified on mobile, tablet, and desktop breakpoints for auth, profile, labs, and admin dashboards (Tailwind’s utility classes already covered most adjustments).

