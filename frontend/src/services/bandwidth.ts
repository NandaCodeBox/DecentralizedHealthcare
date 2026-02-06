/**
 * Bandwidth optimization service for low-connectivity scenarios
 * Implements data usage minimization and adaptive loading strategies
 */

interface NetworkInfo {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface CompressionOptions {
  level: 'low' | 'medium' | 'high';
  removeWhitespace: boolean;
  compressImages: boolean;
  minifyJson: boolean;
}

interface LoadingStrategy {
  priority: 'critical' | 'high' | 'medium' | 'low';
  defer: boolean;
  lazy: boolean;
  preload: boolean;
}

class BandwidthOptimizationService {
  private networkInfo: NetworkInfo | null = null;
  private dataUsage: number = 0;
  private readonly DATA_USAGE_KEY = 'healthcare_data_usage';
  private readonly COMPRESSION_CACHE = 'healthcare_compressed_data';

  constructor() {
    this.initializeNetworkMonitoring();
    this.loadDataUsage();
  }

  /**
   * Initialize network monitoring and detection
   */
  private initializeNetworkMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Modern Network Information API
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.networkInfo = {
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        saveData: connection.saveData || false,
      };

      // Listen for network changes
      connection.addEventListener('change', () => {
        this.networkInfo = {
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 100,
          saveData: connection.saveData || false,
        };
      });
    }
  }

  /**
   * Get current network quality assessment
   */
  getNetworkQuality(): 'poor' | 'moderate' | 'good' | 'excellent' {
    if (!this.networkInfo) return 'moderate';

    const { effectiveType, downlink, rtt } = this.networkInfo;

    if (effectiveType === 'slow-2g' || (downlink < 0.5 && rtt > 2000)) {
      return 'poor';
    } else if (effectiveType === '2g' || (downlink < 1.5 && rtt > 1000)) {
      return 'moderate';
    } else if (effectiveType === '3g' || (downlink < 5 && rtt > 500)) {
      return 'good';
    } else {
      return 'excellent';
    }
  }

  /**
   * Check if data saver mode is enabled
   */
  isDataSaverEnabled(): boolean {
    return this.networkInfo?.saveData || false;
  }

  /**
   * Compress data for transmission
   */
  compressData(data: any, options: Partial<CompressionOptions> = {}): string {
    const opts: CompressionOptions = {
      level: 'medium',
      removeWhitespace: true,
      compressImages: false,
      minifyJson: true,
      ...options,
    };

    let jsonString = JSON.stringify(data);

    if (opts.minifyJson) {
      // Remove unnecessary whitespace and formatting
      jsonString = JSON.stringify(JSON.parse(jsonString));
    }

    if (opts.removeWhitespace) {
      // Additional whitespace removal for specific fields
      jsonString = jsonString.replace(/\s+/g, ' ').trim();
    }

    // Simple compression using repeated pattern replacement
    if (opts.level === 'high') {
      jsonString = this.applyAdvancedCompression(jsonString);
    }

    return jsonString;
  }

  /**
   * Apply advanced compression techniques
   */
  private applyAdvancedCompression(data: string): string {
    // Replace common patterns with shorter representations
    const patterns = [
      { pattern: /"timestamp":/g, replacement: '"ts":' },
      { pattern: /"patientId":/g, replacement: '"pid":' },
      { pattern: /"episodeId":/g, replacement: '"eid":' },
      { pattern: /"primaryComplaint":/g, replacement: '"pc":' },
      { pattern: /"associatedSymptoms":/g, replacement: '"as":' },
      { pattern: /"medicalHistory":/g, replacement: '"mh":' },
      { pattern: /"urgencyLevel":/g, replacement: '"ul":' },
      { pattern: /"emergency"/g, replacement: '"e"' },
      { pattern: /"urgent"/g, replacement: '"u"' },
      { pattern: /"routine"/g, replacement: '"r"' },
      { pattern: /"self-care"/g, replacement: '"s"' },
    ];

    let compressed = data;
    patterns.forEach(({ pattern, replacement }) => {
      compressed = compressed.replace(pattern, replacement);
    });

    return compressed;
  }

  /**
   * Decompress data after transmission
   */
  decompressData(compressedData: string): any {
    try {
      // Reverse the compression patterns
      let decompressed = compressedData;
      
      const reversePatterns = [
        { pattern: /"ts":/g, replacement: '"timestamp":' },
        { pattern: /"pid":/g, replacement: '"patientId":' },
        { pattern: /"eid":/g, replacement: '"episodeId":' },
        { pattern: /"pc":/g, replacement: '"primaryComplaint":' },
        { pattern: /"as":/g, replacement: '"associatedSymptoms":' },
        { pattern: /"mh":/g, replacement: '"medicalHistory":' },
        { pattern: /"ul":/g, replacement: '"urgencyLevel":' },
        { pattern: /"e"/g, replacement: '"emergency"' },
        { pattern: /"u"/g, replacement: '"urgent"' },
        { pattern: /"r"/g, replacement: '"routine"' },
        { pattern: /"s"/g, replacement: '"self-care"' },
      ];

      reversePatterns.forEach(({ pattern, replacement }) => {
        decompressed = decompressed.replace(pattern, replacement);
      });

      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Failed to decompress data:', error);
      return null;
    }
  }

  /**
   * Get optimal loading strategy based on network conditions
   */
  getLoadingStrategy(contentType: 'critical' | 'images' | 'data' | 'assets'): LoadingStrategy {
    const networkQuality = this.getNetworkQuality();
    const isDataSaver = this.isDataSaverEnabled();

    const strategies: Record<string, Record<string, LoadingStrategy>> = {
      poor: {
        critical: { priority: 'critical', defer: false, lazy: false, preload: true },
        images: { priority: 'low', defer: true, lazy: true, preload: false },
        data: { priority: 'high', defer: false, lazy: false, preload: false },
        assets: { priority: 'low', defer: true, lazy: true, preload: false },
      },
      moderate: {
        critical: { priority: 'critical', defer: false, lazy: false, preload: true },
        images: { priority: 'medium', defer: true, lazy: true, preload: false },
        data: { priority: 'high', defer: false, lazy: false, preload: false },
        assets: { priority: 'medium', defer: true, lazy: false, preload: false },
      },
      good: {
        critical: { priority: 'critical', defer: false, lazy: false, preload: true },
        images: { priority: 'medium', defer: false, lazy: true, preload: false },
        data: { priority: 'high', defer: false, lazy: false, preload: true },
        assets: { priority: 'medium', defer: false, lazy: false, preload: false },
      },
      excellent: {
        critical: { priority: 'critical', defer: false, lazy: false, preload: true },
        images: { priority: 'high', defer: false, lazy: false, preload: true },
        data: { priority: 'high', defer: false, lazy: false, preload: true },
        assets: { priority: 'high', defer: false, lazy: false, preload: true },
      },
    };

    let strategy = strategies[networkQuality][contentType];

    // Adjust for data saver mode
    if (isDataSaver) {
      strategy = {
        ...strategy,
        priority: strategy.priority === 'critical' ? 'critical' : 'low',
        defer: true,
        lazy: true,
        preload: false,
      };
    }

    return strategy;
  }

  /**
   * Track data usage
   */
  trackDataUsage(bytes: number): void {
    this.dataUsage += bytes;
    this.saveDataUsage();
  }

  /**
   * Get current data usage
   */
  getDataUsage(): { total: number; session: number } {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return {
        total: this.dataUsage,
        session: this.dataUsage,
      };
    }

    const sessionStart = sessionStorage.getItem('session_start');
    const sessionUsage = sessionStart ? 
      this.dataUsage - (parseInt(sessionStart) || 0) : this.dataUsage;

    return {
      total: this.dataUsage,
      session: sessionUsage,
    };
  }

  /**
   * Reset data usage tracking
   */
  resetDataUsage(): void {
    this.dataUsage = 0;
    this.saveDataUsage();
    
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('session_start', '0');
    }
  }

  /**
   * Load data usage from storage
   */
  private loadDataUsage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      this.dataUsage = 0;
      return;
    }

    try {
      const stored = localStorage.getItem(this.DATA_USAGE_KEY);
      this.dataUsage = stored ? parseInt(stored) : 0;
    } catch {
      this.dataUsage = 0;
    }
  }

  /**
   * Save data usage to storage
   */
  private saveDataUsage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.DATA_USAGE_KEY, this.dataUsage.toString());
    } catch (error) {
      console.error('Failed to save data usage:', error);
    }
  }

  /**
   * Get optimized image loading parameters
   */
  getImageOptimization(): {
    quality: number;
    format: 'webp' | 'jpeg' | 'png';
    lazy: boolean;
    placeholder: boolean;
  } {
    const networkQuality = this.getNetworkQuality();
    const isDataSaver = this.isDataSaverEnabled();

    const optimizations = {
      poor: { quality: 30, format: 'webp' as const, lazy: true, placeholder: true },
      moderate: { quality: 50, format: 'webp' as const, lazy: true, placeholder: true },
      good: { quality: 70, format: 'webp' as const, lazy: true, placeholder: false },
      excellent: { quality: 85, format: 'webp' as const, lazy: false, placeholder: false },
    };

    let optimization = optimizations[networkQuality];

    if (isDataSaver) {
      optimization = {
        ...optimization,
        quality: Math.min(optimization.quality, 40),
        lazy: true,
        placeholder: true,
      };
    }

    return optimization;
  }

  /**
   * Determine if content should be preloaded
   */
  shouldPreload(contentType: 'critical' | 'images' | 'data' | 'assets'): boolean {
    const strategy = this.getLoadingStrategy(contentType);
    return strategy.preload && !this.isDataSaverEnabled();
  }

  /**
   * Get cache strategy based on network conditions
   */
  getCacheStrategy(): {
    maxAge: number;
    staleWhileRevalidate: boolean;
    networkFirst: boolean;
    cacheFirst: boolean;
  } {
    const networkQuality = this.getNetworkQuality();

    const strategies = {
      poor: {
        maxAge: 7 * 24 * 60 * 60, // 7 days
        staleWhileRevalidate: true,
        networkFirst: false,
        cacheFirst: true,
      },
      moderate: {
        maxAge: 3 * 24 * 60 * 60, // 3 days
        staleWhileRevalidate: true,
        networkFirst: false,
        cacheFirst: true,
      },
      good: {
        maxAge: 24 * 60 * 60, // 1 day
        staleWhileRevalidate: true,
        networkFirst: true,
        cacheFirst: false,
      },
      excellent: {
        maxAge: 12 * 60 * 60, // 12 hours
        staleWhileRevalidate: false,
        networkFirst: true,
        cacheFirst: false,
      },
    };

    return strategies[networkQuality];
  }

  /**
   * Estimate data size of content
   */
  estimateDataSize(content: any): number {
    if (typeof content === 'string') {
      return new Blob([content]).size;
    } else if (typeof content === 'object') {
      return new Blob([JSON.stringify(content)]).size;
    }
    return 0;
  }

  /**
   * Check if data usage limit is exceeded
   */
  isDataLimitExceeded(limitMB: number = 50): boolean {
    const usage = this.getDataUsage();
    return usage.session > (limitMB * 1024 * 1024);
  }

  /**
   * Get network-aware timeout values
   */
  getTimeouts(): { request: number; retry: number; cache: number } {
    const networkQuality = this.getNetworkQuality();

    const timeouts = {
      poor: { request: 30000, retry: 5000, cache: 60000 },
      moderate: { request: 20000, retry: 3000, cache: 30000 },
      good: { request: 15000, retry: 2000, cache: 15000 },
      excellent: { request: 10000, retry: 1000, cache: 10000 },
    };

    return timeouts[networkQuality];
  }
}

export const bandwidthService = new BandwidthOptimizationService();
export default bandwidthService;