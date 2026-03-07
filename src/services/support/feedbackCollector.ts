import { Platform } from 'react-native';
import { mmkvService } from '@/services/storage';
import { useAppStore } from '@/stores/useAppStore';

export interface FeedbackData {
  id: string;
  type: 'general' | 'feature' | 'ux' | 'country-forms' | 'performance' | 'other';
  rating: number; // 1-5
  subject?: string;
  message: string;
  timestamp: string;
  metadata: {
    appVersion: string;
    platform: string;
    language: string;
    analyticsEnabled: boolean;
    userAgent?: string;
  };
}

export interface FeedbackSubmissionResult {
  success: boolean;
  feedbackId?: string;
  error?: string;
}

class FeedbackCollector {
  private readonly FEEDBACK_STORAGE_KEY = 'stored_feedback';
  private readonly MAX_STORED_FEEDBACK = 50; // Keep last 50 feedback items locally

  /**
   * Submit feedback (locally store for now, can be enhanced to send to server)
   */
  async submitFeedback(feedbackData: Omit<FeedbackData, 'id' | 'timestamp' | 'metadata'>): Promise<FeedbackSubmissionResult> {
    try {
      const feedback: FeedbackData = {
        ...feedbackData,
        id: this.generateFeedbackId(),
        timestamp: new Date().toISOString(),
        metadata: this.collectMetadata(),
      };

      // Validate feedback data
      if (!this.validateFeedback(feedback)) {
        return {
          success: false,
          error: 'Invalid feedback data',
        };
      }

      // Store locally
      await this.storeFeedbackLocally(feedback);

      // In a real implementation, you would also send to a remote service here
      // await this.sendToServer(feedback);

      return {
        success: true,
        feedbackId: feedback.id,
      };
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get stored feedback (for debugging or offline review)
   */
  async getStoredFeedback(): Promise<FeedbackData[]> {
    try {
      const stored = mmkvService.getString(this.FEEDBACK_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored feedback:', error);
      return [];
    }
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(): Promise<{
    totalCount: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
    typeDistribution: Record<string, number>;
    recentFeedbackCount: number; // Last 30 days
  }> {
    try {
      const feedback = await this.getStoredFeedback();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const stats = {
        totalCount: feedback.length,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        typeDistribution: {} as Record<string, number>,
        recentFeedbackCount: feedback.filter(f => f.timestamp >= thirtyDaysAgo).length,
      };

      if (feedback.length > 0) {
        // Calculate average rating
        const totalRating = feedback.reduce((sum, f) => sum + f.rating, 0);
        stats.averageRating = totalRating / feedback.length;

        // Calculate rating distribution
        feedback.forEach(f => {
          stats.ratingDistribution[f.rating]++;
        });

        // Calculate type distribution
        feedback.forEach(f => {
          stats.typeDistribution[f.type] = (stats.typeDistribution[f.type] || 0) + 1;
        });
      }

      return stats;
    } catch (error) {
      console.error('Failed to get feedback stats:', error);
      return {
        totalCount: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        typeDistribution: {},
        recentFeedbackCount: 0,
      };
    }
  }

  /**
   * Clear old feedback (privacy compliance)
   */
  async clearOldFeedback(olderThanDays: number = 90): Promise<void> {
    try {
      const feedback = await this.getStoredFeedback();
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
      
      const recentFeedback = feedback.filter(f => f.timestamp >= cutoffDate);
      
      if (recentFeedback.length < feedback.length) {
        await this.saveStoredFeedback(recentFeedback);
        console.log(`Cleared ${feedback.length - recentFeedback.length} old feedback items`);
      }
    } catch (error) {
      console.error('Failed to clear old feedback:', error);
    }
  }

  /**
   * Export feedback for user (privacy compliance)
   */
  async exportUserFeedback(): Promise<string> {
    try {
      const feedback = await this.getStoredFeedback();
      const exportData = {
        exported_at: new Date().toISOString(),
        total_feedback_count: feedback.length,
        feedback: feedback.map(f => ({
          ...f,
          // Remove any potentially sensitive metadata
          metadata: {
            ...f.metadata,
            userAgent: undefined,
          },
        })),
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export feedback:', error);
      throw error;
    }
  }

  private generateFeedbackId(): string {
    // Generate a more robust ID using current timestamp and crypto-random string
    const timestamp = Date.now().toString(36);
    const randomPart = Array.from({ length: 12 }, () => 
      Math.floor(Math.random() * 36).toString(36)
    ).join('');
    return `feedback_${timestamp}_${randomPart}`;
  }

  private collectMetadata(): FeedbackData['metadata'] {
    // Get app preferences - using direct access to avoid circular imports
    const preferences = useAppStore.getState().preferences;
    
    return {
      appVersion: '1.0.0', // This would come from app config
      platform: Platform.OS,
      language: preferences.language,
      analyticsEnabled: preferences.analyticsEnabled,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };
  }

  private validateFeedback(feedback: FeedbackData): boolean {
    // Basic validation
    if (!feedback.message || feedback.message.trim().length === 0) {
      return false;
    }
    
    if (feedback.rating < 1 || feedback.rating > 5) {
      return false;
    }
    
    if (!feedback.type || !['general', 'feature', 'ux', 'country-forms', 'performance', 'other'].includes(feedback.type)) {
      return false;
    }

    if (feedback.message.length > 1000) {
      return false;
    }

    if (feedback.subject && feedback.subject.length > 100) {
      return false;
    }

    return true;
  }

  private async storeFeedbackLocally(feedback: FeedbackData): Promise<void> {
    try {
      const stored = await this.getStoredFeedback();
      stored.push(feedback);

      // Keep only the most recent feedback items
      while (stored.length > this.MAX_STORED_FEEDBACK) {
        stored.shift(); // Remove oldest
      }

      await this.saveStoredFeedback(stored);
    } catch (error) {
      console.error('Failed to store feedback locally:', error);
      throw error;
    }
  }

  private async saveStoredFeedback(feedback: FeedbackData[]): Promise<void> {
    try {
      mmkvService.setString(this.FEEDBACK_STORAGE_KEY, JSON.stringify(feedback));
    } catch (error) {
      console.error('Failed to save feedback:', error);
      throw error;
    }
  }

  /**
   * Future: Send feedback to remote service
   */
  private async sendToServer(feedback: FeedbackData): Promise<void> {
    // This would be implemented when a backend service is available
    // For MVP, we only store locally
    console.log('Would send feedback to server:', { 
      id: feedback.id, 
      type: feedback.type, 
      rating: feedback.rating 
    });
  }
}

export const feedbackCollector = new FeedbackCollector();