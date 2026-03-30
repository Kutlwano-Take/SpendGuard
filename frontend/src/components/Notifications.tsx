import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../hooks/useNotifications.js';
import { X, Check, AlertTriangle, Info, Bell, Settings } from 'lucide-react';

const NotificationIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'success':
      return <Check className="w-5 h-5 text-green-500" />;
    case 'error':
      return <X className="w-5 h-5 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'info':
      return <Info className="w-5 h-5 text-blue-500" />;
    default:
      return <Bell className="w-5 h-5 text-gray-500" />;
  }
};

const Notifications: React.FC = () => {
  const {
    notifications,
    settings,
    unreadCount,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    updateSettings,
    requestPermission,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      updateSettings({ pushNotifications: true });
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-b border-gray-200 overflow-hidden"
                >
                  <div className="p-4 space-y-3">
                    <h4 className="font-medium text-gray-900">Notification Settings</h4>
                    
                    <div className="space-y-2">
                      {[
                        { key: 'budgetAlerts', label: 'Budget Alerts' },
                        { key: 'weeklySummary', label: 'Weekly Summary' },
                        { key: 'overspendingAlerts', label: 'Overspending Alerts' },
                        { key: 'newFeatures', label: 'New Features' },
                        { key: 'emailNotifications', label: 'Email Notifications' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{label}</span>
                          <input
                            type="checkbox"
                            checked={settings[key as keyof typeof settings]}
                            onChange={(e) => updateSettings({ [key]: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-sm text-gray-700">Push Notifications</span>
                      {Notification.permission === 'granted' ? (
                        <input
                          type="checkbox"
                          checked={settings.pushNotifications}
                          onChange={(e) => updateSettings({ pushNotifications: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      ) : (
                        <button
                          onClick={handleRequestPermission}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Enable
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <NotificationIcon type={notification.type} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={clearAll}
                  className="w-full text-sm text-red-600 hover:text-red-800"
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notifications;
