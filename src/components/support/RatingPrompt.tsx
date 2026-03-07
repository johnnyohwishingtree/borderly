import { useState } from 'react';
import { View, Text, Modal, Alert } from 'react-native';
import { Button, Card } from '@/components/ui';
import { feedbackCollector } from '@/services/support/feedbackCollector';

interface RatingPromptProps {
  visible: boolean;
  onClose: () => void;
  trigger?: 'app-usage' | 'form-completion' | 'trip-completion' | 'manual';
  context?: string;
  onFeedbackSubmitted?: () => void;
}

export default function RatingPrompt({ 
  visible, 
  onClose, 
  trigger = 'manual',
  context = '',
  onFeedbackSubmitted 
}: RatingPromptProps) {
  const [rating, setRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false);

  const handleRatingPress = (newRating: number) => {
    setRating(newRating);
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Please Rate', 'Please select a rating before continuing.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await feedbackCollector.submitFeedback({
        type: 'general',
        rating,
        subject: `${trigger} rating - ${context}`.trim(),
        message: `User provided a ${rating}-star rating via ${trigger} prompt.${context ? ` Context: ${context}` : ''}`,
      });

      if (result.success) {
        if (rating <= 3) {
          // Show detailed feedback form for lower ratings
          setShowDetailedFeedback(true);
        } else {
          // Thank user for high rating and close
          Alert.alert(
            'Thank you!',
            'We appreciate your positive feedback! It helps us continue improving Borderly.',
            [{ text: 'OK', onPress: () => {
              onFeedbackSubmitted?.();
              onClose();
            }}]
          );
        }
      } else {
        Alert.alert('Error', 'Failed to submit rating. Please try again.');
      }
    } catch (error) {
      console.error('Failed to submit rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailedFeedbackRequest = () => {
    setShowDetailedFeedback(false);
    onClose();
    // In a real implementation, this would navigate to the detailed feedback screen
    Alert.alert(
      'Detailed Feedback',
      'This would open the detailed feedback screen where you can provide specific suggestions.',
      [{ text: 'OK' }]
    );
    onFeedbackSubmitted?.();
  };

  const handleSkipDetailedFeedback = () => {
    Alert.alert(
      'Thank you!',
      'Thank you for your feedback. We\'ll work on improving your experience.',
      [{ text: 'OK', onPress: () => {
        setShowDetailedFeedback(false);
        onFeedbackSubmitted?.();
        onClose();
      }}]
    );
  };

  const getRatingEmoji = (ratingValue: number) => {
    switch (ratingValue) {
      case 1: return '😞';
      case 2: return '😕';
      case 3: return '😐';
      case 4: return '😊';
      case 5: return '🤩';
      default: return '⭐';
    }
  };

  const getRatingText = (ratingValue: number) => {
    switch (ratingValue) {
      case 1: return 'Very Poor';
      case 2: return 'Poor';
      case 3: return 'Average';
      case 4: return 'Good';
      case 5: return 'Excellent';
      default: return '';
    }
  };

  const getTriggerTitle = () => {
    switch (trigger) {
      case 'app-usage': return 'How\'s your experience?';
      case 'form-completion': return 'How was form filling?';
      case 'trip-completion': return 'How was your trip planning?';
      default: return 'Rate your experience';
    }
  };

  const getTriggerMessage = () => {
    switch (trigger) {
      case 'app-usage': return 'We\'d love to know how you\'re finding Borderly overall.';
      case 'form-completion': return 'How easy was it to fill out your travel forms?';
      case 'trip-completion': return 'How was the trip planning and form generation process?';
      default: return 'Your feedback helps us improve Borderly.';
    }
  };

  const resetState = () => {
    setRating(0);
    setIsSubmitting(false);
    setShowDetailedFeedback(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <View className="bg-white rounded-2xl max-w-md w-full">
          {!showDetailedFeedback ? (
            <Card className="m-0">
              {/* Header */}
              <View className="text-center mb-6">
                <Text className="text-xl font-bold text-gray-900 mb-2">
                  {getTriggerTitle()}
                </Text>
                <Text className="text-base text-gray-600">
                  {getTriggerMessage()}
                </Text>
              </View>

              {/* Rating Stars */}
              <View className="mb-6">
                <View className="flex-row justify-center space-x-3 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      title={getRatingEmoji(star)}
                      onPress={() => handleRatingPress(star)}
                      variant="ghost"
                      className={`w-12 h-12 border-2 ${
                        rating >= star 
                          ? 'border-yellow-400 bg-yellow-50' 
                          : 'border-gray-200 bg-white'
                      }`}
                      disabled={isSubmitting}
                    />
                  ))}
                </View>

                {rating > 0 && (
                  <Text className="text-center text-sm font-medium text-gray-700">
                    {getRatingText(rating)} ({rating}/5)
                  </Text>
                )}
              </View>

              {/* Action Buttons */}
              <View className="space-y-3">
                <Button
                  title={isSubmitting ? "Submitting..." : "Submit Rating"}
                  onPress={handleSubmitRating}
                  disabled={isSubmitting || rating === 0}
                  loading={isSubmitting}
                  fullWidth
                />

                <Button
                  title="Maybe Later"
                  onPress={handleClose}
                  variant="outline"
                  disabled={isSubmitting}
                  fullWidth
                />
              </View>

              {/* Privacy Notice */}
              <View className="bg-gray-50 p-3 rounded-lg mt-4">
                <Text className="text-xs text-gray-600 text-center">
                  🔒 Your rating helps improve the app. No personal data is shared.
                </Text>
              </View>
            </Card>
          ) : (
            <Card className="m-0">
              {/* Detailed Feedback Request */}
              <View className="text-center mb-6">
                <Text className="text-xl font-bold text-gray-900 mb-2">
                  Help us improve!
                </Text>
                <Text className="text-base text-gray-600 mb-4">
                  Thanks for your {rating}-star rating. We'd love to know more about your experience.
                </Text>
                
                <View className="bg-orange-50 p-4 rounded-lg">
                  <Text className="text-sm text-orange-800 mb-2">
                    Your feedback is valuable to us! Would you like to share specific suggestions?
                  </Text>
                  <Text className="text-xs text-orange-700">
                    This helps us understand what we can improve in future updates.
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View className="space-y-3">
                <Button
                  title="Share Detailed Feedback"
                  onPress={handleDetailedFeedbackRequest}
                  fullWidth
                />

                <Button
                  title="No Thanks"
                  onPress={handleSkipDetailedFeedback}
                  variant="outline"
                  fullWidth
                />
              </View>
            </Card>
          )}
        </View>
      </View>
    </Modal>
  );
}