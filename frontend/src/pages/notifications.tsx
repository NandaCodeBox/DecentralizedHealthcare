import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'alert',
      title: 'Emergency Case Assigned',
      message: 'Patient Rajesh Kumar (45) with chest pain assigned to your facility',
      timestamp: '2 minutes ago',
      read: false,
      icon: '🚨',
    },
    {
      id: 2,
      type: 'success',
      title: 'Appointment Confirmed',
      message: 'Your appointment with Dr. Rajesh Verma is confirmed for 11:00 AM',
      timestamp: '15 minutes ago',
      read: false,
      icon: '✅',
    },
    {
      id: 3,
      type: 'info',
      title: 'Assessment Approved',
      message: 'Your triage assessment has been approved by supervisor Dr. Priya Sharma',
      timestamp: '1 hour ago',
      read: true,
      icon: 'ℹ️',
    },
    {
      id: 4,
      type: 'warning',
      title: 'Capacity Alert',
      message: 'Your facility is at 85% capacity. Consider adjusting availability.',
      timestamp: '2 hours ago',
      read: true,
      icon: '⚠️',
    },
    {
      id: 5,
      type: 'success',
      title: 'Patient Outcome Recorded',
      message: 'Outcome for episode EP-2024-001 has been successfully recorded',
      timestamp: '3 hours ago',
      read: true,
      icon: '✅',
    },
  ]);

  const handleMarkAsRead = (id: number) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'alert':
        return 'bg-red-50 border-red-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <>
      <Head>
        <title>Notifications - Healthcare OS</title>
        <meta name="description" content="Real-time notifications and alerts" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Link href="/" className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-4">
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Home
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                <p className="text-gray-600 mt-1">Stay updated with real-time alerts</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-teal-600">{unreadCount}</div>
                <div className="text-sm text-gray-600">Unread</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Action Bar */}
          {unreadCount > 0 && (
            <div className="mb-6 flex justify-end">
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors text-sm"
              >
                Mark All as Read
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-lg border p-4 sm:p-5 transition-all ${getNotificationColor(notification.type)} ${
                    !notification.read ? 'ring-2 ring-teal-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl flex-shrink-0">{notification.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                            {notification.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="px-3 py-1 bg-teal-600 text-white font-semibold rounded text-xs hover:bg-teal-700 transition-colors flex-shrink-0"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-3">{notification.timestamp}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Notification Preferences */}
          <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Notification Preferences</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-900">Emergency alerts</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-900">Appointment reminders</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-900">Assessment updates</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-900">Marketing emails</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationsPage;
