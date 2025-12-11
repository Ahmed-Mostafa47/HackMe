/**
 * NotificationContainer Component
 * Container for displaying toast notifications
 */

import React, { useEffect, useState } from 'react';
import NotificationToast from './NotificationToast';
import { useNotifications } from '../../hooks/useNotifications';
import notificationService from '../../services/notificationService';

const NotificationContainer = ({ userId, onNotificationClick }) => {
    // Only need unread count for this component, not full notifications
    const { unreadCount } = useNotifications(userId, { autoLoad: false, loadUnreadCountOnly: true });
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        if (!userId) return;

        // Listen for new notifications
        const unsubscribe = notificationService.on('notification', (notification) => {
            setToasts(prev => [...prev, { id: Date.now(), ...notification }]);
        });

        return unsubscribe;
    }, [userId]);

    const handleClose = (toastId) => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
    };

    const handleClick = (notification) => {
        if (onNotificationClick) {
            onNotificationClick(notification);
        }
    };

    return (
        <div className="fixed top-20 right-4 z-[9999] pointer-events-none">
            <div className="flex flex-col-reverse pointer-events-auto">
                {toasts.map(toast => (
                    <NotificationToast
                        key={toast.id}
                        notification={toast}
                        onClose={() => handleClose(toast.id)}
                        onClick={() => handleClick(toast)}
                    />
                ))}
            </div>
        </div>
    );
};

export default NotificationContainer;

