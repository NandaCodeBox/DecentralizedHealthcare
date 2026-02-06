import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import {
  WifiIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const OfflineIndicator: React.FC = () => {
  const { t } = useTranslation();
  const { isOnline, isSyncing, pendingCount } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return (
      <div className="flex items-center text-green-600">
        <WifiIcon className="h-5 w-5 mr-1" />
        <span className="text-sm hidden sm:inline">{t('common.online')}</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center text-orange-600">
        <ExclamationTriangleIcon className="h-5 w-5 mr-1" />
        <span className="text-sm hidden sm:inline">{t('common.offline')}</span>
        {pendingCount > 0 && (
          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center text-blue-600">
        <CloudArrowUpIcon className="h-5 w-5 mr-1 animate-pulse" />
        <span className="text-sm hidden sm:inline">Syncing...</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center text-yellow-600">
        <CloudArrowUpIcon className="h-5 w-5 mr-1" />
        <span className="text-sm hidden sm:inline">{t('offline.pendingSync')}</span>
        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          {pendingCount}
        </span>
      </div>
    );
  }

  return null;
};

export default OfflineIndicator;