/**
 * Passport Preview Component
 * 
 * Displays scanned or manually entered passport data for user confirmation.
 * Shows data validation warnings and security indicators.
 * 
 * Security: Only displays data from secure storage, with clear indicators.
 */

import React from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { trigger, HapticFeedbackTypes } from 'react-native-haptic-feedback';
import { type TravelerProfile } from '../../types/profile';
import { validateScannedPassport, type MRZParseResult } from '../../services/passport/mrzScanner';
import Button from '../ui/Button';
import Card from '../ui/Card';
import StatusBadge from '../ui/StatusBadge';

export interface PassportPreviewProps {
  profile: Partial<TravelerProfile>;
  scanResult?: MRZParseResult;
  onConfirm: () => void;
  onEdit: () => void;
  onRescan?: () => void;
  isLoading?: boolean;
}

export default function PassportPreview({
  profile,
  scanResult,
  onConfirm,
  onEdit,
  onRescan,
  isLoading = false,
}: PassportPreviewProps) {
  // Validate passport data if it came from scanning
  const validation = scanResult ? validateScannedPassport(scanResult) : null;
  
  const handleConfirm = () => {
    if (validation && !validation.isValid && validation.warnings.length > 0) {
      // Show warnings before confirming
      Alert.alert(
        'Data Validation Warning',
        `The following issues were detected:\n\n${validation.warnings.join('\n')}\n\nDo you want to proceed anyway?`,
        [
          { text: 'Review Data', style: 'cancel', onPress: onEdit },
          { 
            text: 'Proceed', 
            style: 'destructive',
            onPress: () => {
              trigger(HapticFeedbackTypes.impactMedium);
              onConfirm();
            }
          },
        ]
      );
    } else {
      trigger(HapticFeedbackTypes.notificationSuccess);
      onConfirm();
    }
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Not provided';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getExpiryStatus = (expiryDate: string | undefined): 'valid' | 'warning' | 'expired' => {
    if (!expiryDate) return 'warning';
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(now.getMonth() + 6);
    
    if (expiry < now) return 'expired';
    if (expiry < sixMonthsFromNow) return 'warning';
    return 'valid';
  };

  const getGenderDisplay = (gender: string | undefined): string => {
    switch (gender) {
      case 'M': return 'Male';
      case 'F': return 'Female';
      case 'X': return 'Other';
      default: return 'Not specified';
    }
  };

  const expiryStatus = getExpiryStatus(profile.passportExpiry);

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-4">
      {/* Header */}
      <View className="mb-6">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Confirm Passport Details
        </Text>
        <Text className="text-gray-600 leading-6">
          Please review your passport information. This data will be stored securely 
          on your device and used to auto-fill travel forms.
        </Text>
      </View>

      {/* Security indicator */}
      <Card className="mb-4 bg-blue-50 border-blue-200">
        <View className="flex-row items-center">
          <Text className="text-blue-600 text-lg mr-2">🔒</Text>
          <View className="flex-1">
            <Text className="font-medium text-blue-900 mb-1">
              Secure Local Storage
            </Text>
            <Text className="text-sm text-blue-700">
              Your passport data is encrypted and stored only on this device. 
              It never leaves your phone without your explicit action.
            </Text>
          </View>
        </View>
      </Card>

      {/* Scan confidence (if scanned) */}
      {scanResult && (
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-medium text-gray-900">Scan Quality</Text>
            <StatusBadge
              text={`${Math.round(scanResult.confidence * 100)}% Confident`}
              variant={scanResult.confidence >= 0.8 ? 'success' : 
                      scanResult.confidence >= 0.6 ? 'warning' : 'error'}
            />
          </View>
          <Text className="text-sm text-gray-600">
            Data was automatically extracted from your passport using optical scanning.
          </Text>
        </Card>
      )}

      {/* Validation warnings */}
      {validation && validation.warnings.length > 0 && (
        <Card className="mb-4 bg-yellow-50 border-yellow-200">
          <View className="flex-row items-start">
            <Text className="text-yellow-600 text-lg mr-2">⚠️</Text>
            <View className="flex-1">
              <Text className="font-medium text-yellow-900 mb-2">
                Validation Warnings
              </Text>
              {validation.warnings.map((warning, index) => (
                <Text key={index} className="text-sm text-yellow-800 mb-1">
                  • {warning}
                </Text>
              ))}
            </View>
          </View>
        </Card>
      )}

      {/* Passport Information */}
      <Card className="mb-4">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Passport Information
        </Text>
        
        <View className="space-y-3">
          <DataRow
            label="Passport Number"
            value={profile.passportNumber || 'Not provided'}
            important
          />
          <DataRow
            label="Issuing Country"
            value={profile.issuingCountry || 'Not provided'}
          />
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-gray-500">Expiry Date</Text>
            <View className="flex-row items-center">
              <Text className="text-gray-900 mr-2">
                {formatDate(profile.passportExpiry)}
              </Text>
              <StatusBadge
                text={
                  expiryStatus === 'valid' ? 'Valid' :
                  expiryStatus === 'warning' ? 'Expires Soon' : 'Expired'
                }
                variant={
                  expiryStatus === 'valid' ? 'success' :
                  expiryStatus === 'warning' ? 'warning' : 'error'
                }
              />
            </View>
          </View>
        </View>
      </Card>

      {/* Personal Information */}
      <Card className="mb-6">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Personal Information
        </Text>
        
        <View className="space-y-3">
          <DataRow
            label="Surname"
            value={profile.surname || 'Not provided'}
            important
          />
          <DataRow
            label="Given Names"
            value={profile.givenNames || 'Not provided'}
            important
          />
          <DataRow
            label="Date of Birth"
            value={formatDate(profile.dateOfBirth)}
          />
          <DataRow
            label="Gender"
            value={getGenderDisplay(profile.gender)}
          />
          <DataRow
            label="Nationality"
            value={profile.nationality || 'Not provided'}
          />
        </View>
      </Card>

      {/* Action buttons */}
      <View className="space-y-3">
        <Button
          title={isLoading ? 'Saving...' : 'Confirm & Continue'}
          onPress={handleConfirm}
          variant="primary"
          fullWidth
          disabled={isLoading}
          loading={isLoading}
        />
        
        <View className="flex-row space-x-3">
          <Button
            title="Edit Details"
            onPress={onEdit}
            variant="outline"
            fullWidth
            disabled={isLoading}
          />
          
          {onRescan && (
            <Button
              title="Rescan"
              onPress={onRescan}
              variant="outline"
              fullWidth
              disabled={isLoading}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

interface DataRowProps {
  label: string;
  value: string;
  important?: boolean;
}

function DataRow({ label, value, important }: DataRowProps) {
  const isEmpty = !value || value === 'Not provided';
  
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm font-medium text-gray-500 flex-shrink-0">
        {label}
      </Text>
      <Text 
        className={`flex-1 text-right ml-4 ${
          isEmpty 
            ? 'text-red-500' 
            : important 
            ? 'text-gray-900 font-medium' 
            : 'text-gray-900'
        }`}
      >
        {value}
      </Text>
    </View>
  );
}