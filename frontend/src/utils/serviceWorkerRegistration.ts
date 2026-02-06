/**
 * Enhanced service worker registration with bandwidth optimization
 */

const isLocalhost = () => {
  if (typeof window === 'undefined') return false;
  
  return Boolean(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
  );
};

interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
}

export function registerSW(config?: ServiceWorkerConfig) {
  // Only run on client side
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const publicUrl = new URL(process.env.PUBLIC_URL || '', window.location.href);
  if (publicUrl.origin !== window.location.origin) {
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

    if (isLocalhost()) {
      checkValidServiceWorker(swUrl, config);
      navigator.serviceWorker.ready.then(() => {
        console.log('Service worker is ready for offline use.');
        config?.onOfflineReady?.();
      });
    } else {
      registerValidSW(swUrl, config);
    }
  });
}

function registerValidSW(swUrl: string, config?: ServiceWorkerConfig) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      // Enhanced update detection
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('New content is available; please refresh.');
              config?.onUpdate?.(registration);
            } else {
              console.log('Content is cached for offline use.');
              config?.onSuccess?.(registration);
              config?.onOfflineReady?.();
            }
          }
        });
      });

      // Set up message handling for bandwidth optimization
      setupServiceWorkerMessaging(registration);
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('No internet connection found. App is running in offline mode.');
      config?.onOfflineReady?.();
    });
}

function setupServiceWorkerMessaging(registration: ServiceWorkerRegistration) {
  // Listen for messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    const { type, payload } = event.data;

    switch (type) {
      case 'CACHE_UPDATED':
        console.log('Cache updated:', payload);
        break;
      case 'OFFLINE_FALLBACK':
        console.log('Serving offline fallback for:', payload.url);
        break;
      case 'BANDWIDTH_OPTIMIZED':
        console.log('Response optimized for bandwidth:', payload);
        break;
    }
  });

  // Send network quality information to service worker
  const sendNetworkInfo = () => {
    if (registration.active && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      registration.active.postMessage({
        type: 'NETWORK_INFO',
        payload: {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
        },
      });
    }
  };

  // Send initial network info
  sendNetworkInfo();

  // Update network info when connection changes
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    connection.addEventListener('change', sendNetworkInfo);
  }
}

export function unregister() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

/**
 * Force service worker update
 */
export function updateServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.update();
    });
  }
}

/**
 * Send message to service worker
 */
export function sendMessageToSW(message: any) {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
}

/**
 * Get cache usage information
 */
export async function getCacheUsage(): Promise<{ usage: number; quota: number }> {
  if (typeof window !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    } catch (error) {
      console.error('Failed to get cache usage:', error);
    }
  }
  
  return { usage: 0, quota: 0 };
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
    } catch (error) {
      console.error('Failed to clear caches:', error);
    }
  }
}

/**
 * Preload critical resources
 */
export function preloadCriticalResources(urls: string[]) {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'PRELOAD_RESOURCES',
      payload: { urls },
    });
  }
}