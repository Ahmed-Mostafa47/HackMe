/**
 * Notification Service
 * Handles Socket.io connection and notification management
 */

import { io } from 'socket.io-client';
import axios from 'axios';

const API_BASE = 'http://localhost/HackMe/server/api';
const SOCKET_URL = 'http://localhost:3001';

class NotificationService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.listeners = new Map();
        this.currentUserId = null;
        this.sharedUnreadCount = 0; // Shared unread count across all components
    }

    /**
     * Connect to notification server
     * @param {number} userId - Current user ID
     */
    connect(userId) {
        if (this.socket?.connected && this.currentUserId === userId) {
            return; // Already connected for this user
        }

        // Disconnect existing connection if user changed
        if (this.socket) {
            this.disconnect();
        }

        this.currentUserId = userId;

        // Initialize Socket.io connection
        this.socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        // Connection events
        this.socket.on('connect', () => {
            console.log('[Notifications] Connected to server');
            this.isConnected = true;
            
            // Join user's notification room
            this.socket.emit('join', { user_id: userId });
        });

        this.socket.on('joined', (data) => {
            console.log('[Notifications] Joined room:', data);
        });

        this.socket.on('disconnect', () => {
            console.log('[Notifications] Disconnected from server');
            this.isConnected = false;
        });

        this.socket.on('error', (error) => {
            console.error('[Notifications] Error:', error);
        });

        // Listen for notifications
        this.socket.on('notification', (notification) => {
            console.log('[Notifications] Received:', notification);
            this.notifyListeners('notification', notification);
        });
    }

    /**
     * Disconnect from notification server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.currentUserId = null;
        }
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} - Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                callbacks.delete(callback);
            }
        };
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }

    /**
     * Notify all listeners of an event
     */
    notifyListeners(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('[Notifications] Listener error:', error);
                }
            });
        }
    }

    /**
     * Get notifications from API
     * @param {number} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise}
     */
    async getNotifications(userId, options = {}) {
        try {
            const params = new URLSearchParams({
                user_id: userId,
                limit: options.limit || 20,
                unread_only: options.unreadOnly ? 1 : 0,
            });

            const response = await axios.get(`${API_BASE}/getNotifications.php?${params}`);
            return response.data;
        } catch (error) {
            console.error('[Notifications] Failed to fetch:', error);
            throw error;
        }
    }

    /**
     * Mark notification as read
     * @param {number} userId - User ID
     * @param {number|null} notificationId - Notification ID (null to mark all as read)
     * @returns {Promise}
     */
    async markAsRead(userId, notificationId = null) {
        try {
            const response = await axios.post(`${API_BASE}/markAsRead.php`, {
                user_id: userId,
                notification_id: notificationId,
            });
            
            // Update shared unread count and notify listeners
            if (response.data.success && typeof response.data.unread_count === 'number') {
                this.sharedUnreadCount = response.data.unread_count;
                this.notifyListeners('unreadCountChanged', this.sharedUnreadCount);
            }
            
            return response.data;
        } catch (error) {
            console.error('[Notifications] Failed to mark as read:', error);
            throw error;
        }
    }
    
    /**
     * Get shared unread count
     * @returns {number}
     */
    getUnreadCount() {
        return this.sharedUnreadCount;
    }
    
    /**
     * Set shared unread count (called when loading notifications)
     * @param {number} count - Unread count
     */
    setUnreadCount(count) {
        if (this.sharedUnreadCount !== count) {
            this.sharedUnreadCount = count;
            this.notifyListeners('unreadCountChanged', count);
        }
    }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;


