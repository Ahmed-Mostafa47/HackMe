/**
 * NotificationsPage Component
 * Full page for viewing and managing notifications
 */

import React, { useEffect } from 'react';
import { Bell, Heart, MessageSquare, Reply, Mail, Shield, Check, CheckCheck, Loader2, AlertTriangle, FlaskConical } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { getStoredUserId } from '../../utils/storedUser';

const NotificationsPage = ({ currentUser }) => {
    const userId = currentUser?.user_id || currentUser?.id || getStoredUserId();
    const {
        notifications,
        unreadCount,
        loading,
        error,
        markAsRead,
        markAllAsRead,
        refresh,
    } = useNotifications(userId, { autoLoad: true, loadUnreadCountOnly: false });

    const getIcon = (type) => {
        const iconClass = "w-5 h-5 flex-shrink-0";
        switch (type) {
            case 'like':
                return <Heart className={iconClass} />;
            case 'comment':
                return <MessageSquare className={iconClass} />;
            case 'reply':
                return <Reply className={iconClass} />;
            case 'message':
                return <Mail className={iconClass} />;
            case 'role_request':
            case 'update':
                return <Shield className={iconClass} />;
            case 'lab_request':
                return <FlaskConical className={iconClass} />;
            case 'moderation':
                return <AlertTriangle className={iconClass} />;
            default:
                return <Bell className={iconClass} />;
        }
    };

    const getColorClasses = (type, isRead) => {
        const baseClasses = isRead 
            ? 'bg-gray-800/30 border-gray-700/50' 
            : 'bg-gray-800/60 border-gray-600/50';
        
        const accentClasses = isRead ? '' : {
            like: 'border-l-red-500',
            comment: 'border-l-blue-500',
            reply: 'border-l-blue-500',
            message: 'border-l-purple-500',
            role_request: 'border-l-green-500',
            update: 'border-l-green-500',
            lab_request: 'border-l-cyan-500',
            moderation: 'border-l-amber-500',
        }[type] || 'border-l-gray-500';

        return `${baseClasses} ${accentClasses}`;
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'Unknown';
        
        try {
            // Parse ISO 8601 UTC timestamp (format: YYYY-MM-DDTHH:MM:SSZ)
            const date = new Date(timestamp);
            
            // Validate date
            if (isNaN(date.getTime())) {
                console.warn('Invalid timestamp:', timestamp);
                return 'Invalid date';
            }
            
            const now = new Date();
            const diffMs = now - date;
            
            // Handle edge case: if date is in the future (timezone mismatch), treat as "just now"
            if (diffMs < 0) {
                return 'Just now';
            }
            
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffSecs < 60) return 'Just now';
            if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            
            return date.toLocaleDateString();
        } catch (error) {
            console.warn('Error formatting timestamp:', error, timestamp);
            return 'Invalid date';
        }
    };

    const handleNotificationClick = async (notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }
        
        // Navigate to link if available
        if (notification.link) {
            window.location.href = notification.link;
        }
    };

    if (loading && notifications.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black pt-32 pb-16">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black pt-32 pb-16">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white font-mono mb-2">
                            NOTIFICATIONS
                        </h1>
                        <p className="text-gray-400 text-sm font-mono">
                            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-600/30 transition-colors font-mono text-sm"
                        >
                            <CheckCheck className="w-4 h-4" />
                            Mark All Read
                        </button>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 font-mono text-sm">
                        Error: {error}
                    </div>
                )}

                {/* Notifications List */}
                {notifications.length === 0 ? (
                    <div className="text-center py-16">
                        <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 font-mono">No notifications yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`
                                    ${getColorClasses(notification.type, notification.is_read)}
                                    border-l-4 rounded-lg p-4 cursor-pointer
                                    hover:bg-gray-800/80 transition-all duration-200
                                    ${!notification.is_read ? 'shadow-lg' : ''}
                                `}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h3 className={`font-semibold font-mono text-sm ${notification.is_read ? 'text-gray-400' : 'text-white'}`}>
                                                {notification.title}
                                            </h3>
                                            {!notification.is_read && (
                                                <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                        <p className="text-gray-300 text-sm mb-2">
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                            {notification.from_username && (
                                                <span>from: {notification.from_username}</span>
                                            )}
                                            <span>•</span>
                                            <span>{formatTimestamp(notification.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Refresh Button */}
                <div className="mt-6 text-center">
                    <button
                        onClick={refresh}
                        disabled={loading}
                        className="px-4 py-2 bg-gray-800/50 text-gray-300 rounded-lg border border-gray-700 hover:bg-gray-800/70 transition-colors font-mono text-sm disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading...
                            </span>
                        ) : (
                            'Refresh'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;


