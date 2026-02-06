/**
 * Tests for bandwidth optimization features
 * Validates Requirements 8.2: Low-bandwidth optimization
 */

import { bandwidthService } from '../services/bandwidth';

// Mock navigator.connection for testing
const mockConnection = {
  effectiveType: '4g',
  downlink: 10,
  rtt: 100,
  saveData: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(navigator, 'connection', {
  value: mockConnection,
  writable: true,
});

// Create a new instance for each test to avoid state pollution
const createFreshBandwidthService = () => {
  // Clear the module cache to get a fresh instance
  jest.resetModules();
  return require('../services/bandwidth').bandwidthService;
};

describe('Bandwidth Optimization Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    // Reset connection to default values
    mockConnection.effectiveType = '4g';
    mockConnection.downlink = 10;
    mockConnection.rtt = 100;
    mockConnection.saveData = false;
  });

  describe('Network Quality Detection', () => {
    test('should detect poor network quality', () => {
      mockConnection.effectiveType = 'slow-2g';
      mockConnection.downlink = 0.3;
      mockConnection.rtt = 2500;

      const service = createFreshBandwidthService();
      const quality = service.getNetworkQuality();
      expect(quality).toBe('poor');
    });

    test('should detect moderate network quality', () => {
      mockConnection.effectiveType = '2g';
      mockConnection.downlink = 1.0;
      mockConnection.rtt = 1200;

      const service = createFreshBandwidthService();
      const quality = service.getNetworkQuality();
      expect(quality).toBe('moderate');
    });

    test('should detect good network quality', () => {
      mockConnection.effectiveType = '3g';
      mockConnection.downlink = 3.0;
      mockConnection.rtt = 600;

      const service = createFreshBandwidthService();
      const quality = service.getNetworkQuality();
      expect(quality).toBe('good');
    });

    test('should detect excellent network quality', () => {
      mockConnection.effectiveType = '4g';
      mockConnection.downlink = 10;
      mockConnection.rtt = 50;

      const service = createFreshBandwidthService();
      const quality = service.getNetworkQuality();
      expect(quality).toBe('excellent');
    });
  });

  describe('Data Compression', () => {
    test('should compress JSON data effectively', () => {
      const testData = {
        patientId: 'test-123',
        episodeId: 'episode-456',
        primaryComplaint: 'Headache and fever',
        urgencyLevel: 'urgent',
        timestamp: '2024-01-01T00:00:00Z',
      };

      const compressed = bandwidthService.compressData(testData, { level: 'high' });
      const original = JSON.stringify(testData);

      expect(compressed.length).toBeLessThan(original.length);
      expect(compressed).toContain('"pid"'); // patientId should be compressed
      expect(compressed).toContain('"eid"'); // episodeId should be compressed
      expect(compressed).toContain('"u"'); // urgent should be compressed
    });

    test('should decompress data correctly', () => {
      const testData = {
        patientId: 'test-123',
        episodeId: 'episode-456',
        urgencyLevel: 'emergency',
      };

      const compressed = bandwidthService.compressData(testData, { level: 'high' });
      const decompressed = bandwidthService.decompressData(compressed);

      expect(decompressed).toEqual(testData);
    });

    test('should handle decompression errors gracefully', () => {
      const invalidData = 'invalid-json-data';
      const result = bandwidthService.decompressData(invalidData);
      expect(result).toBeNull();
    });
  });

  describe('Loading Strategies', () => {
    test('should provide appropriate loading strategy for poor connection', () => {
      mockConnection.effectiveType = 'slow-2g';
      mockConnection.saveData = true;

      const service = createFreshBandwidthService();
      const strategy = service.getLoadingStrategy('images');

      expect(strategy.priority).toBe('low');
      expect(strategy.defer).toBe(true);
      expect(strategy.lazy).toBe(true);
      expect(strategy.preload).toBe(false);
    });

    test('should provide appropriate loading strategy for excellent connection', () => {
      mockConnection.effectiveType = '4g';
      mockConnection.downlink = 15;
      mockConnection.saveData = false;

      const service = createFreshBandwidthService();
      const strategy = service.getLoadingStrategy('critical');

      expect(strategy.priority).toBe('critical');
      expect(strategy.defer).toBe(false);
      expect(strategy.lazy).toBe(false);
      expect(strategy.preload).toBe(true);
    });

    test('should adjust strategy for data saver mode', () => {
      mockConnection.effectiveType = '4g';
      mockConnection.saveData = true;

      const service = createFreshBandwidthService();
      const strategy = service.getLoadingStrategy('images');

      expect(strategy.priority).toBe('low');
      expect(strategy.defer).toBe(true);
      expect(strategy.lazy).toBe(true);
      expect(strategy.preload).toBe(false);
    });
  });

  describe('Image Optimization', () => {
    test('should provide low quality settings for poor connection', () => {
      mockConnection.effectiveType = 'slow-2g';
      mockConnection.saveData = true;

      const service = createFreshBandwidthService();
      const optimization = service.getImageOptimization();

      expect(optimization.quality).toBeLessThanOrEqual(40);
      expect(optimization.format).toBe('webp');
      expect(optimization.lazy).toBe(true);
      expect(optimization.placeholder).toBe(true);
    });

    test('should provide high quality settings for excellent connection', () => {
      mockConnection.effectiveType = '4g';
      mockConnection.downlink = 20;
      mockConnection.saveData = false;

      const service = createFreshBandwidthService();
      const optimization = service.getImageOptimization();

      expect(optimization.quality).toBe(85);
      expect(optimization.format).toBe('webp');
      expect(optimization.lazy).toBe(false);
      expect(optimization.placeholder).toBe(false);
    });
  });

  describe('Data Usage Tracking', () => {
    test('should track data usage correctly', () => {
      const testSize = 1024; // 1KB
      bandwidthService.trackDataUsage(testSize);

      const usage = bandwidthService.getDataUsage();
      expect(usage.session).toBeGreaterThanOrEqual(testSize);
    });

    test('should detect when data limit is exceeded', () => {
      const largeSize = 60 * 1024 * 1024; // 60MB
      bandwidthService.trackDataUsage(largeSize);

      const isExceeded = bandwidthService.isDataLimitExceeded(50); // 50MB limit
      expect(isExceeded).toBe(true);
    });

    test('should reset data usage correctly', () => {
      bandwidthService.trackDataUsage(1024);
      bandwidthService.resetDataUsage();

      const usage = bandwidthService.getDataUsage();
      expect(usage.total).toBe(0);
    });
  });

  describe('Cache Strategies', () => {
    test('should provide long cache duration for poor connections', () => {
      mockConnection.effectiveType = 'slow-2g';

      const service = createFreshBandwidthService();
      const strategy = service.getCacheStrategy();

      expect(strategy.maxAge).toBe(7 * 24 * 60 * 60); // 7 days
      expect(strategy.cacheFirst).toBe(true);
      expect(strategy.networkFirst).toBe(false);
    });

    test('should provide short cache duration for excellent connections', () => {
      mockConnection.effectiveType = '4g';
      mockConnection.downlink = 20;

      const service = createFreshBandwidthService();
      const strategy = service.getCacheStrategy();

      expect(strategy.maxAge).toBe(12 * 60 * 60); // 12 hours
      expect(strategy.cacheFirst).toBe(false);
      expect(strategy.networkFirst).toBe(true);
    });
  });

  describe('Network-Aware Timeouts', () => {
    test('should provide longer timeouts for poor connections', () => {
      mockConnection.effectiveType = 'slow-2g';

      const service = createFreshBandwidthService();
      const timeouts = service.getTimeouts();

      expect(timeouts.request).toBe(30000); // 30 seconds
      expect(timeouts.retry).toBe(5000); // 5 seconds
    });

    test('should provide shorter timeouts for excellent connections', () => {
      mockConnection.effectiveType = '4g';
      mockConnection.downlink = 20;

      const service = createFreshBandwidthService();
      const timeouts = service.getTimeouts();

      expect(timeouts.request).toBe(10000); // 10 seconds
      expect(timeouts.retry).toBe(1000); // 1 second
    });
  });

  describe('Data Size Estimation', () => {
    test('should estimate string data size correctly', () => {
      const testString = 'Hello, World!';
      const size = bandwidthService.estimateDataSize(testString);
      expect(size).toBeGreaterThan(0);
      expect(size).toBe(new Blob([testString]).size);
    });

    test('should estimate object data size correctly', () => {
      const testObject = { name: 'test', value: 123 };
      const size = bandwidthService.estimateDataSize(testObject);
      expect(size).toBeGreaterThan(0);
      expect(size).toBe(new Blob([JSON.stringify(testObject)]).size);
    });
  });

  describe('Preload Decisions', () => {
    test('should not preload on poor connections', () => {
      mockConnection.effectiveType = 'slow-2g';
      mockConnection.saveData = true;

      const service = createFreshBandwidthService();
      const shouldPreload = service.shouldPreload('images');
      expect(shouldPreload).toBe(false);
    });

    test('should preload critical content on good connections', () => {
      mockConnection.effectiveType = '4g';
      mockConnection.saveData = false;

      const service = createFreshBandwidthService();
      const shouldPreload = service.shouldPreload('critical');
      expect(shouldPreload).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  test('should adapt all strategies consistently for poor network', () => {
    mockConnection.effectiveType = 'slow-2g';
    mockConnection.downlink = 0.2;
    mockConnection.rtt = 3000;
    mockConnection.saveData = true;

    const service = createFreshBandwidthService();
    const quality = service.getNetworkQuality();
    const loadingStrategy = service.getLoadingStrategy('images');
    const imageOptimization = service.getImageOptimization();
    const cacheStrategy = service.getCacheStrategy();
    const timeouts = service.getTimeouts();

    // All strategies should be optimized for poor connection
    expect(quality).toBe('poor');
    expect(loadingStrategy.lazy).toBe(true);
    expect(loadingStrategy.preload).toBe(false);
    expect(imageOptimization.quality).toBeLessThanOrEqual(40);
    expect(imageOptimization.lazy).toBe(true);
    expect(cacheStrategy.cacheFirst).toBe(true);
    expect(cacheStrategy.maxAge).toBeGreaterThan(24 * 60 * 60); // More than 1 day
    expect(timeouts.request).toBeGreaterThan(20000); // More than 20 seconds
  });

  test('should adapt all strategies consistently for excellent network', () => {
    mockConnection.effectiveType = '4g';
    mockConnection.downlink = 25;
    mockConnection.rtt = 30;
    mockConnection.saveData = false;

    const service = createFreshBandwidthService();
    const quality = service.getNetworkQuality();
    const loadingStrategy = service.getLoadingStrategy('images');
    const imageOptimization = service.getImageOptimization();
    const cacheStrategy = service.getCacheStrategy();
    const timeouts = service.getTimeouts();

    // All strategies should be optimized for excellent connection
    expect(quality).toBe('excellent');
    expect(loadingStrategy.lazy).toBe(false);
    expect(loadingStrategy.preload).toBe(true);
    expect(imageOptimization.quality).toBe(85);
    expect(imageOptimization.lazy).toBe(false);
    expect(cacheStrategy.networkFirst).toBe(true);
    expect(cacheStrategy.maxAge).toBeLessThan(24 * 60 * 60); // Less than 1 day
    expect(timeouts.request).toBeLessThan(15000); // Less than 15 seconds
  });
});