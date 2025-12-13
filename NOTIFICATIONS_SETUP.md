# Real-Time Notifications System - Setup Guide

Complete guide for setting up and using the real-time notifications system.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Database Setup](#database-setup)
3. [Node.js Server Setup](#nodejs-server-setup)
4. [PHP Backend Configuration](#php-backend-configuration)
5. [Frontend Setup](#frontend-setup)
6. [Testing](#testing)
7. [Security Notes](#security-notes)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The notification system provides real-time notifications for:
- **Likes** - When someone likes your comment
- **Comments** - When someone comments on your post
- **Replies** - When someone replies to your comment
- **Messages** - Direct messages (future feature)
- **Updates** - System updates and announcements
- **Role Requests** - Role request status changes

### Architecture

```
Frontend (React) 
    ↕ WebSocket (Socket.io)
Node.js Server (Port 3001)
    ↕ HTTP POST
PHP Backend (Port 80)
    ↕ MySQL
Database (MySQL)
```

---

## 🗄️ Database Setup

### Step 1: Create the Notifications Table

Run the SQL migration file:

```bash
mysql -u your_username -p ctf_platform < server/sql/create_notifications_table.sql
```

Or manually execute the SQL in `server/sql/create_notifications_table.sql`:

```sql
USE ctf_platform;

CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    from_user_id INT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(500) NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_user_read (user_id, is_read),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (from_user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Step 2: Verify Table Creation

```sql
DESCRIBE notifications;
SELECT COUNT(*) FROM notifications;
```

---

## 🚀 Node.js Server Setup

### Step 1: Install Dependencies

```bash
cd notification-server
npm install
```

This installs:
- `express` - HTTP server
- `socket.io` - WebSocket server
- `cors` - CORS middleware

### Step 2: Configure Environment (Optional)

Create `notification-server/.env`:

```env
PORT=3001
NOTIFICATION_SECRET=your-secret-token-change-this-in-production
```

Or set environment variables directly:

**Windows (PowerShell):**
```powershell
$env:PORT=3001
$env:NOTIFICATION_SECRET="your-secret-token-change-this-in-production"
```

**Linux/Mac:**
```bash
export PORT=3001
export NOTIFICATION_SECRET="your-secret-token-change-this-in-production"
```

### Step 3: Update Secret Token

**IMPORTANT:** Change the secret token in:
1. `notification-server/server.js` (line ~18)
2. `server/utils/notification_helper.php` (line ~58)
3. `server/api/notify.php` (line ~18)

Use a strong, random token in production!

### Step 4: Start the Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

**Using PM2 (recommended for production):**
```bash
npm install -g pm2
pm2 start server.js --name notification-server
pm2 save
pm2 startup
```

### Step 5: Verify Server is Running

Open: `http://localhost:3001/health`

You should see:
```json
{
  "success": true,
  "status": "running",
  "connected_users": 0,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

## 🔧 PHP Backend Configuration

### Step 1: Verify Files

Ensure these files exist:
- ✅ `server/api/notify.php`
- ✅ `server/api/getNotifications.php`
- ✅ `server/api/markAsRead.php`
- ✅ `server/utils/notification_helper.php`

### Step 2: Update Secret Token

Edit `server/utils/notification_helper.php` (line ~58):

```php
$secretToken = 'your-secret-token-change-this-in-production';
```

**Must match** the token in `notification-server/server.js`!

### Step 3: Update Node.js Server URL (if needed)

If your Node.js server runs on a different host/port, update:

**In `server/utils/notification_helper.php`:**
```php
$nodeServerUrl = 'http://localhost:3001/push';
```

**In `server/api/notify.php`:**
```php
$NODE_SERVER_URL = 'http://localhost:3001/push';
```

### Step 4: Test PHP Endpoints

**Test notification creation:**
```bash
curl -X POST http://localhost/HackeMe/server/api/notify.php \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "from_user_id": 2,
    "type": "like",
    "title": "New Like",
    "message": "Someone liked your comment",
    "link": "/comments"
  }'
```

**Test getting notifications:**
```bash
curl "http://localhost/HackeMe/server/api/getNotifications.php?user_id=1"
```

---

## 💻 Frontend Setup

### Step 1: Install Dependencies

```bash
npm install
```

This installs `socket.io-client` (already added to `package.json`).

### Step 2: Verify Integration

The following components are already integrated:

- ✅ `src/services/notificationService.js` - Socket.io service
- ✅ `src/hooks/useNotifications.js` - React hook
- ✅ `src/components/notifications/NotificationToast.jsx` - Toast component
- ✅ `src/components/notifications/NotificationContainer.jsx` - Container
- ✅ `src/features/notifications/NotificationsPage.jsx` - Full page
- ✅ `src/App.jsx` - Integrated NotificationContainer
- ✅ `src/features/layout/Navbar.jsx` - Notification badge

### Step 3: Update Socket URL (if needed)

If your Node.js server runs on a different host/port, update:

**In `src/services/notificationService.js` (line ~8):**
```javascript
const SOCKET_URL = 'http://localhost:3001';
```

### Step 4: Start Frontend

```bash
npm run dev
```

---

## 🧪 Testing

### Test 1: Database Connection

1. Create a test notification via SQL:
```sql
INSERT INTO notifications (user_id, from_user_id, type, title, message, link)
VALUES (1, 2, 'like', 'Test Notification', 'This is a test', '/comments');
```

2. Check it exists:
```sql
SELECT * FROM notifications WHERE user_id = 1;
```

### Test 2: PHP API

**Create notification:**
```bash
curl -X POST http://localhost/HackeMe/server/api/notify.php \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "from_user_id": 2,
    "type": "test",
    "title": "Test",
    "message": "Testing notifications"
  }'
```

**Get notifications:**
```bash
curl "http://localhost/HackeMe/server/api/getNotifications.php?user_id=1"
```

### Test 3: Node.js Server

1. Start the server: `cd notification-server && npm start`
2. Check health: `curl http://localhost:3001/health`
3. Test push endpoint:
```bash
curl -X POST http://localhost:3001/push \
  -H "Content-Type: application/json" \
  -H "X-Secret-Token: your-secret-token-change-this-in-production" \
  -d '{
    "notification_id": 1,
    "user_id": 1,
    "from_user_id": 2,
    "type": "test",
    "title": "Test",
    "message": "Testing",
    "created_at": "2024-01-01T12:00:00Z",
    "secret": "your-secret-token-change-this-in-production"
  }'
```

### Test 4: Real-Time Notifications

1. **Open two browser windows:**
   - Window 1: Login as User A (ID: 1)
   - Window 2: Login as User B (ID: 2)

2. **In Window 2 (User B):**
   - Go to Comments page
   - Like a comment by User A
   - OR reply to a comment by User A

3. **In Window 1 (User A):**
   - You should see a toast notification appear
   - The notification badge in the navbar should update

4. **Click the notification:**
   - Toast should navigate to the link
   - Notification should be marked as read

### Test 5: Notifications Page

1. Navigate to `/notifications` (click bell icon in navbar)
2. You should see all notifications
3. Click "Mark All Read" - all should be marked as read
4. Badge count should update to 0

---

## 🔒 Security Notes

### 1. Secret Token

**CRITICAL:** Change the default secret token in production!

- `notification-server/server.js`
- `server/utils/notification_helper.php`
- `server/api/notify.php`

Use a strong, random token:
```bash
# Generate a secure token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. User Validation

The PHP endpoints validate:
- ✅ User ID exists in database
- ✅ User can only see their own notifications
- ✅ Input sanitization (XSS prevention)
- ✅ SQL injection prevention (prepared statements)

### 3. CORS

Currently set to `*` for development. In production, restrict to your domain:

**In PHP files:**
```php
header("Access-Control-Allow-Origin: https://yourdomain.com");
```

**In Node.js server:**
```javascript
cors: {
    origin: "https://yourdomain.com",
    credentials: true
}
```

### 4. Rate Limiting

Consider adding rate limiting to prevent abuse:
- PHP: Use `APCu` or Redis for rate limiting
- Node.js: Use `express-rate-limit`

---

## 🐛 Troubleshooting

### Issue: Notifications not appearing in real-time

**Check:**
1. Node.js server is running: `curl http://localhost:3001/health`
2. Browser console for Socket.io connection errors
3. Network tab for WebSocket connection (should see `ws://localhost:3001`)
4. Secret token matches in PHP and Node.js

**Solution:**
- Restart Node.js server
- Check browser console for errors
- Verify Socket.io client is installed: `npm list socket.io-client`

### Issue: "Failed to connect to notification server"

**Check:**
1. Node.js server is running on port 3001
2. No firewall blocking port 3001
3. Socket URL in `notificationService.js` is correct

**Solution:**
- Start Node.js server: `cd notification-server && npm start`
- Check port: `netstat -an | findstr 3001` (Windows) or `lsof -i :3001` (Linux/Mac)

### Issue: Notifications saved but not delivered

**Check:**
1. PHP can reach Node.js server: `curl http://localhost:3001/health`
2. Secret token matches
3. PHP error logs for curl errors

**Solution:**
- Test PHP → Node.js connection manually
- Check `php.ini` has `allow_url_fopen = On`
- Verify curl extension is enabled: `php -m | grep curl`

### Issue: Badge count not updating

**Check:**
1. `useNotifications` hook is being called with correct user ID
2. Browser console for JavaScript errors
3. Network tab for API calls to `getNotifications.php`

**Solution:**
- Verify user ID is passed correctly
- Check React DevTools for hook state
- Manually refresh notifications page

### Issue: Database errors

**Check:**
1. Table exists: `SHOW TABLES LIKE 'notifications';`
2. Foreign key constraints: `SHOW CREATE TABLE notifications;`
3. User IDs exist: `SELECT user_id FROM users WHERE user_id = 1;`

**Solution:**
- Run migration SQL again
- Check database connection in `db_connect.php`
- Verify foreign key constraints

---

## 📚 API Reference

### PHP Endpoints

#### POST `/api/notify.php`
Create a notification.

**Request:**
```json
{
  "user_id": 123,
  "from_user_id": 456,
  "type": "like",
  "title": "New Like",
  "message": "Someone liked your comment",
  "link": "/comments"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification created",
  "notification_id": 789
}
```

#### GET `/api/getNotifications.php`
Get notifications for a user.

**Query Parameters:**
- `user_id` (required) - User ID
- `limit` (optional, default: 20) - Max notifications
- `unread_only` (optional, default: 0) - Only unread

**Response:**
```json
{
  "success": true,
  "notifications": [...],
  "unread_count": 5,
  "total": 20
}
```

#### POST `/api/markAsRead.php`
Mark notification(s) as read.

**Request:**
```json
{
  "user_id": 123,
  "notification_id": 789  // optional, omit to mark all as read
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### Node.js Endpoints

#### POST `/push`
Receive notification from PHP (internal use only).

**Headers:**
- `X-Secret-Token: your-secret-token`

**Request:**
```json
{
  "notification_id": 789,
  "user_id": 123,
  "from_user_id": 456,
  "type": "like",
  "title": "New Like",
  "message": "Someone liked your comment",
  "link": "/comments",
  "created_at": "2024-01-01T12:00:00Z",
  "secret": "your-secret-token"
}
```

#### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "success": true,
  "status": "running",
  "connected_users": 5,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### WebSocket Events

#### Client → Server: `join`
Join user's notification room.

```javascript
socket.emit('join', { user_id: 123 });
```

#### Server → Client: `notification`
New notification received.

```javascript
socket.on('notification', (notification) => {
  console.log(notification);
});
```

#### Server → Client: `joined`
Confirmation of successful join.

```javascript
socket.on('joined', (data) => {
  console.log('Joined:', data);
});
```

---

## 🎉 You're All Set!

The notification system is now fully integrated. Users will receive real-time notifications for:
- ✅ Likes on their comments
- ✅ Replies to their comments
- ✅ System updates (when implemented)
- ✅ Role request status changes (when implemented)

For questions or issues, check the troubleshooting section or review the code comments.

---

## 📝 Next Steps

1. **Customize notification types** - Add more types in `notification_helper.php`
2. **Add email notifications** - Send emails for important notifications
3. **Add push notifications** - Implement browser push notifications
4. **Add notification preferences** - Let users choose what to be notified about
5. **Add notification sounds** - Play sound when notification arrives
6. **Add notification grouping** - Group similar notifications together

---

**Last Updated:** 2024-01-01


