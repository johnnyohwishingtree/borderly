import { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '@/stores/useAppStore';
import type { SelectOption } from '@/components/ui/Select';

export function useFeedback() {
  const navigation = useNavigation();
  const { preferences } = useAppStore();
  const [feedbackType, setFeedbackType] = useState<string>('general');
  const [rating, setRating] = useState<number>(0);
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedbackTypeOptions: SelectOption[] = [
    { label: 'General Feedback', value: 'general' },
    { label: 'Feature Request', value: 'feature' },
    { label: 'User Experience', value: 'ux' },
    { label: 'Country Form Issues', value: 'country-forms' },
    { label: 'Performance Issues', value: 'performance' },
    { label: 'Other', value: 'other' },
  ];

  const handleRatingPress = (newRating: number) => {
    setRating(newRating);
  };

  const handleSubmitFeedback = async () => {
    if (!message.trim()) {
      Alert.alert('Missing Information', 'Please provide your feedback message.');
      return;
    }

    if (rating === 0) {
      Alert.alert('Missing Rating', 'Please provide a rating for your experience.');
      return;
    }

    setIsSubmitting(true);

    try {
      // In a real implementation, this would send feedback to a service
      // For now, we'll simulate the submission
      await new Promise(resolve => setTimeout(() => resolve(undefined), 1000));

      const feedbackData = {
        type: feedbackType,
        rating,
        subject: subject.trim(),
        message: message.trim(),
        timestamp: new Date().toISOString(),
        appVersion: '1.0.0',
        language: preferences.language,
        analytics: preferences.analyticsEnabled,
      };

      console.log('Feedback submitted:', feedbackData);

      Alert.alert(
        'Thank You!',
        'Your feedback has been submitted successfully. We appreciate your input!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setFeedbackType('general');
              setRating(0);
              setSubject('');
              setMessage('');
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      Alert.alert('Submission Failed', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingEmoji = (ratingValue: number) => {
    switch (ratingValue) {
      case 1: return '\u{1F61E}';
      case 2: return '\u{1F615}';
      case 3: return '\u{1F610}';
      case 4: return '\u{1F60A}';
      case 5: return '\u{1F929}';
      default: return '\u2B50';
    }
  };

  const getRatingText = (ratingValue: number) => {
    switch (ratingValue) {
      case 1: return 'Very Poor';
      case 2: return 'Poor';
      case 3: return 'Average';
      case 4: return 'Good';
      case 5: return 'Excellent';
      default: return 'Tap to rate';
    }
  };

  return {
    // State
    feedbackType,
    setFeedbackType,
    rating,
    setRating,
    subject,
    setSubject,
    message,
    setMessage,
    isSubmitting,

    // Constants
    feedbackTypeOptions,

    // Callbacks
    handleRatingPress,
    handleSubmitFeedback,

    // Helpers
    getRatingEmoji,
    getRatingText,
  };
}
