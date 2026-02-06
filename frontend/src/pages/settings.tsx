import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout/Layout';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { offlineService } from '@/services/offline';
import {
  Cog6ToothIcon,
  GlobeAltIcon,
  BellIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  CloudArrowDownIcon,
  TrashIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

interface AppSettings {
  language: string;
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    careUpdates: boolean;
    appointments: boolean;
  };
  privacy: {
    shareDataForResearch: boolean;
    allowAnalytics: boolean;
    locationTracking: boolean;
  };
  offline: {
    autoSync: boolean;
    cacheSize: string;
  };
}

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isOnline = useOnlineStatus();
  const [settings, setSettings] = useState<AppSettings>({
    language: 'en',
    notifications: {
      push: true,
      email: true,
      sms: false,
      careUpdates: true,
      appointments: true,
    },
    privacy: {
      shareDataForResearch: false,
      allowAnalytics: true,
      locationTracking: true,
    },
    offline: {
      autoSync: true,
      cacheSize: '50MB',
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const cachedSettings = offlineService.getCachedUserData('settings');
      if (cachedSettings) {
        setSettings(cachedSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    setSaving(true);
    try {
      offlineService.cacheUserData('settings', newSettings);
      setSettings(newSettings);
      
      // Apply language change immediately
      if (newSettings.language !== settings.language) {
        i18n.changeLanguage(newSettings.language);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = (language: string) => {
    const newSettings = { ...settings, language };
    saveSettings(newSettings);
  };

  const handleNotificationChange = (key: keyof AppSettings['notifications'], value: boolean) => {
    const newSettings = {
      ...settings,
      notifications: { ...settings.notifications, [key]: value },
    };
    saveSettings(newSettings);
  };

  const handlePrivacyChange = (key: keyof AppSettings['privacy'], value: boolean) => {
    const newSettings = {
      ...settings,
      privacy: { ...settings.privacy, [key]: value },
    };
    saveSettings(newSettings);
  };

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear all cached data? This will remove offline data.')) {
      try {
        // Clear offline cache
        localStorage.clear();
        sessionStorage.clear();
        alert('Cache cleared successfully');
      } catch (error) {
        console.error('Failed to clear cache:', error);
        alert('Failed to clear cache');
      }
    }
  };

  const handleExportData = () => {
    try {
      const userData = {
        profile: offlineService.getCachedUserData('profile'),
        episodes: offlineService.getCachedUserData('episodes'),
        settings: offlineService.getCachedUserData('settings'),
      };
      
      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `healthcare-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data');
    }
  };

  const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void; disabled?: boolean }> = ({
    enabled,
    onChange,
    disabled = false,
  }) => (
    <button
      type="button"
      className={`${
        enabled ? 'bg-primary-600' : 'bg-gray-200'
      } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      role="switch"
      aria-checked={enabled}
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
    >
      <span
        aria-hidden="true"
        className={`${
          enabled ? 'translate-x-5' : 'translate-x-0'
        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </button>
  );

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>{t('settings.title')} - Healthcare OS</title>
        <meta name="description" content="Manage your app settings and preferences" />
      </Head>

      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center mb-4 space-y-3 sm:space-y-0">
              <div className="p-3 bg-primary-100 rounded-full sm:mr-4 self-start">
                <Cog6ToothIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {t('settings.title')}
                </h1>
                <p className="text-base sm:text-lg text-gray-600">
                  Customize your app experience
                </p>
              </div>
            </div>
            
            {!isOnline && (
              <div className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-700">
                  {t('common.offline')} - Settings will be saved locally and synced when you're back online.
                </p>
              </div>
            )}
          </div>

          {/* Settings Sections */}
          <div className="space-y-4 sm:space-y-6">
            {/* Language Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center mb-4">
                <GlobeAltIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mr-3" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{t('settings.language')}</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Language
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="w-full sm:max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base sm:text-sm"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center mb-4">
                <BellIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mr-3" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{t('settings.notifications')}</h2>
              </div>
              <div className="space-y-4">
                {[
                  { key: 'push', label: 'Push Notifications' },
                  { key: 'email', label: 'Email Notifications' },
                  { key: 'sms', label: 'SMS Notifications' },
                  { key: 'careUpdates', label: 'Care Updates' },
                  { key: 'appointments', label: 'Appointment Reminders' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1">
                    <span className="text-sm font-medium text-gray-700 pr-4">{item.label}</span>
                    <ToggleSwitch
                      enabled={settings.notifications[item.key as keyof AppSettings['notifications']]}
                      onChange={(value) => handleNotificationChange(item.key as keyof AppSettings['notifications'], value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center mb-4">
                <ShieldCheckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mr-3" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{t('settings.privacy')}</h2>
              </div>
              <div className="space-y-4">
                {[
                  { key: 'shareDataForResearch', label: 'Share anonymized data for medical research' },
                  { key: 'allowAnalytics', label: 'Allow usage analytics' },
                  { key: 'locationTracking', label: 'Enable location-based provider recommendations' },
                ].map((item) => (
                  <div key={item.key} className="flex items-start justify-between py-1">
                    <span className="text-sm font-medium text-gray-700 pr-4 leading-6">{item.label}</span>
                    <div className="flex-shrink-0">
                      <ToggleSwitch
                        enabled={settings.privacy[item.key as keyof AppSettings['privacy']]}
                        onChange={(value) => handlePrivacyChange(item.key as keyof AppSettings['privacy'], value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Offline & Data Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center mb-4">
                <CloudArrowDownIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mr-3" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{t('settings.offlineMode')}</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm font-medium text-gray-700 pr-4">{t('settings.dataSync')}</span>
                  <ToggleSwitch
                    enabled={settings.offline.autoSync}
                    onChange={(value) => {
                      const newSettings = {
                        ...settings,
                        offline: { ...settings.offline, autoSync: value },
                      };
                      saveSettings(newSettings);
                    }}
                  />
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Data Management</h3>
                      <p className="text-xs text-gray-500">Manage your offline data and cache</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      onClick={handleClearCache}
                      className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-500 border border-red-300 rounded-md hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      {t('settings.clearCache')}
                    </button>
                    
                    <button
                      onClick={handleExportData}
                      className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-primary-600 hover:text-primary-500 border border-primary-300 rounded-md hover:bg-primary-50"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                      {t('settings.exportData')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center mb-4">
                <InformationCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mr-3" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{t('settings.about')}</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">{t('settings.version')}</span>
                  <span className="text-sm text-gray-500">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Build</span>
                  <span className="text-sm text-gray-500">2024.02.01</span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Healthcare OS - AI-enabled decentralized care orchestration system for India's healthcare network.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default SettingsPage;