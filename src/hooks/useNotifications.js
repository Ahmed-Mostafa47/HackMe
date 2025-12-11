/**
 * useNotifications Hook
 * React hook for managing notifications
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import notificationService from '../services/notificationService';

export const useNotifications = (userId, options = {}) => {
    const { autoLoad = false, loadUnreadCountOnly = false } = options;
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const hasInitialized = useRef(false);
    const isLoadingRef = useRef(false);

    // Load notifications from API
    const loadNotifications = useCallback(async (unreadOnly = false, force = false) => {
        if (!userId) return;
        
        // Prevent multiple simultaneous loads
        if (isLoadingRef.current && !force) {
            return;
        }

        isLoadingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            const response = await notificationService.getNotifications(userId, {
                limit: loadUnreadCountOnly ? 1 : 20, // Only load 1 if we just need the count
                unreadOnly,
            });

            if (response.success) {
                if (!loadUnreadCountOnly) {
                    setNotifications(response.notifications || []);
                }
                const newUnreadCount = response.unread_count || 0;
                setUnreadCount(newUnreadCount);
                // Update shared unread count in service
                notificationService.setUnreadCount(newUnreadCount);
            } else {
                throw new Error(response.message || 'Failed to load notifications');
            }
        } catch (err) {
            console.error('Failed to load notifications:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
        }
    }, [userId, loadUnreadCountOnly]);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId) => {
        if (!userId) return;

        try {
            const response = await notificationService.markAsRead(userId, notificationId);
            
            if (response.success) {
                // Update local state immediately (optimistic update)
                setNotifications(prev => 
                    prev.map(n => 
                        n.id === notificationId ? { ...n, is_read: true } : n
                    )
                );
                // Update unread count from server response (more accurate)
                if (typeof response.unread_count === 'number') {
                    setUnreadCount(response.unread_count);
                    notificationService.setUnreadCount(response.unread_count);
                } else {
                    // Fallback: optimistic update
                    const newCount = Math.max(0, unreadCount - 1);
                    setUnreadCount(newCount);
                    notificationService.setUnreadCount(newCount);
                }
            }
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    }, [userId]);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        if (!userId) return;

        try {
            const response = await notificationService.markAsRead(userId, null);
            
            if (response.success) {
                // Update local state immediately (optimistic update)
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                // Update unread count from server response (more accurate)
                if (typeof response.unread_count === 'number') {
                    setUnreadCount(response.unread_count);
                    notificationService.setUnreadCount(response.unread_count);
                } else {
                    // Fallback: should be 0 after marking all as read
                    setUnreadCount(0);
                    notificationService.setUnreadCount(0);
                }
            }
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    }, [userId]);

    // Initialize Socket.io connection and optionally load notifications
    useEffect(() => {
        if (!userId || hasInitialized.current) return;

        hasInitialized.current = true;

        // Connect to Socket.io (always needed for real-time updates)
        notificationService.connect(userId);
        
        // Initialize unread count from shared state if available
        const sharedCount = notificationService.getUnreadCount();
        if (sharedCount > 0) {
            setUnreadCount(sharedCount);
        }

        // Only load notifications if autoLoad is enabled
        if (autoLoad) {
            loadNotifications(loadUnreadCountOnly);
        } else if (loadUnreadCountOnly) {
            // For components that only need unread count (like Navbar), load it with minimal data
            loadNotifications(false, false);
        }

        // Listen for real-time notifications
        const unsubscribeNotification = notificationService.on('notification', (notification) => {
            // Add new notification to the list (only if we're tracking full list)
            if (!loadUnreadCountOnly) {
                setNotifications(prev => [notification, ...prev]);
            }
            const newCount = unreadCount + 1;
            setUnreadCount(newCount);
            notificationService.setUnreadCount(newCount);
        });
        
        // Listen for shared unread count changes (from other components)
        const unsubscribeCountChange = notificationService.on('unreadCountChanged', (count) => {
            setUnreadCount(count);
        });

        // Cleanup on unmount
        return () => {
            unsubscribeNotification();
            unsubscribeCountChange();
            // Only disconnect if this is the last component using it
            // For now, we'll keep connection alive as multiple components need it
            hasInitialized.current = false;
        };
    }, [userId, autoLoad, loadUnreadCountOnly, loadNotifications]);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        loadNotifications,
        markAsRead,
        markAllAsRead,
        refresh: () => loadNotifications(false),
    };
};


