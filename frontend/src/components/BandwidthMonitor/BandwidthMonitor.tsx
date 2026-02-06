import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  SignalIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline';
import { bandwidthService } from '@/services/bandwidth';

interface BandwidthMonitorProps {
  showDetails?: boolean;
  className?: string;
}

interface NetworkStats {
  quality: 'poor' | 'moderate' | 'good' | 'excellent';
  dataUsage: { total: number; session: number };
  isDataSaver: boolean;
  isLimitExceeded: boolean;
}

export const BandwidthMonitor: React.FC<BandwidthMonitorProps> = ({
  showDetails = false,
  className = '',
}) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<NetworkStats>({
    quality: 'moderate',
    dataUsage: { total: 0, session: 0 },
    isDataSaver: false,
    isLimitExceeded: false,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      const quality = bandwidthService.getNetworkQuality();
      const dataUsage = bandwidthService.getDataUsage();
      const isDataSaver = bandwidthService.isDataSaverEnabled();
      const isLimitExceeded = bandwidthService.isDataLimitExceeded();

      setStats({
        quality,
        dataUsage,
        isDataSaver,
        isLimitExceeded,
      });
    };

    // Initial update only
    updateStats();

    // Listen for network changes only (no automatic intervals)
    if (typeof window !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', updateStats);
      
      return () => {
        connection.removeEventListener('change', updateStats);
      };
    }
  }, []);

  const formatDataUsage = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getQualityColor = (quality: string): string => {
    const colors = {
      poor: 'text-red-600 bg-red-50 border-red-200',
      moderate: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      good: 'text-blue-600 bg-blue-50 border-blue-200',
      excellent: 'text-green-600 bg-green-50 border-green-200',
    };
    return colors[quality as keyof typeof colors] || colors.moderate;
  };

  const getQualityIcon = (quality: string) => {
    const iconProps = { className: 'h-4 w-4' };
    
    switch (quality) {
      case 'poor':
        return <SignalIcon {...iconProps} style={{ opacity: 0.3 }} />;
      case 'moderate':
        return <SignalIcon {...iconProps} style={{ opacity: 0.6 }} />;
      case 'good':
        return <SignalIcon {...iconProps} style={{ opacity: 0.8 }} />;
      case 'excellent':
        return <SignalIcon {...iconProps} />;
      default:
        return <SignalIcon {...iconProps} />;
    }
  };

  const handleOptimizeSettings = () => {
    // Reset data usage tracking
    bandwidthService.resetDataUsage();
    setStats(prev => ({
      ...prev,
      dataUsage: { total: 0, session: 0 },
      isLimitExceeded: false,
    }));
  };

  return (
    <div className={`bandwidth-monitor ${className}`}>
      {/* Compact View */}
      <div 
        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${getQualityColor(stats.quality)}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {getQualityIcon(stats.quality)}
        <span className="text-sm font-medium capitalize">
          {stats.quality}
        </span>
        
        {stats.isDataSaver && (
          <InformationCircleIcon className="h-4 w-4" title="Data Saver Mode" />
        )}
        
        {stats.isLimitExceeded && (
          <ExclamationTriangleIcon className="h-4 w-4 text-red-500" title="Data Limit Exceeded" />
        )}
        
        <span className="text-xs ml-auto">
          {formatDataUsage(stats.dataUsage.session)}
        </span>
      </div>

      {/* Expanded View */}
      {(isExpanded || showDetails) && (
        <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="space-y-3">
            {/* Network Quality Details */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Network Quality
              </h4>
              <div className="flex items-center gap-2">
                {getQualityIcon(stats.quality)}
                <span className="text-sm capitalize">{stats.quality}</span>
                {stats.isDataSaver && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Data Saver
                  </span>
                )}
              </div>
            </div>

            {/* Data Usage */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Data Usage
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>This Session:</span>
                  <span className={stats.isLimitExceeded ? 'text-red-600 font-medium' : ''}>
                    {formatDataUsage(stats.dataUsage.session)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total:</span>
                  <span>{formatDataUsage(stats.dataUsage.total)}</span>
                </div>
              </div>
              
              {/* Data Usage Bar */}
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      stats.isLimitExceeded ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ 
                      width: `${Math.min((stats.dataUsage.session / (50 * 1024 * 1024)) * 100, 100)}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0 MB</span>
                  <span>50 MB</span>
                </div>
              </div>
            </div>

            {/* Optimization Tips */}
            {(stats.quality === 'poor' || stats.isLimitExceeded) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h5 className="text-sm font-medium text-yellow-800 mb-1">
                  Optimization Tips
                </h5>
                <ul className="text-xs text-yellow-700 space-y-1">
                  {stats.quality === 'poor' && (
                    <>
                      <li>• Images are automatically compressed</li>
                      <li>• Data is compressed before sending</li>
                      <li>• Non-essential content is deferred</li>
                    </>
                  )}
                  {stats.isLimitExceeded && (
                    <>
                      <li>• Consider using Wi-Fi if available</li>
                      <li>• Only essential data will be loaded</li>
                      <li>• Some features may be limited</li>
                    </>
                  )}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={handleOptimizeSettings}
                className="flex-1 text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded hover:bg-blue-100 transition-colors"
              >
                Reset Usage
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="flex-1 text-xs bg-gray-50 text-gray-700 px-3 py-2 rounded hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Simple bandwidth indicator for minimal UI space
 */
export const BandwidthIndicator: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const [quality, setQuality] = useState<string>('moderate');
  const [isDataSaver, setIsDataSaver] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setQuality(bandwidthService.getNetworkQuality());
      setIsDataSaver(bandwidthService.isDataSaverEnabled());
    };

    // Initial update only
    updateStatus();

    // Listen for network changes only (no automatic intervals)
    if (typeof window !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', updateStatus);
      
      return () => {
        connection.removeEventListener('change', updateStatus);
      };
    }
  }, []);

  const getIndicatorColor = (quality: string): string => {
    const colors = {
      poor: 'bg-red-500',
      moderate: 'bg-yellow-500',
      good: 'bg-blue-500',
      excellent: 'bg-green-500',
    };
    return colors[quality as keyof typeof colors] || colors.moderate;
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getIndicatorColor(quality)}`} />
      {isDataSaver && (
        <div className="w-2 h-2 rounded-full bg-orange-500" title="Data Saver Mode" />
      )}
    </div>
  );
};

export default BandwidthMonitor;