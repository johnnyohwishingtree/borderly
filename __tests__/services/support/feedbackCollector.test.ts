import { feedbackCollector } from '@/services/support/feedbackCollector';
import { mmkvService } from '@/services/storage';

// Mock MMKV service
jest.mock('@/services/storage', () => ({
  mmkvService: {
    getString: jest.fn(),
    setString: jest.fn(),
  },
}));

// Mock stores
jest.mock('@/stores/useAppStore', () => ({
  useAppStore: {
    getState: jest.fn(() => ({
      preferences: {
        language: 'en',
        analyticsEnabled: true,
      },
    })),
  },
}));

describe('FeedbackCollector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mmkvService.getString as jest.Mock).mockReturnValue(null);
  });

  describe('submitFeedback', () => {
    it('should successfully submit valid feedback', async () => {
      const feedbackData = {
        type: 'general' as const,
        rating: 4,
        subject: 'Great app',
        message: 'I really like using this app for travel planning.',
      };

      const result = await feedbackCollector.submitFeedback(feedbackData);

      expect(result.success).toBe(true);
      expect(result.feedbackId).toBeDefined();
      expect(mmkvService.setString).toHaveBeenCalled();
    });

    it('should reject feedback with invalid rating', async () => {
      const feedbackData = {
        type: 'general' as const,
        rating: 6, // Invalid rating
        subject: 'Test',
        message: 'Test message',
      };

      const result = await feedbackCollector.submitFeedback(feedbackData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid feedback data');
    });

    it('should reject feedback with empty message', async () => {
      const feedbackData = {
        type: 'general' as const,
        rating: 4,
        subject: 'Test',
        message: '', // Empty message
      };

      const result = await feedbackCollector.submitFeedback(feedbackData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid feedback data');
    });

    it('should reject feedback with message too long', async () => {
      const feedbackData = {
        type: 'general' as const,
        rating: 4,
        subject: 'Test',
        message: 'a'.repeat(1001), // Too long
      };

      const result = await feedbackCollector.submitFeedback(feedbackData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid feedback data');
    });
  });

  describe('getStoredFeedback', () => {
    it('should return empty array when no feedback stored', async () => {
      (mmkvService.getString as jest.Mock).mockReturnValue(null);

      const feedback = await feedbackCollector.getStoredFeedback();

      expect(feedback).toEqual([]);
    });

    it('should return stored feedback when available', async () => {
      const storedFeedback = [
        {
          id: 'test-1',
          type: 'general',
          rating: 5,
          message: 'Great app',
          timestamp: '2024-01-01T00:00:00.000Z',
          metadata: {},
        },
      ];

      (mmkvService.getString as jest.Mock).mockReturnValue(JSON.stringify(storedFeedback));

      const feedback = await feedbackCollector.getStoredFeedback();

      expect(feedback).toEqual(storedFeedback);
    });
  });

  describe('getFeedbackStats', () => {
    it('should calculate correct statistics', async () => {
      const now = new Date('2024-01-01T12:00:00.000Z');
      // Mock Date.now to return our fixed date for recentFeedbackCount calculation
      jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
      const storedFeedback = [
        {
          id: 'test-1',
          type: 'general',
          rating: 5,
          message: 'Great',
          timestamp: now.toISOString(),
        },
        {
          id: 'test-2',
          type: 'feature',
          rating: 3,
          message: 'Okay',
          timestamp: new Date(now.getTime() - 1000 * 60).toISOString(), // 1 minute ago
        },
        {
          id: 'test-3',
          type: 'general',
          rating: 4,
          message: 'Good',
          timestamp: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
        },
      ];

      (mmkvService.getString as jest.Mock).mockReturnValue(JSON.stringify(storedFeedback));

      const stats = await feedbackCollector.getFeedbackStats();

      expect(stats.totalCount).toBe(3);
      expect(stats.averageRating).toBe(4); // (5 + 3 + 4) / 3
      expect(stats.ratingDistribution[3]).toBe(1);
      expect(stats.ratingDistribution[4]).toBe(1);
      expect(stats.ratingDistribution[5]).toBe(1);
      expect(stats.typeDistribution.general).toBe(2);
      expect(stats.typeDistribution.feature).toBe(1);
      expect(stats.recentFeedbackCount).toBe(2); // Only 2 within last 30 days
      
      // Cleanup the Date mock
      jest.restoreAllMocks();
    });
  });
});