/**
 * Real-Time Notification Server using Socket.io
 * 
 * This server receives notification events from PHP and broadcasts them
 * to the appropriate users via WebSocket connections.
 * 
 * Run: node server.js
 * Default port: 3001
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.io
const io = socketIo(server, {
    cors: {
        origin: "*", // In production, specify your frontend URL
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Configuration
const PORT = process.env.PORT || 3001;
const SECRET_TOKEN = process.env.NOTIFICATION_SECRET || 'your-secret-token-change-this-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Store user socket connections: userId -> socketId
const userSockets = new Map();

// Authentication middleware for HTTP endpoints
const authenticateRequest = (req, res, next) => {
    const secret = req.headers['x-secret-token'] || req.body.secret;
    
    if (secret !== SECRET_TOKEN) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: Invalid secret token'
        });
    }
    
    next();
};

// HTTP Endpoint: Receive notification from PHP
app.post('/push', authenticateRequest, (req, res) => {
    try {
        const {
            notification_id,
            user_id,
            from_user_id,
            type,
            title,
            message,
            link,
            created_at
        } = req.body;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: 'user_id is required'
            });
        }

        const notification = {
            id: notification_id,
            user_id: user_id,
            from_user_id: from_user_id || null,
            type: type || 'update',
            title: title || 'New Notification',
            message: message || '',
            link: link || null,
            created_at: created_at || new Date().toISOString(),
            is_read: false
        };

        // Send notification to the specific user via Socket.io
        const socketId = userSockets.get(parseInt(user_id));
        
        if (socketId) {
            // User is connected - send real-time notification
            io.to(socketId).emit('notification', notification);
            console.log(`[${new Date().toISOString()}] Notification sent to user ${user_id} via socket ${socketId}`);
        } else {
            // User is not connected - notification will be retrieved when they connect
            console.log(`[${new Date().toISOString()}] User ${user_id} not connected, notification stored in DB`);
        }

        res.json({
            success: true,
            message: 'Notification pushed',
            delivered: !!socketId
        });

    } catch (error) {
        console.error('Error processing notification:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'running',
        connected_users: userSockets.size,
        timestamp: new Date().toISOString()
    });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`[${new Date().toISOString()}] Client connected: ${socket.id}`);

    // Handle user authentication/joining
    socket.on('join', (data) => {
        try {
            const userId = parseInt(data.user_id);
            
            if (!userId || userId < 1) {
                socket.emit('error', { message: 'Invalid user_id' });
                return;
            }

            // Store the socket connection for this user
            userSockets.set(userId, socket.id);
            
            // Join user-specific room
            socket.join(`user_${userId}`);
            
            console.log(`[${new Date().toISOString()}] User ${userId} joined (socket: ${socket.id})`);
            
            // Confirm connection
            socket.emit('joined', {
                success: true,
                user_id: userId,
                message: 'Connected to notification server'
            });

        } catch (error) {
            console.error('Error in join handler:', error);
            socket.emit('error', { message: 'Failed to join' });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        // Remove user from map
        for (const [userId, socketId] of userSockets.entries()) {
            if (socketId === socket.id) {
                userSockets.delete(userId);
                console.log(`[${new Date().toISOString()}] User ${userId} disconnected (socket: ${socket.id})`);
                break;
            }
        }
    });

    // Handle errors
    socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🚀 Notification Server Running`);
    console.log(`========================================`);
    console.log(`Port: ${PORT}`);
    console.log(`Secret Token: ${SECRET_TOKEN.substring(0, 10)}...`);
    console.log(`WebSocket: ws://localhost:${PORT}`);
    console.log(`HTTP Endpoint: http://localhost:${PORT}/push`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
    console.log(`========================================`);
    console.log(`Waiting for connections...`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});


