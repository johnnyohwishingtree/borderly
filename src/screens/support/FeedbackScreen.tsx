import { useState } from 'react';
import { View, Text, ScrollView, Alert, TextInput } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { Button, Card, StatusBadge, Select, SelectOption } from '@/components/ui';
import { useAppStore } from '@/stores/useAppStore';

interface FeedbackScreenProps {
  route?: RouteProp<any, any>;
}

export default function FeedbackScreen({ route: _route }: FeedbackScreenProps) {
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
      default: return 'Tap to rate';
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4 space-y-4">
        {/* Header */}
        <View className="mb-4">
          <Text className="text-2xl font-bold text-gray-900">Send Feedback</Text>
          <Text className="text-base text-gray-600">Help us improve your travel experience</Text>
        </View>

        {/* Rating Section */}
        <Card>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900 mr-3">Rate Your Experience</Text>
            <StatusBadge 
              status={rating > 0 ? "success" : "neutral"} 
              size="small" 
              text={rating > 0 ? getRatingText(rating) : "Not Rated"} 
            />
          </View>

          <View className="bg-gray-50 p-4 rounded-lg">
            <Text className="text-sm text-gray-600 mb-4">
              How would you rate your overall experience with Borderly?
            </Text>
            
            <View className="flex-row justify-center space-x-4 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  title={getRatingEmoji(star)}
                  onPress={() => handleRatingPress(star)}
                  variant={rating >= star ? "primary" : "outline"}
                  size="small"
                />
              ))}
            </View>

            {rating > 0 && (
              <Text className="text-center text-sm font-medium text-gray-700">
                {getRatingText(rating)} ({rating}/5)
              </Text>
            )}
          </View>
        </Card>

        {/* Feedback Type */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Feedback Category</Text>
          
          <Select
            label="What type of feedback is this?"
            options={feedbackTypeOptions}
            value={feedbackType}
            onValueChange={setFeedbackType}
          />
          
          <Text className="text-xs text-gray-500 mt-2">
            Select the category that best describes your feedback
          </Text>
        </Card>

        {/* Subject */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Subject (Optional)</Text>
          
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Brief summary of your feedback..."
            className="border border-gray-300 rounded-lg p-3 text-gray-900 bg-white"
            maxLength={100}
          />
          
          <Text className="text-xs text-gray-500 mt-2">
            {subject.length}/100 characters
          </Text>
        </Card>

        {/* Message */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Your Feedback</Text>
          
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Tell us about your experience, suggestions, or any issues you've encountered..."
            multiline
            numberOfLines={6}
            className="border border-gray-300 rounded-lg p-3 text-gray-900 bg-white"
            style={{ minHeight: 120, textAlignVertical: 'top' }}
            maxLength={1000}
          />
          
          <Text className="text-xs text-gray-500 mt-2">
            {message.length}/1000 characters
          </Text>
        </Card>

        {/* Privacy Notice */}
        <Card>
          <View className="bg-blue-50 p-4 rounded-lg">
            <View className="flex-row items-center mb-2">
              <Text className="text-lg mr-2">🔒</Text>
              <Text className="text-base font-semibold text-blue-900">Privacy Notice</Text>
            </View>
            <Text className="text-sm text-blue-800 mb-2">
              Your feedback helps us improve the app while maintaining your privacy.
            </Text>
            <Text className="text-xs text-blue-700">
              • No personal or passport data is included
              • Only your feedback content and basic app info
              • Feedback is used solely for product improvement
            </Text>
          </View>
        </Card>

        {/* Submit Button */}
        <View className="pt-4">
          <Button
            title={isSubmitting ? "Submitting..." : "Submit Feedback"}
            onPress={handleSubmitFeedback}
            disabled={isSubmitting || !message.trim() || rating === 0}
            loading={isSubmitting}
            fullWidth
          />
          
          <Text className="text-xs text-gray-500 text-center mt-3">
            By submitting, you agree to help us improve Borderly while respecting your privacy
          </Text>
        </View>

        {/* Bottom spacing */}
        <View className="h-8" />
      </View>
    </ScrollView>
  );
}