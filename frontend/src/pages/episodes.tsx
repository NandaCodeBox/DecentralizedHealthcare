import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout/Layout';
import { CareEpisode } from '@/types';
import activeApiService from '@/config/api';
import { offlineService } from '@/services/offline';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

const EpisodesPage: React.FC = () => {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const [episodes, setEpisodes] = useState<CareEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEpisodes();
  }, [isOnline]);

  const loadEpisodes = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isOnline) {
        const result = await activeApiService.getEpisodes();
        if (result.success && result.data) {
          setEpisodes(result.data);
          // Cache for offline use
          offlineService.cacheUserData('episodes', result.data);
        } else {
          setError(result.error || 'Failed to load episodes');
        }
      } else {
        // Load from cache when offline
        const cachedEpisodes = offlineService.getCachedUserData('episodes');
        if (cachedEpisodes) {
          setEpisodes(cachedEpisodes);
        } else {
          setError('No episodes available offline');
        }
      }
    } catch (err) {
      setError('Failed to load episodes');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'escalated':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'escalated':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'emergency':
        return 'bg-red-100 text-red-800';
      case 'urgent':
        return 'bg-orange-100 text-orange-800';
      case 'routine':
        return 'bg-blue-100 text-blue-800';
      case 'self-care':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>{t('episodes.title')} - Healthcare OS</title>
        <meta name="description" content="Track your healthcare journey and care episodes" />
      </Head>

      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {t('episodes.title')}
            </h1>
            <p className="text-base sm:text-lg text-gray-600">
              {t('episodes.subtitle')}
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={loadEpisodes}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {/* Episodes List */}
          {episodes.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('episodes.noEpisodes')}
              </h3>
              <p className="text-gray-600 mb-6">
                Start by reporting your symptoms to create your first care episode.
              </p>
              <Link
                href="/symptom-intake"
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700"
              >
                {t('navigation.symptomIntake')}
              </Link>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {episodes.map((episode) => (
                <div
                  key={episode.episodeId}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 space-y-3 sm:space-y-0">
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(episode.status)}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                          {episode.symptoms.primaryComplaint.substring(0, 100)}
                          {episode.symptoms.primaryComplaint.length > 100 && '...'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(episode.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          episode.status
                        )}`}
                      >
                        {t(`episodes.status.${episode.status}`)}
                      </span>
                      {episode.triage?.urgencyLevel && (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(
                            episode.triage.urgencyLevel
                          )}`}
                        >
                          {t(`triage.urgencyLevels.${episode.triage.urgencyLevel}`)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Duration</p>
                      <p className="text-sm text-gray-900">
                        {t(`symptomIntake.durationOptions.${episode.symptoms.duration}`)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Severity</p>
                      <p className="text-sm text-gray-900">
                        {episode.symptoms.severity}/10
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Interactions</p>
                      <p className="text-sm text-gray-900">
                        {episode.interactions.length}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Link
                      href={`/episodes/${episode.episodeId}`}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-600 hover:text-primary-500"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      {t('episodes.viewDetails')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
};

export default EpisodesPage;