import React from 'react';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout/Layout';
import SymptomIntakeForm from '@/components/SymptomIntake/SymptomIntakeForm';

const SymptomIntakePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <Head>
        <title>{t('symptomIntake.title')} - Healthcare OS</title>
        <meta name="description" content="Report your symptoms and get personalized care recommendations" />
      </Head>

      <Layout>
        <div className="w-full bg-white min-h-screen pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8 lg:mb-12">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">
                {t('symptomIntake.title')}
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
                {t('symptomIntake.subtitle')}
              </p>
            </div>

            {/* Form */}
            <div className="bg-white rounded-lg sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
              <SymptomIntakeForm />
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default SymptomIntakePage;