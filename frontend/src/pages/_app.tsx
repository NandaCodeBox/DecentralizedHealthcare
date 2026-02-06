import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import '@/styles/globals.css';
import '@/i18n';
import { registerSW } from '@/utils/serviceWorkerRegistration';
import { BandwidthIndicator } from '@/components/BandwidthMonitor/BandwidthMonitor';
import '@/utils/testDataLoader'; // Load test data utilities

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Register enhanced service worker with bandwidth optimization
    registerSW({
      onSuccess: (registration) => {
        console.log('SW registered successfully');
      },
      onUpdate: (registration) => {
        console.log('SW updated, new content available');
        // You could show a toast notification here
      },
      onOfflineReady: () => {
        console.log('App is ready for offline use');
      },
    });

    // Handle PWA install prompt
    let deferredPrompt: any;
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      // You can show your own install button here
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle app state changes for bandwidth optimization
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App is in background, reduce network activity
        console.log('App backgrounded, reducing network activity');
      } else {
        // App is active, resume normal operation
        console.log('App foregrounded, resuming normal operation');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="description" content="AI-enabled decentralized care orchestration system for India's healthcare network" />
        
        {/* PWA meta tags */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Healthcare OS" />
        
        {/* Preconnect to external domains for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        
        {/* DNS prefetch for API endpoints */}
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_BASE_URL} />
        
        {/* Load fonts with display=swap for better performance */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        
        {/* Resource hints for critical resources */}
        <link rel="prefetch" href="/offline-confirmation" />
        <link rel="prefetch" href="/episodes" />
      </Head>
      
      {/* Bandwidth indicator in top-right corner */}
      <div className="fixed top-4 right-4 z-50">
        <BandwidthIndicator />
      </div>
      
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;