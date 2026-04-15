/**
 * NotificationToast Component
 * Displays toast notifications for real-time alerts
 */

import React, { useEffect, useState } from 'react';
import { X, Heart, MessageSquare, Reply, Mail, Bell, Shield, AlertTriangle } from 'lucide-react';

const NotificationToast = ({ notification, onClose, onClick }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Auto-close after 5 seconds
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for animation
        }, 5000);

        return () => clearTimeout(timer);
    }, [onClose]);

    const getIcon = () => {
        const iconClass = "w-5 h-5";
        switch (notification.type) {
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
            case 'moderation':
                return <AlertTriangle className={iconClass} />;
            default:
                return <Bell className={iconClass} />;
        }
    };

    const getColorClasses = () => {
        switch (notification.type) {
            case 'like':
                return 'bg-red-500/20 border-red-500/50 text-red-300';
            case 'comment':
            case 'reply':
                return 'bg-blue-500/20 border-blue-500/50 text-blue-300';
            case 'message':
                return 'bg-purple-500/20 border-purple-500/50 text-purple-300';
            case 'role_request':
            case 'update':
                return 'bg-green-500/20 border-green-500/50 text-green-300';
            case 'moderation':
                return 'bg-amber-500/20 border-amber-500/50 text-amber-200';
            default:
                return 'bg-gray-500/20 border-gray-500/50 text-gray-300';
        }
    };

    if (!isVisible) return null;

    return (
        <div
            className={`
                ${getColorClasses()}
                border rounded-lg p-4 mb-3 shadow-lg backdrop-blur-sm
                transform transition-all duration-300 ease-out
                ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
                cursor-pointer hover:scale-[1.02] hover:shadow-xl
                min-w-[300px] max-w-[400px]
            `}
            onClick={() => {
                if (onClick) onClick(notification);
                setIsVisible(false);
                setTimeout(onClose, 300);
            }}
        >
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                    {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm mb-1 font-mono">
                        {notification.title}
                    </div>
                    <div className="text-xs text-gray-300 line-clamp-2">
                        {notification.message}
                    </div>
                    {notification.from_username && (
                        <div className="text-xs text-gray-400 mt-1">
                            from: {notification.from_username}
                        </div>
                    )}
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsVisible(false);
                        setTimeout(onClose, 300);
                    }}
                    className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default NotificationToast;


