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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {t('symptomIntake.title')}
            </h1>
            <p className="text-lg text-gray-600">
              {t('symptomIntake.subtitle')}
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <SymptomIntakeForm />
          </div>
        </div>
      </Layout>
    </>
  );
};

export default SymptomIntakePage;