import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/router';
import { ExclamationTriangleIcon, SignalIcon } from '@heroicons/react/24/outline';
import { SymptomIntakeForm as FormData } from '@/types';
import activeApiService from '@/config/api';
import { offlineService } from '@/services/offline';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { ProgressiveLoader } from '@/components/ProgressiveLoader/ProgressiveLoader';
import { BandwidthMonitor } from '@/components/BandwidthMonitor/BandwidthMonitor';
import { bandwidthService } from '@/services/bandwidth';

const SymptomIntakeForm: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [networkQuality, setNetworkQuality] = useState(bandwidthService.getNetworkQuality());

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>();

  const severity = watch('severity');

  // Initialize network quality once (removed automatic updates)
  React.useEffect(() => {
    setNetworkQuality(bandwidthService.getNetworkQuality());
  }, []);

  const durationOptions = [
    { value: 'lessThan1Hour', label: t('symptomIntake.durationOptions.lessThan1Hour') },
    { value: '1to6Hours', label: t('symptomIntake.durationOptions.1to6Hours') },
    { value: '6to24Hours', label: t('symptomIntake.durationOptions.6to24Hours') },
    { value: '1to3Days', label: t('symptomIntake.durationOptions.1to3Days') },
    { value: '3to7Days', label: t('symptomIntake.durationOptions.3to7Days') },
    { value: '1to4Weeks', label: t('symptomIntake.durationOptions.1to4Weeks') },
    { value: 'moreThan4Weeks', label: t('symptomIntake.durationOptions.moreThan4Weeks') },
  ];

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    const symptomData = {
      primaryComplaint: data.primaryComplaint,
      duration: data.duration,
      severity: data.severity,
      associatedSymptoms: data.associatedSymptoms,
      medicalHistory: data.medicalHistory,
      inputMethod: 'text' as const,
    };

    try {
      if (isOnline) {
        // Try to submit online with bandwidth optimization
        const result = await activeApiService.submitSymptoms(symptomData);
        if (result.success) {
          router.push(`/episodes/${result.data?.episodeId}`);
        } else if (result.offline) {
          // Network error - save for offline sync
          offlineService.addToQueue({
            type: 'symptom-intake',
            data: symptomData,
          });
          router.push('/offline-confirmation');
        } else {
          setSubmitError(result.error || t('symptomIntake.submitError'));
        }
      } else {
        // Save for offline sync
        offlineService.addToQueue({
          type: 'symptom-intake',
          data: symptomData,
        });
        
        // Show success message and redirect
        router.push('/offline-confirmation');
      }
    } catch (error) {
      console.error('Submit error:', error);
      // Fallback to offline mode on any error
      offlineService.addToQueue({
        type: 'symptom-intake',
        data: symptomData,
      });
      router.push('/offline-confirmation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNetworkQualityColor = (quality: string) => {
    const colors = {
      poor: 'text-red-600 bg-red-50 border-red-200',
      moderate: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      good: 'text-blue-600 bg-blue-50 border-blue-200',
      excellent: 'text-green-600 bg-green-50 border-green-200',
    };
    return colors[quality as keyof typeof colors] || colors.moderate;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0">
      {/* Bandwidth Monitor */}
      <div className="mb-4">
        <BandwidthMonitor showDetails={false} />
      </div>

      {/* Network Quality Notice */}
      {(networkQuality === 'poor' || !isOnline) && (
        <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-md border ${getNetworkQualityColor(networkQuality)}`}>
          <div className="flex items-start sm:items-center">
            <SignalIcon className="h-5 w-5 mr-2 sm:mr-3 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="text-sm font-medium">
                {!isOnline ? 'You are offline' : `${networkQuality.charAt(0).toUpperCase() + networkQuality.slice(1)} connection detected`}
              </p>
              <p className="text-xs mt-1">
                {!isOnline 
                  ? 'Your data will be saved and submitted when connection is restored.'
                  : 'Form has been optimized for your connection speed.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Warning */}
      <ProgressiveLoader priority="critical">
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="ml-2 sm:ml-3">
              <p className="text-sm text-red-700">
                {t('symptomIntake.emergencyWarning')}
              </p>
            </div>
          </div>
        </div>
      </ProgressiveLoader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        {/* Primary Complaint */}
        <ProgressiveLoader priority="critical">
          <div>
            <label htmlFor="primaryComplaint" className="block text-sm font-medium text-gray-700 mb-2">
              {t('symptomIntake.primaryComplaint')} *
            </label>
            <textarea
              id="primaryComplaint"
              rows={networkQuality === 'poor' ? 3 : 4} // Reduce rows for poor connections
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-base sm:text-sm"
              placeholder={t('symptomIntake.primaryComplaintPlaceholder')}
              {...register('primaryComplaint', {
                required: t('symptomIntake.validation.primaryComplaintRequired'),
                minLength: { value: 10, message: 'Please provide more detail about your symptoms' },
              })}
            />
            {errors.primaryComplaint && (
              <p className="mt-1 text-sm text-red-600">{errors.primaryComplaint.message}</p>
            )}
          </div>
        </ProgressiveLoader>

        {/* Duration */}
        <ProgressiveLoader priority="high">
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
              {t('symptomIntake.duration')} *
            </label>
            <select
              id="duration"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-base sm:text-sm"
              {...register('duration', {
                required: t('symptomIntake.validation.durationRequired'),
              })}
            >
              <option value="">Select duration...</option>
              {durationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.duration && (
              <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
            )}
          </div>
        </ProgressiveLoader>

        {/* Severity */}
        <ProgressiveLoader priority="high">
          <div>
            <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-2">
              {t('symptomIntake.severity')} *
            </label>
            <div className="space-y-2">
              <input
                type="range"
                id="severity"
                min="1"
                max="10"
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                {...register('severity', {
                  required: t('symptomIntake.validation.severityRequired'),
                  min: { value: 1, message: t('symptomIntake.validation.severityRange') },
                  max: { value: 10, message: t('symptomIntake.validation.severityRange') },
                  valueAsNumber: true,
                })}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1 (Mild)</span>
                {severity && (
                  <span className="font-medium text-gray-700">Current: {severity}</span>
                )}
                <span>10 (Severe)</span>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">{t('symptomIntake.severityScale')}</p>
            {errors.severity && (
              <p className="mt-1 text-sm text-red-600">{errors.severity.message}</p>
            )}
          </div>
        </ProgressiveLoader>

        {/* Associated Symptoms - Lower priority for poor connections */}
        <ProgressiveLoader priority={networkQuality === 'poor' ? 'low' : 'medium'}>
          <div>
            <label htmlFor="associatedSymptoms" className="block text-sm font-medium text-gray-700 mb-2">
              {t('symptomIntake.associatedSymptoms')}
            </label>
            <textarea
              id="associatedSymptoms"
              rows={networkQuality === 'poor' ? 2 : 3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-base sm:text-sm"
              placeholder={t('symptomIntake.associatedSymptomsPlaceholder')}
              {...register('associatedSymptoms')}
            />
          </div>
        </ProgressiveLoader>

        {/* Medical History - Lower priority for poor connections */}
        <ProgressiveLoader priority={networkQuality === 'poor' ? 'low' : 'medium'}>
          <div>
            <label htmlFor="medicalHistory" className="block text-sm font-medium text-gray-700 mb-2">
              {t('symptomIntake.medicalHistory')}
            </label>
            <textarea
              id="medicalHistory"
              rows={networkQuality === 'poor' ? 2 : 3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-base sm:text-sm"
              placeholder={t('symptomIntake.medicalHistoryPlaceholder')}
              {...register('medicalHistory')}
            />
          </div>
        </ProgressiveLoader>

        {/* Submit Error */}
        {submitError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* Offline Notice */}
        {!isOnline && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-700">
              {t('offline.message')}
            </p>
          </div>
        )}

        {/* Data Usage Warning */}
        {bandwidthService.isDataLimitExceeded() && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
            <p className="text-sm text-orange-700">
              Data usage limit exceeded. Only essential features are available.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-3 bg-primary-600 text-white font-medium rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-sm"
          >
            {isSubmitting ? t('common.loading') : t('common.submit')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SymptomIntakeForm;