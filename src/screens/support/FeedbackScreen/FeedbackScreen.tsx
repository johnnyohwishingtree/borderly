import { View, Text, ScrollView, TextInput } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Button, Card, StatusBadge, Select, ScreenContainer } from '@/components/ui';
import { useFeedback } from '@/hooks/useFeedback';

export default function FeedbackScreen() {
  const {
    fields: { feedbackType, setFeedbackType, rating, subject, setSubject, message, setMessage },
    submission: { isSubmitting, handleSubmitFeedback },
    options: { feedbackTypeOptions },
    ratingHelpers: { handleRatingPress, getRatingEmoji, getRatingText },
  } = useFeedback();

  return (
    <ScreenContainer className="bg-gray-50">
    <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" className="flex-1">
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

            <View className="flex-row flex-wrap justify-center gap-3 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  title={getRatingEmoji(star)}
                  onPress={() => handleRatingPress(star)}
                  variant={rating >= star ? "primary" : "secondary"}
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
              <Lock size={20} color="#1e3a5f" />
              <Text className="text-base font-semibold text-blue-900 ml-2">Privacy Notice</Text>
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
    </ScreenContainer>
  );
}
