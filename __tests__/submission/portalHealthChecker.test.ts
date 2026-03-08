/**
 * Tests for PortalHealthChecker
 * 
 * Tests the defensive portal monitoring system
 */

import { PortalHealthChecker } from '@/services/testing/portalHealthChecker';
import { TestEnvironment } from '@/utils/testHelpers';

// Mock fetch for testing
declare var global: any;
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('PortalHealthChecker', () => {
  let healthChecker: PortalHealthChecker;
  let networkSim: ReturnType<typeof TestEnvironment.simulateNetwork> | undefined;

  beforeEach(() => {
    healthChecker = new PortalHealthChecker({
      timeoutMs: 1000 // Faster timeouts for testing
    });
    
    // Reset fetch mock
    mockFetch.mockReset();
  });

  afterEach(() => {
    healthChecker.clearHistory();
    if (networkSim) {
      networkSim.restore();
    }
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const checker = new PortalHealthChecker();
      expect(checker).toBeInstanceOf(PortalHealthChecker);
    });

    it('should accept custom config', () => {
      const checker = new PortalHealthChecker({
        timeoutMs: 5000,
        maxRetries: 5
      });
      expect(checker).toBeInstanceOf(PortalHealthChecker);
    });
  });

  describe('checkPortalHealth', () => {
    it('should detect healthy portal', async () => {
      mockFetch
        .mockResolvedValueOnce(new Response(null, { status: 200 })) // HEAD request
        .mockResolvedValueOnce(new Response('<html><body>Portal</body></html>', { 
          status: 200,
          headers: { 'content-type': 'text/html' }
        })); // GET request

      const result = await healthChecker.checkPortalHealth(
        'JPN',
        'Visit Japan Web',
        'https://vjw-lp.digital.go.jp/en/'
      );

      expect(result.status).toBe('healthy');
      expect(result.metadata.canConnect).toBe(true);
      expect(result.metadata.sslValid).toBe(true);
      expect(result.metadata.expectedElements).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should detect offline portal', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await healthChecker.checkPortalHealth(
        'JPN',
        'Visit Japan Web',
        'https://vjw-lp.digital.go.jp/en/'
      );

      expect(result.status).toBe('offline');
      expect(result.metadata.canConnect).toBe(false);
      expect(result.issues.some(issue => issue.type === 'connection_timeout')).toBe(true);
    });

    it('should detect HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }));

      const result = await healthChecker.checkPortalHealth(
        'JPN',
        'Visit Japan Web',
        'https://vjw-lp.digital.go.jp/en/'
      );

      expect(result.status).toBe('error');
      expect(result.metadata.httpStatus).toBe(500);
      expect(result.issues.some(issue => issue.type === 'http_error')).toBe(true);
    });

    it('should detect slow response times', async () => {
      // Simulate slow response
      mockFetch
        .mockImplementation(() => new Promise(resolve => 
          setTimeout(() => resolve(new Response(null, { status: 200 })), 100)
        ));

      const checker = new PortalHealthChecker({
        timeoutMs: 10000,
        expectedResponseTimeMs: 50 // Very low threshold for testing
      });

      const result = await checker.checkPortalHealth(
        'JPN',
        'Visit Japan Web',
        'https://vjw-lp.digital.go.jp/en/'
      );

      expect(result.status).toBe('degraded');
      expect(result.issues.some(issue => issue.type === 'slow_response')).toBe(true);
    });

    it('should validate SSL security', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));

      const result = await healthChecker.checkPortalHealth(
        'JPN',
        'Visit Japan Web',
        'http://insecure-portal.com/' // Non-HTTPS URL
      );

      expect(result.metadata.sslValid).toBe(false);
    });

    it('should detect invalid content type', async () => {
      mockFetch
        .mockResolvedValueOnce(new Response(null, { status: 200 })) // HEAD request
        .mockResolvedValueOnce(new Response('{"error": "not html"}', { 
          status: 200,
          headers: { 'content-type': 'application/json' }
        })); // GET request returns JSON instead of HTML

      const result = await healthChecker.checkPortalHealth(
        'JPN',
        'Visit Japan Web',
        'https://vjw-lp.digital.go.jp/en/'
      );

      expect(result.metadata.expectedElements).toBe(false);
      expect(result.issues.some(issue => issue.type === 'structure_changed')).toBe(true);
    });

    it('should handle timeouts gracefully', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 2000)
        )
      );

      const checker = new PortalHealthChecker({ timeoutMs: 500 });

      const result = await checker.checkPortalHealth(
        'JPN',
        'Visit Japan Web',
        'https://vjw-lp.digital.go.jp/en/'
      );

      expect(result.status).toBe('offline');
      expect(result.issues.some(issue => issue.type === 'connection_timeout')).toBe(true);
    });
  });

  describe('health history tracking', () => {
    it('should track health history', async () => {
      mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

      await healthChecker.checkPortalHealth('JPN', 'Test Portal', 'https://test.com');
      await healthChecker.checkPortalHealth('JPN', 'Test Portal', 'https://test.com');

      const history = healthChecker.getHealthHistory('JPN');
      expect(history).toHaveLength(2);
    });

    it('should get latest health status', async () => {
      mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

      await healthChecker.checkPortalHealth('JPN', 'Test Portal', 'https://test.com');
      
      const latest = healthChecker.getLatestHealthStatus('JPN');
      expect(latest).toBeDefined();
      expect(latest!.countryCode).toBe('JPN');
    });

    it('should limit history entries', async () => {
      mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

      // Add more than the limit (100 entries)
      for (let i = 0; i < 110; i++) {
        await healthChecker.checkPortalHealth('JPN', 'Test Portal', 'https://test.com');
      }

      const history = healthChecker.getHealthHistory('JPN');
      expect(history.length).toBeLessThanOrEqual(100);
    });

    it('should check consistent health', async () => {
      mockFetch.mockResolvedValue(new Response('<html></html>', { 
        status: 200,
        headers: { 'content-type': 'text/html' }
      }));

      // Add multiple healthy checks
      for (let i = 0; i < 5; i++) {
        await healthChecker.checkPortalHealth('JPN', 'Test Portal', 'https://test.com');
      }

      const isConsistent = healthChecker.isPortalConsistentlyHealthy('JPN', 1);
      expect(isConsistent).toBe(true);
    });

    it('should detect inconsistent health', async () => {
      // First check healthy
      mockFetch.mockResolvedValueOnce(new Response('<html></html>', { 
        status: 200,
        headers: { 'content-type': 'text/html' }
      }));
      await healthChecker.checkPortalHealth('JPN', 'Test Portal', 'https://test.com');

      // Second check unhealthy
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }));
      await healthChecker.checkPortalHealth('JPN', 'Test Portal', 'https://test.com');

      const isConsistent = healthChecker.isPortalConsistentlyHealthy('JPN', 1);
      expect(isConsistent).toBe(false);
    });
  });

  describe('health summary', () => {
    beforeEach(async () => {
      // Create a new health checker with custom timeout for degraded status
      const testChecker = new PortalHealthChecker({ expectedResponseTimeMs: 50 });
      
      // Healthy portal
      mockFetch.mockResolvedValueOnce(new Response('<html></html>', { 
        status: 200,
        headers: { 'content-type': 'text/html' }
      }));
      await testChecker.checkPortalHealth('JPN', 'Test Portal 1', 'https://test1.com');
      
      // Degraded portal (slow response)
      mockFetch
        .mockImplementationOnce(() => new Promise(resolve => 
          setTimeout(() => resolve(new Response(null, { status: 200 })), 60)
        )) // HEAD request (slow)
        .mockImplementationOnce(() => new Promise(resolve => 
          setTimeout(() => resolve(new Response('<html></html>', { 
            status: 200,
            headers: { 'content-type': 'text/html' }
          })), 60)
        )); // GET request (slow)
      await testChecker.checkPortalHealth('MYS', 'Test Portal 2', 'https://test2.com');

      // Offline portal
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
      await testChecker.checkPortalHealth('SGP', 'Test Portal 3', 'https://test3.com');
      
      // Copy all results to main healthChecker for the test
      (healthChecker as any)['healthHistory'] = (testChecker as any)['healthHistory'];
    });

    it('should generate health summary', () => {
      const summary = healthChecker.getHealthSummary();

      expect(summary.totalPortals).toBeGreaterThan(0);
      expect(summary.healthy + summary.degraded + summary.offline + summary.error).toBe(summary.totalPortals);
      expect(typeof summary.healthy).toBe('number');
      expect(typeof summary.degraded).toBe('number');
      expect(typeof summary.offline).toBe('number');
      expect(typeof summary.error).toBe('number');
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await healthChecker.checkPortalHealth(
        'JPN',
        'Test Portal',
        'https://test.com'
      );

      expect(result.status).toBe('offline');
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should handle malformed URLs', async () => {
      const result = await healthChecker.checkPortalHealth(
        'JPN',
        'Test Portal',
        'not-a-url'
      );

      expect(result.status).toBe('offline');
      expect(result.metadata.canConnect).toBe(false);
    });

    it('should provide meaningful error messages', async () => {
      mockFetch.mockRejectedValue(new Error('DNS resolution failed'));

      const result = await healthChecker.checkPortalHealth(
        'JPN',
        'Test Portal',
        'https://test.com'
      );

      expect(result.issues[0].message).toContain('Cannot connect to Test Portal');
    });
  });

  describe('issue severity calculation', () => {
    it('should mark critical issues as offline', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await healthChecker.checkPortalHealth(
        'JPN',
        'Test Portal',
        'https://test.com'
      );

      const criticalIssue = result.issues.find(issue => issue.severity === 'critical');
      expect(criticalIssue).toBeDefined();
      expect(result.status).toBe('offline');
    });

    it('should mark HTTP errors as error status', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

      const result = await healthChecker.checkPortalHealth(
        'JPN',
        'Test Portal',
        'https://test.com'
      );

      expect(result.status).toBe('error');
      expect(result.issues.some(issue => issue.type === 'http_error')).toBe(true);
    });

    it('should mark warnings as degraded', async () => {
      // Both HEAD and GET requests should be slow to exceed total response time
      mockFetch
        .mockImplementationOnce(() => new Promise(resolve => 
          setTimeout(() => resolve(new Response(null, { status: 200 })), 60)
        )) // HEAD request (slow)
        .mockImplementationOnce(() => new Promise(resolve => 
          setTimeout(() => resolve(new Response('<html></html>', { 
            status: 200,
            headers: { 'content-type': 'text/html' }
          })), 60)
        )); // GET request (slow)

      const checker = new PortalHealthChecker({ expectedResponseTimeMs: 50 });

      const result = await checker.checkPortalHealth(
        'JPN',
        'Test Portal',
        'https://test.com'
      );

      expect(result.status).toBe('degraded');
      expect(result.issues.some(issue => issue.severity === 'warning')).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle government portal responses', async () => {
      // Simulate a typical government portal response
      mockFetch
        .mockResolvedValueOnce(new Response(null, { 
          status: 200,
          headers: { 'server': 'nginx' }
        }))
        .mockResolvedValueOnce(new Response(`
          <!DOCTYPE html>
          <html>
            <head><title>Government Portal</title></head>
            <body>
              <form id="declaration-form">
                <input name="passport" />
                <input name="arrival-date" />
              </form>
            </body>
          </html>
        `, { 
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' }
        }));

      const result = await healthChecker.checkPortalHealth(
        'JPN',
        'Visit Japan Web',
        'https://vjw-lp.digital.go.jp/en/'
      );

      expect(result.status).toBe('healthy');
      expect(result.metadata.expectedElements).toBe(true);
    });

    it('should handle maintenance pages', async () => {
      mockFetch
        .mockResolvedValueOnce(new Response(null, { status: 503 }));

      const result = await healthChecker.checkPortalHealth(
        'JPN',
        'Visit Japan Web',
        'https://vjw-lp.digital.go.jp/en/'
      );

      expect(result.status).toBe('error');
      expect(result.metadata.httpStatus).toBe(503);
      expect(result.issues.some(issue => issue.type === 'http_error')).toBe(true);
    });

    it('should handle redirects appropriately', async () => {
      mockFetch
        .mockResolvedValueOnce(new Response(null, { 
          status: 302,
          headers: { 'location': 'https://new-portal.gov/en/' }
        }));

      const result = await healthChecker.checkPortalHealth(
        'JPN',
        'Visit Japan Web',
        'https://vjw-lp.digital.go.jp/en/'
      );

      expect(result.status).toBe('error');
      expect(result.metadata.httpStatus).toBe(302);
    });
  });
});