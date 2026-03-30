import { useState, useEffect, useCallback } from 'react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
  read: boolean;
}

interface NotificationSettings {
  budgetAlerts: boolean;
  weeklySummary: boolean;
  overspendingAlerts: boolean;
  newFeatures: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    budgetAlerts: true,
    weeklySummary: true,
    overspendingAlerts: true,
    newFeatures: false,
    emailNotifications: true,
    pushNotifications: false,
  });

  // Load notifications from localStorage on mount
  useEffect(() => {
    const storedNotifications = localStorage.getItem('spendguard-notifications');
    const storedSettings = localStorage.getItem('spendguard-notification-settings');
    
    if (storedNotifications) {
      try {
        const parsed = JSON.parse(storedNotifications);
        setNotifications(parsed.filter((n: Notification) => !n.read || Date.now() - n.timestamp < 86400000)); // Keep unread or recent (24h)
      } catch (error) {
        console.error('Failed to parse stored notifications:', error);
      }
    }
    
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings));
      } catch (error) {
        console.error('Failed to parse stored notification settings:', error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('spendguard-notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('spendguard-notification-settings', JSON.stringify(settings));
  }, [settings]);

  const addNotification = useCallback((
    type: Notification['type'],
    title: string,
    message: string,
    duration: number = 5000
  ) => {
    const notification: Notification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      title,
      message,
      duration,
      timestamp: Date.now(),
      read: false,
    };

    setNotifications(prev => [notification, ...prev]);

    // Auto-remove notification after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Check for budget alerts
  const checkBudgetAlerts = useCallback((budgetStatus: Array<{ category: string; percentage: number }>) => {
    if (!settings.budgetAlerts) return;

    budgetStatus.forEach(budget => {
      if (budget.percentage >= 90) {
        addNotification(
          'warning',
          'Budget Alert',
          `${budget.category} budget is ${budget.percentage}% used!`,
          10000
        );
      } else if (budget.percentage >= 75) {
        addNotification(
          'info',
          'Budget Reminder',
          `${budget.category} budget is ${budget.percentage}% used.`,
          8000
        );
      }
    });
  }, [settings.budgetAlerts, addNotification]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      updateSettings({ pushNotifications: permission === 'granted' });
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, [updateSettings]);

  // Show browser notification
  const showBrowserNotification = useCallback((
    title: string,
    message: string,
    icon?: string
  ) => {
    if (settings.pushNotifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'spendguard-notification',
      });
    }
  }, [settings.pushNotifications]);

  return {
    notifications,
    settings,
    unreadCount,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    updateSettings,
    checkBudgetAlerts,
    requestPermission,
    showBrowserNotification,
  };
};
