import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout/Layout';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { offlineService } from '@/services/offline';
import {
  UserIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface UserProfile {
  personalInfo: {
    name: string;
    age: string;
    gender: string;
    location: string;
    phone: string;
    email: string;
    emergencyContact: string;
  };
  medicalInfo: {
    medicalConditions: string;
    medications: string;
    allergies: string;
    insurance: string;
  };
  preferences: {
    preferredLanguage: string;
    providerGender: string;
    maxTravelDistance: string;
    costSensitivity: string;
  };
}

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const [profile, setProfile] = useState<UserProfile>({
    personalInfo: {
      name: '',
      age: '',
      gender: '',
      location: '',
      phone: '',
      email: '',
      emergencyContact: '',
    },
    medicalInfo: {
      medicalConditions: '',
      medications: '',
      allergies: '',
      insurance: '',
    },
    preferences: {
      preferredLanguage: 'en',
      providerGender: '',
      maxTravelDistance: '',
      costSensitivity: '',
    },
  });
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      // Try to load from cache first
      const cachedProfile = offlineService.getCachedUserData('profile');
      if (cachedProfile) {
        setProfile(cachedProfile);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      // Save to cache for offline use
      offlineService.cacheUserData('profile', profile);
      
      // TODO: When online, sync with backend
      if (isOnline) {
        // await apiService.updateProfile(profile);
      }
      
      setEditingSection(null);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (section: keyof UserProfile, field: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const renderSection = (
    sectionKey: keyof UserProfile,
    sectionTitle: string,
    fields: Array<{ key: string; label: string; type?: string; options?: string[] }>
  ) => {
    const isEditing = editingSection === sectionKey;
    const sectionData = profile[sectionKey] as Record<string, string>;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{sectionTitle}</h2>
          {!isEditing ? (
            <button
              onClick={() => setEditingSection(sectionKey)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-600 hover:text-primary-500 self-start sm:self-auto"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              {t('common.edit')}
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-green-600 hover:text-green-500 disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4 mr-1" />
                {saving ? t('common.loading') : t('common.save')}
              </button>
              <button
                onClick={() => setEditingSection(null)}
                className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-500"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {field.label}
              </label>
              {!isEditing ? (
                <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-md min-h-[2.5rem] flex items-center">
                  {sectionData[field.key] || '-'}
                </p>
              ) : field.options ? (
                <select
                  value={sectionData[field.key] || ''}
                  onChange={(e) => handleInputChange(sectionKey, field.key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base sm:text-sm"
                >
                  <option value="">Select...</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || 'text'}
                  value={sectionData[field.key] || ''}
                  onChange={(e) => handleInputChange(sectionKey, field.key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base sm:text-sm"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
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
        <title>{t('profile.title')} - Healthcare OS</title>
        <meta name="description" content="Manage your health profile and preferences" />
      </Head>

      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center mb-4 space-y-3 sm:space-y-0">
              <div className="p-3 bg-primary-100 rounded-full sm:mr-4 self-start">
                <UserIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {t('profile.title')}
                </h1>
                <p className="text-base sm:text-lg text-gray-600">
                  Manage your health information and preferences
                </p>
              </div>
            </div>
            
            {!isOnline && (
              <div className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-700">
                  {t('common.offline')} - Changes will be saved locally and synced when you're back online.
                </p>
              </div>
            )}
          </div>

          {/* Profile Sections */}
          <div className="space-y-4 sm:space-y-6">
            {renderSection('personalInfo', t('profile.personalInfo'), [
              { key: 'name', label: t('profile.name') },
              { key: 'age', label: t('profile.age'), type: 'number' },
              { key: 'gender', label: t('profile.gender'), options: ['Male', 'Female', 'Other', 'Prefer not to say'] },
              { key: 'location', label: t('profile.location') },
              { key: 'phone', label: t('profile.phone'), type: 'tel' },
              { key: 'email', label: t('profile.email'), type: 'email' },
              { key: 'emergencyContact', label: t('profile.emergencyContact') },
            ])}

            {renderSection('medicalInfo', t('profile.medicalInfo'), [
              { key: 'medicalConditions', label: t('profile.medicalConditions') },
              { key: 'medications', label: t('profile.medications') },
              { key: 'allergies', label: t('profile.allergies') },
              { key: 'insurance', label: t('profile.insurance') },
            ])}

            {renderSection('preferences', t('profile.preferences'), [
              { key: 'preferredLanguage', label: t('profile.preferredLanguage'), options: ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali'] },
              { key: 'providerGender', label: t('profile.providerGender'), options: ['No preference', 'Male', 'Female'] },
              { key: 'maxTravelDistance', label: t('profile.maxTravelDistance'), options: ['5 km', '10 km', '25 km', '50 km', 'No limit'] },
              { key: 'costSensitivity', label: t('profile.costSensitivity'), options: ['Low cost priority', 'Balanced', 'Quality priority'] },
            ])}
          </div>
        </div>
      </Layout>
    </>
  );
};

export default ProfilePage;