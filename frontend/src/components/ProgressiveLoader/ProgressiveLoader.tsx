import React, { useState, useEffect, useRef } from 'react';
import { bandwidthService } from '@/services/bandwidth';

interface ProgressiveLoaderProps {
  children: React.ReactNode;
  priority: 'critical' | 'high' | 'medium' | 'low';
  placeholder?: React.ReactNode;
  className?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: 'high' | 'medium' | 'low';
  placeholder?: string;
}

/**
 * Progressive loader component that adapts loading behavior based on network conditions
 */
export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  children,
  priority,
  placeholder,
  className = '',
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadingStrategy = bandwidthService.getLoadingStrategy(
      priority === 'critical' ? 'critical' : 'assets'
    );

    // Immediate load for critical content or good connections
    if (priority === 'critical' || loadingStrategy.preload) {
      setShouldLoad(true);
      return;
    }

    // Lazy loading for non-critical content
    if (loadingStrategy.lazy && elementRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observerRef.current?.disconnect();
          }
        },
        {
          rootMargin: '50px', // Start loading 50px before element comes into view
          threshold: 0.1,
        }
      );

      observerRef.current.observe(elementRef.current);
    } else {
      // Load immediately if not lazy loading
      setShouldLoad(true);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority]);

  useEffect(() => {
    if (shouldLoad && !isLoaded && !hasError) {
      // Simulate loading process
      const loadContent = async () => {
        try {
          // Add artificial delay for demonstration
          const networkQuality = bandwidthService.getNetworkQuality();
          const delay = {
            poor: 2000,
            moderate: 1000,
            good: 500,
            excellent: 100,
          }[networkQuality];

          await new Promise(resolve => setTimeout(resolve, delay));
          
          setIsLoaded(true);
          onLoad?.();
        } catch (error) {
          setHasError(true);
          onError?.(error as Error);
        }
      };

      loadContent();
    }
  }, [shouldLoad, isLoaded, hasError, onLoad, onError]);

  if (hasError) {
    return (
      <div className={`progressive-loader error ${className}`} ref={elementRef}>
        <div className="error-message">
          <p>Failed to load content</p>
          <button 
            onClick={() => {
              setHasError(false);
              setShouldLoad(true);
            }}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!shouldLoad || !isLoaded) {
    return (
      <div className={`progressive-loader loading ${className}`} ref={elementRef}>
        {placeholder || <LoadingPlaceholder priority={priority} />}
      </div>
    );
  }

  return (
    <div className={`progressive-loader loaded ${className}`} ref={elementRef}>
      {children}
    </div>
  );
};

/**
 * Progressive image component with bandwidth-aware optimization
 */
export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className = '',
  priority = 'medium',
  placeholder,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const imageOptimization = bandwidthService.getImageOptimization();
    const loadingStrategy = bandwidthService.getLoadingStrategy('images');

    // Generate optimized image URL based on network conditions
    const optimizedSrc = generateOptimizedImageUrl(src, {
      quality: imageOptimization.quality,
      format: imageOptimization.format,
    });

    if (loadingStrategy.preload && priority === 'high') {
      // Preload high priority images
      const img = new Image();
      img.onload = () => {
        setCurrentSrc(optimizedSrc);
        setIsLoaded(true);
      };
      img.onerror = () => setHasError(true);
      img.src = optimizedSrc;
    } else if (loadingStrategy.lazy) {
      // Lazy load images
      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            setCurrentSrc(optimizedSrc);
            observer.disconnect();
          }
        },
        { rootMargin: '50px' }
      );

      if (imgRef.current) {
        observer.observe(imgRef.current);
      }

      return () => observer.disconnect();
    } else {
      setCurrentSrc(optimizedSrc);
    }
  }, [src, priority]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    // Fallback to original image
    if (currentSrc !== src) {
      setCurrentSrc(src);
      setHasError(false);
    }
  };

  if (hasError) {
    return (
      <div className={`progressive-image error ${className}`}>
        <div className="image-error-placeholder">
          <span>Image failed to load</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`progressive-image ${isLoaded ? 'loaded' : 'loading'} ${className}`}>
      {!isLoaded && (
        <div className="image-placeholder">
          {placeholder || <ImagePlaceholder />}
        </div>
      )}
      {currentSrc && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
          }}
        />
      )}
    </div>
  );
};

/**
 * Loading placeholder component
 */
const LoadingPlaceholder: React.FC<{ priority: string }> = ({ priority }) => {
  const networkQuality = bandwidthService.getNetworkQuality();
  
  return (
    <div className="loading-placeholder">
      <div className="loading-skeleton">
        <div className="skeleton-line"></div>
        <div className="skeleton-line short"></div>
        {priority === 'critical' && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Loading...</span>
          </div>
        )}
        {networkQuality === 'poor' && (
          <div className="network-notice">
            <span>Optimizing for slow connection...</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Image placeholder component
 */
const ImagePlaceholder: React.FC = () => {
  return (
    <div className="image-placeholder-content">
      <div className="image-skeleton"></div>
    </div>
  );
};

/**
 * Generate optimized image URL based on network conditions
 */
function generateOptimizedImageUrl(
  src: string, 
  options: { quality: number; format: string }
): string {
  // This would typically integrate with a CDN or image optimization service
  // For now, we'll return the original URL with query parameters
  const url = new URL(src, window.location.origin);
  url.searchParams.set('quality', options.quality.toString());
  url.searchParams.set('format', options.format);
  return url.toString();
}

export default ProgressiveLoader;