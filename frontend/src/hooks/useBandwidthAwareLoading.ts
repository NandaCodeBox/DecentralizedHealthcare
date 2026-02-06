import { useState, useEffect, useCallback, useRef } from 'react';
import { bandwidthService } from '@/services/bandwidth';

interface LoadingOptions {
  priority: 'critical' | 'high' | 'medium' | 'low';
  retries?: number;
  timeout?: number;
  cache?: boolean;
  compress?: boolean;
}

interface LoadingState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  networkQuality: string;
  dataUsage: number;
  fromCache: boolean;
}

/**
 * Hook for bandwidth-aware data loading with automatic optimization
 */
export function useBandwidthAwareLoading<T>(
  loadFunction: () => Promise<T>,
  options: LoadingOptions = { priority: 'medium' }
): LoadingState<T> & {
  reload: () => void;
  cancel: () => void;
} {
  const [state, setState] = useState<LoadingState<T>>({
    data: null,
    loading: false,
    error: null,
    networkQuality: 'moderate',
    dataUsage: 0,
    fromCache: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const load = useCallback(async () => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      networkQuality: bandwidthService.getNetworkQuality(),
    }));

    try {
      const networkQuality = bandwidthService.getNetworkQuality();
      const loadingStrategy = bandwidthService.getLoadingStrategy(
        options.priority === 'critical' ? 'critical' : 'data'
      );

      // Check cache first for non-critical content on poor connections
      if (options.cache && networkQuality === 'poor' && options.priority !== 'critical') {
        const cacheKey = loadFunction.toString();
        const cached = cacheRef.current.get(cacheKey);
        const cacheMaxAge = 5 * 60 * 1000; // 5 minutes

        if (cached && Date.now() - cached.timestamp < cacheMaxAge) {
          setState(prev => ({
            ...prev,
            data: cached.data,
            loading: false,
            fromCache: true,
          }));
          return;
        }
      }

      // Defer loading for low priority content on poor connections
      if (loadingStrategy.defer && options.priority === 'low') {
        const delay = networkQuality === 'poor' ? 5000 : 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Check if request was cancelled during delay
      if (signal.aborted) {
        return;
      }

      const startTime = Date.now();
      const data = await loadFunction();
      const endTime = Date.now();

      // Estimate data usage (rough approximation)
      const estimatedSize = bandwidthService.estimateDataSize(data);
      bandwidthService.trackDataUsage(estimatedSize);

      // Cache successful results
      if (options.cache) {
        const cacheKey = loadFunction.toString();
        cacheRef.current.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }

      setState(prev => ({
        ...prev,
        data,
        loading: false,
        dataUsage: estimatedSize,
        fromCache: false,
      }));

    } catch (error) {
      if (signal.aborted) {
        return; // Request was cancelled
      }

      // Retry logic based on network quality
      const maxRetries = options.retries || (
        bandwidthService.getNetworkQuality() === 'poor' ? 3 : 1
      );

      if (state.error === null && maxRetries > 0) {
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, maxRetries - options.retries!), 10000);
        setTimeout(() => {
          load();
        }, delay);
        return;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error,
      }));
    }
  }, [loadFunction, options]);

  const reload = useCallback(() => {
    load();
  }, [load]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState(prev => ({
        ...prev,
        loading: false,
      }));
    }
  }, []);

  useEffect(() => {
    load();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [load]);

  return {
    ...state,
    reload,
    cancel,
  };
}

/**
 * Hook for progressive data loading with pagination
 */
export function useProgressiveLoading<T>(
  loadFunction: (page: number, limit: number) => Promise<T[]>,
  options: LoadingOptions & { pageSize?: number } = { priority: 'medium' }
) {
  const [items, setItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const networkQuality = bandwidthService.getNetworkQuality();
  const optimalPageSize = options.pageSize || (
    networkQuality === 'poor' ? 5 :
    networkQuality === 'moderate' ? 10 :
    networkQuality === 'good' ? 20 : 50
  );

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const newItems = await loadFunction(page, optimalPageSize);
      
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => [...prev, ...newItems]);
        setPage(prev => prev + 1);
        
        // Track data usage
        const estimatedSize = bandwidthService.estimateDataSize(newItems);
        bandwidthService.trackDataUsage(estimatedSize);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [loadFunction, page, optimalPageSize, loading, hasMore]);

  const reset = useCallback(() => {
    setItems([]);
    setPage(0);
    setHasMore(true);
    setError(null);
  }, []);

  useEffect(() => {
    if (items.length === 0 && hasMore) {
      loadMore();
    }
  }, [loadMore, items.length, hasMore]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    reset,
    networkQuality,
  };
}

/**
 * Hook for bandwidth-aware image loading
 */
export function useBandwidthAwareImage(src: string, options: { priority?: 'high' | 'medium' | 'low' } = {}) {
  const [imageState, setImageState] = useState({
    loaded: false,
    error: false,
    optimizedSrc: src,
  });

  useEffect(() => {
    const imageOptimization = bandwidthService.getImageOptimization();
    const loadingStrategy = bandwidthService.getLoadingStrategy('images');

    // Generate optimized image URL
    let optimizedSrc = src;
    if (src.startsWith('/') || src.includes(window.location.origin)) {
      const url = new URL(src, window.location.origin);
      url.searchParams.set('quality', imageOptimization.quality.toString());
      url.searchParams.set('format', imageOptimization.format);
      optimizedSrc = url.toString();
    }

    setImageState(prev => ({ ...prev, optimizedSrc }));

    // Preload high priority images
    if (options.priority === 'high' && loadingStrategy.preload) {
      const img = new Image();
      img.onload = () => setImageState(prev => ({ ...prev, loaded: true }));
      img.onerror = () => setImageState(prev => ({ ...prev, error: true }));
      img.src = optimizedSrc;
    }
  }, [src, options.priority]);

  return imageState;
}

export default useBandwidthAwareLoading;