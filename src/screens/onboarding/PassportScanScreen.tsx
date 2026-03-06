import { View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { OnboardingStackParamList } from '../../app/navigation/types';
import { Button, Card, Input } from '../../components/ui';
import { useProfileStore } from '../../stores/useProfileStore';

type PassportScanScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'PassportScan'>;

const passportSchema = z.object({
  passportNumber: z.string().min(1, 'Passport number is required').min(6, 'Invalid passport number'),
  surname: z.string().min(1, 'Surname is required'),
  givenNames: z.string().min(1, 'Given names are required'),
  nationality: z.string().min(3, 'Nationality is required').max(3, 'Use 3-letter country code'),
  dateOfBirth: z.string().min(1, 'Date of birth is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format'),
  gender: z.enum(['M', 'F', 'X']),
  passportExpiry: z.string().min(1, 'Passport expiry date is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format'),
  issuingCountry: z.string().min(3, 'Issuing country is required').max(3, 'Use 3-letter country code'),
});

type PassportFormData = z.infer<typeof passportSchema>;

export default function PassportScanScreen() {
  const navigation = useNavigation<PassportScanScreenNavigationProp>();
  const { saveProfile } = useProfileStore();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PassportFormData>({
    resolver: zodResolver(passportSchema),
    defaultValues: {
      gender: 'M',
    },
  });

  const generateProfileId = () => {
    // Generate a secure UUID-like identifier using timestamp and multiple random sources
    const timestamp = Date.now();
    const randomPart1 = Math.random().toString(36).substring(2, 10);
    const randomPart2 = Math.random().toString(36).substring(2, 10);
    return `profile_${timestamp}_${randomPart1}_${randomPart2}`;
  };

  const onSubmit = async (data: PassportFormData) => {
    try {
      await saveProfile({
        id: generateProfileId(),
        ...data,
        email: '',
        phoneNumber: '',
        defaultDeclarations: {
          hasItemsToDeclar: false,
          carryingCurrency: false,
          carryingProhibitedItems: false,
          visitedFarm: false,
          hasCriminalRecord: false,
          carryingCommercialGoods: false,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      navigation.navigate('ConfirmProfile');
    } catch (error) {
      Alert.alert('Error', 'Failed to save passport data. Please try again.');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 py-8">
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Enter Passport Details
          </Text>
          <Text className="text-base text-gray-600">
            Enter your passport information manually. This data will be stored securely on your device.
          </Text>
        </View>

        <Card variant="elevated">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Passport Information
          </Text>

          <Controller
            control={control}
            name="passportNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Passport Number"
                placeholder="Enter passport number"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.passportNumber?.message}
                autoCapitalize="characters"
                required
              />
            )}
          />

          <Controller
            control={control}
            name="surname"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Surname (Family Name)"
                placeholder="Enter surname"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.surname?.message}
                autoCapitalize="words"
                required
              />
            )}
          />

          <Controller
            control={control}
            name="givenNames"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Given Names"
                placeholder="Enter given names"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.givenNames?.message}
                autoCapitalize="words"
                required
              />
            )}
          />

          <Controller
            control={control}
            name="nationality"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Nationality"
                placeholder="e.g., USA, CAN, GBR"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.nationality?.message}
                autoCapitalize="characters"
                helperText="Use 3-letter country code"
                maxLength={3}
                required
              />
            )}
          />

          <Controller
            control={control}
            name="dateOfBirth"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Date of Birth"
                placeholder="YYYY-MM-DD"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.dateOfBirth?.message}
                helperText="Format: YYYY-MM-DD"
                required
              />
            )}
          />

          <Controller
            control={control}
            name="gender"
            render={({ field: { onChange, value } }) => (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Gender <Text className="text-red-500">*</Text>
                </Text>
                <View className="flex-row space-x-4">
                  {[
                    { value: 'M', label: 'Male' },
                    { value: 'F', label: 'Female' },
                    { value: 'X', label: 'Other' },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      title={option.label}
                      onPress={() => onChange(option.value)}
                      variant={value === option.value ? 'primary' : 'outline'}
                      size="small"
                    />
                  ))}
                </View>
                {errors.gender && (
                  <Text className="text-sm text-red-500 mt-1">{errors.gender.message}</Text>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="passportExpiry"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Passport Expiry Date"
                placeholder="YYYY-MM-DD"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.passportExpiry?.message}
                helperText="Format: YYYY-MM-DD"
                required
              />
            )}
          />

          <Controller
            control={control}
            name="issuingCountry"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Issuing Country"
                placeholder="e.g., USA, CAN, GBR"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.issuingCountry?.message}
                autoCapitalize="characters"
                helperText="Use 3-letter country code"
                maxLength={3}
                required
              />
            )}
          />
        </Card>

        <View className="mt-6 space-y-4">
          <Button
            title="Continue"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            size="large"
            fullWidth
          />

          <Button
            title="Back"
            onPress={handleBack}
            variant="outline"
            size="large"
            fullWidth
          />
        </View>
      </View>
    </ScrollView>
  );
}
