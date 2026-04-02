/**
 * Registry of components and their variants for screenshot capture.
 *
 * Each component has a `domain` (for file organization) and a map of
 * named `variants`, each with a `description` and `render` function.
 *
 * To add a new component:
 *   1. Import it
 *   2. Add an entry to `componentRegistry` with its variants
 *   3. Run the screenshot capture to generate PNGs
 *
 * Components that require complex dependencies (stores, navigation,
 * native cameras, WebView) are excluded — they are captured via the
 * full-app captureScreenshots.spec.ts instead.
 */
import React from 'react';
import { View, Text } from 'react-native';

// UI components
import Button from '../src/components/ui/Button';
import Card from '../src/components/ui/Card';
import StatusBadge from '../src/components/ui/StatusBadge';
import Divider from '../src/components/ui/Divider';
import EmptyState from '../src/components/ui/EmptyState';
import ErrorMessage from '../src/components/ui/ErrorMessage';
import InfoBanner from '../src/components/ui/InfoBanner';
import Input from '../src/components/ui/Input';
import LoadingSpinner from '../src/components/ui/LoadingSpinner';
import ProgressBar from '../src/components/ui/ProgressBar';
import Toggle from '../src/components/ui/Toggle';
import Skeleton from '../src/components/ui/Skeleton';
import AnimatedCard from '../src/components/ui/AnimatedCard';
import HelpHint from '../src/components/ui/HelpHint';
import LoadingIndicator from '../src/components/ui/LoadingIndicator';
import LoadingStates from '../src/components/ui/LoadingStates';
import ProgressIndicator from '../src/components/ui/ProgressIndicator';
import Select from '../src/components/ui/Select';
import Tooltip from '../src/components/ui/Tooltip';

// Trip components
import DeadlineBadge from '../src/components/trips/DeadlineBadge';
import CountryFlag from '../src/components/trips/CountryFlag';
import TripCard from '../src/components/trips/TripCard';
import PassportValidityWarning from '../src/components/trips/PassportValidityWarning';

// Form components
import AutoFilledBadge from '../src/components/forms/AutoFilledBadge';

// Profile components
import PassportExpiryBadge from '../src/components/profile/PassportExpiryBadge';
import DocumentValidityCard from '../src/components/profile/DocumentValidityCard';
import FamilyMemberCard from '../src/components/profile/FamilyMemberCard';

// Submission components
import { AutoFillBanner } from '../src/components/submission/AutoFillBanner';

export interface ComponentVariant {
  description: string;
  render: () => React.ReactElement;
}

export interface ComponentEntry {
  domain: string;
  variants: Record<string, ComponentVariant>;
}

const noop = () => {};

// Fixed date for deterministic screenshots
const TODAY = new Date('2026-03-22');

export const componentRegistry: Record<string, ComponentEntry> = {
  // ─── UI ────────────────────────────────────────────────────────

  Button: {
    domain: 'ui',
    variants: {
      primary: {
        description: 'Primary button — main CTA style',
        render: () => <Button title="Continue" onPress={noop} />,
      },
      secondary: {
        description: 'Secondary button — de-emphasized actions',
        render: () => <Button title="Cancel" onPress={noop} variant="secondary" />,
      },
      outline: {
        description: 'Outline button — tertiary actions',
        render: () => <Button title="Skip" onPress={noop} variant="outline" />,
      },
      disabled: {
        description: 'Disabled state',
        render: () => <Button title="Submit" onPress={noop} disabled />,
      },
      loading: {
        description: 'Loading state with spinner',
        render: () => <Button title="Saving..." onPress={noop} loading />,
      },
      'full-width': {
        description: 'Full-width button',
        render: () => <Button title="Get Started" onPress={noop} fullWidth />,
      },
      small: {
        description: 'Small size variant',
        render: () => <Button title="OK" onPress={noop} size="small" />,
      },
      large: {
        description: 'Large size variant',
        render: () => <Button title="Submit Declaration" onPress={noop} size="large" />,
      },
      'high-contrast': {
        description: 'High contrast accessibility mode',
        render: () => <Button title="Continue" onPress={noop} highContrastMode />,
      },
    },
  },

  Card: {
    domain: 'ui',
    variants: {
      default: {
        description: 'Default card with medium padding',
        render: () => (
          <Card>
            <Text>Card content goes here</Text>
          </Card>
        ),
      },
      outlined: {
        description: 'Card with border',
        render: () => (
          <Card variant="outlined">
            <Text>Outlined card</Text>
          </Card>
        ),
      },
      elevated: {
        description: 'Card with shadow elevation',
        render: () => (
          <Card variant="elevated">
            <Text>Elevated card with shadow</Text>
          </Card>
        ),
      },
      pressable: {
        description: 'Interactive card with onPress',
        render: () => (
          <Card onPress={noop} variant="elevated" accessibilityLabel="Tap to view details">
            <Text>Pressable card</Text>
          </Card>
        ),
      },
    },
  },

  StatusBadge: {
    domain: 'ui',
    variants: {
      success: {
        description: 'Success status — green',
        render: () => <StatusBadge status="success" text="Complete" />,
      },
      error: {
        description: 'Error status — red',
        render: () => <StatusBadge status="error" text="Failed" />,
      },
      warning: {
        description: 'Warning status — yellow',
        render: () => <StatusBadge status="warning" text="Pending" />,
      },
      info: {
        description: 'Info status — blue',
        render: () => <StatusBadge status="info" text="In Progress" />,
      },
      neutral: {
        description: 'Neutral status — gray',
        render: () => <StatusBadge status="neutral" text="Not Started" />,
      },
      'success-filled': {
        description: 'Filled variant — solid background',
        render: () => <StatusBadge status="success" text="Approved" variant="filled" />,
      },
      'error-outlined': {
        description: 'Outlined variant — border only',
        render: () => <StatusBadge status="error" text="Rejected" variant="outlined" />,
      },
    },
  },

  Input: {
    domain: 'ui',
    variants: {
      default: {
        description: 'Empty text input',
        render: () => <Input placeholder="Enter your name" onChangeText={noop} value="" />,
      },
      'with-value': {
        description: 'Input with value filled',
        render: () => <Input placeholder="Enter your name" onChangeText={noop} value="John Smith" />,
      },
    },
  },

  Divider: {
    domain: 'ui',
    variants: {
      default: {
        description: 'Horizontal divider line',
        render: () => (
          <View style={{ width: 300 }}>
            <Text>Above divider</Text>
            <Divider />
            <Text>Below divider</Text>
          </View>
        ),
      },
    },
  },

  EmptyState: {
    domain: 'ui',
    variants: {
      default: {
        description: 'Empty state with title, message, and action',
        render: () => (
          <EmptyState
            title="No trips yet"
            message="Create your first trip to get started"
            actionTitle="Create Trip"
            onAction={noop}
          />
        ),
      },
    },
  },

  ErrorMessage: {
    domain: 'ui',
    variants: {
      default: {
        description: 'Error message display',
        render: () => <ErrorMessage message="Something went wrong. Please try again." />,
      },
    },
  },

  InfoBanner: {
    domain: 'ui',
    variants: {
      default: {
        description: 'Info banner with message',
        render: () => <InfoBanner message="Your data is stored locally on this device only." />,
      },
    },
  },

  LoadingSpinner: {
    domain: 'ui',
    variants: {
      default: {
        description: 'Loading spinner',
        render: () => <LoadingSpinner />,
      },
    },
  },

  ProgressBar: {
    domain: 'ui',
    variants: {
      empty: {
        description: 'Progress bar at 0%',
        render: () => <ProgressBar progress={0} />,
      },
      half: {
        description: 'Progress bar at 50%',
        render: () => <ProgressBar progress={0.5} />,
      },
      full: {
        description: 'Progress bar at 100%',
        render: () => <ProgressBar progress={1} />,
      },
    },
  },

  Toggle: {
    domain: 'ui',
    variants: {
      off: {
        description: 'Toggle in off state',
        render: () => <Toggle value={false} onValueChange={noop} label="Enable notifications" />,
      },
      on: {
        description: 'Toggle in on state',
        render: () => <Toggle value={true} onValueChange={noop} label="Enable notifications" />,
      },
    },
  },

  Skeleton: {
    domain: 'ui',
    variants: {
      default: {
        description: 'Loading skeleton placeholder',
        render: () => <Skeleton width={200} height={20} />,
      },
    },
  },

  AnimatedCard: {
    domain: 'ui',
    variants: {
      default: {
        description: 'Animated card — default variant',
        render: () => (
          <AnimatedCard animationType="none">
            <Text>Animated card content</Text>
          </AnimatedCard>
        ),
      },
      outlined: {
        description: 'Animated card — outlined variant',
        render: () => (
          <AnimatedCard variant="outlined" animationType="none">
            <Text>Outlined animated card</Text>
          </AnimatedCard>
        ),
      },
      elevated: {
        description: 'Animated card — elevated variant',
        render: () => (
          <AnimatedCard variant="elevated" animationType="none">
            <Text>Elevated animated card</Text>
          </AnimatedCard>
        ),
      },
    },
  },

  HelpHint: {
    domain: 'ui',
    variants: {
      info: {
        description: 'Info help hint',
        render: () => <HelpHint title="Did you know?" content="Your data is stored securely on your device." variant="info" />,
      },
      tip: {
        description: 'Tip help hint',
        render: () => <HelpHint title="Pro Tip" content="Scan your passport MRZ for instant auto-fill." variant="tip" />,
      },
      warning: {
        description: 'Warning help hint',
        render: () => <HelpHint title="Attention" content="Your passport expires in less than 6 months." variant="warning" />,
      },
      success: {
        description: 'Success help hint',
        render: () => <HelpHint title="All set!" content="Your form is ready for submission." variant="success" />,
      },
    },
  },

  LoadingIndicator: {
    domain: 'ui',
    variants: {
      spinner: {
        description: 'Spinner loading indicator',
        render: () => <LoadingIndicator variant="spinner" text="Loading..." />,
      },
      dots: {
        description: 'Dots loading indicator',
        render: () => <LoadingIndicator variant="dots" text="Processing..." />,
      },
      pulse: {
        description: 'Pulse loading indicator',
        render: () => <LoadingIndicator variant="pulse" text="Scanning..." />,
      },
      'with-progress': {
        description: 'Loading indicator with progress bar',
        render: () => <LoadingIndicator variant="spinner" text="Uploading..." showProgress progress={0.65} />,
      },
    },
  },

  LoadingStates: {
    domain: 'ui',
    variants: {
      loading: {
        description: 'Loading state',
        render: () => <LoadingStates state="loading" announceStateChanges={false} />,
      },
      success: {
        description: 'Success state',
        render: () => <LoadingStates state="success" successMessage="Form submitted successfully" announceStateChanges={false} />,
      },
      error: {
        description: 'Error state with retry',
        render: () => <LoadingStates state="error" errorMessage="Network error. Please try again." onRetry={noop} announceStateChanges={false} />,
      },
      timeout: {
        description: 'Timeout state',
        render: () => <LoadingStates state="timeout" onRetry={noop} announceStateChanges={false} />,
      },
    },
  },

  ProgressIndicator: {
    domain: 'ui',
    variants: {
      horizontal: {
        description: 'Horizontal step indicator',
        render: () => (
          <View style={{ width: 350 }}>
            <ProgressIndicator currentStep={2} totalSteps={5} variant="horizontal" />
          </View>
        ),
      },
      'horizontal-labels': {
        description: 'Horizontal step indicator with labels',
        render: () => (
          <View style={{ width: 350 }}>
            <ProgressIndicator
              currentStep={2}
              totalSteps={4}
              variant="horizontal"
              showLabels
              labels={['Profile', 'Trip', 'Forms', 'Submit']}
            />
          </View>
        ),
      },
      dots: {
        description: 'Dots step indicator',
        render: () => <ProgressIndicator currentStep={3} totalSteps={5} variant="dots" />,
      },
      vertical: {
        description: 'Vertical step indicator',
        render: () => (
          <ProgressIndicator
            currentStep={2}
            totalSteps={4}
            variant="vertical"
            showLabels
            labels={['Scan passport', 'Confirm details', 'Set up biometrics', 'Done']}
          />
        ),
      },
    },
  },

  Select: {
    domain: 'ui',
    variants: {
      default: {
        description: 'Select with placeholder',
        render: () => (
          <Select
            options={[
              { label: 'Japan', value: 'JPN' },
              { label: 'Malaysia', value: 'MYS' },
              { label: 'Singapore', value: 'SGP' },
            ]}
            onValueChange={noop}
            placeholder="Select a country"
            label="Destination"
          />
        ),
      },
      'with-value': {
        description: 'Select with selected value',
        render: () => (
          <Select
            options={[
              { label: 'Japan', value: 'JPN' },
              { label: 'Malaysia', value: 'MYS' },
              { label: 'Singapore', value: 'SGP' },
            ]}
            value="JPN"
            onValueChange={noop}
            label="Destination"
          />
        ),
      },
      'with-error': {
        description: 'Select with validation error',
        render: () => (
          <Select
            options={[
              { label: 'Japan', value: 'JPN' },
              { label: 'Malaysia', value: 'MYS' },
            ]}
            onValueChange={noop}
            label="Destination"
            required
            error="Please select a destination"
          />
        ),
      },
    },
  },

  Tooltip: {
    domain: 'ui',
    variants: {
      default: {
        description: 'Tooltip with info trigger',
        render: () => (
          <Tooltip content="This is a helpful tooltip with additional context.">
            <Text style={{ color: '#2563eb', textDecorationLine: 'underline' }}>Hover for info</Text>
          </Tooltip>
        ),
      },
      warning: {
        description: 'Warning tooltip variant',
        render: () => (
          <Tooltip content="This field requires special attention." variant="warning">
            <Text style={{ color: '#d97706', textDecorationLine: 'underline' }}>Warning tooltip</Text>
          </Tooltip>
        ),
      },
    },
  },

  // ─── Trips ─────────────────────────────────────────────────────

  DeadlineBadge: {
    domain: 'trips',
    variants: {
      ready: {
        description: 'Ready state — green badge',
        render: () => (
          <DeadlineBadge
            deadline={{ legId: 'leg-1', countryCode: 'JPN', status: 'ready', hoursRemaining: 0, windowNote: '' }}
          />
        ),
      },
      overdue: {
        description: 'Overdue state — red badge',
        render: () => (
          <DeadlineBadge
            deadline={{ legId: 'leg-1', countryCode: 'JPN', status: 'overdue', hoursRemaining: -12, windowNote: '' }}
          />
        ),
      },
      'due-soon': {
        description: 'Warning urgency — amber badge',
        render: () => (
          <DeadlineBadge
            deadline={{ legId: 'leg-1', countryCode: 'JPN', status: 'not-started', hoursRemaining: 60, windowNote: '' }}
          />
        ),
      },
      'in-progress': {
        description: 'In progress — blue badge',
        render: () => (
          <DeadlineBadge
            deadline={{ legId: 'leg-1', countryCode: 'JPN', status: 'in-progress', hoursRemaining: 120, windowNote: '' }}
          />
        ),
      },
    },
  },

  CountryFlag: {
    domain: 'trips',
    variants: {
      japan: {
        description: 'Japan flag',
        render: () => <CountryFlag countryCode="JPN" size="large" />,
      },
      malaysia: {
        description: 'Malaysia flag',
        render: () => <CountryFlag countryCode="MYS" size="large" />,
      },
      singapore: {
        description: 'Singapore flag',
        render: () => <CountryFlag countryCode="SGP" size="large" />,
      },
    },
  },

  TripCard: {
    domain: 'trips',
    variants: {
      upcoming: {
        description: 'Upcoming trip with destinations',
        render: () => (
          <TripCard
            trip={{
              id: 'trip-1',
              name: 'Asia Trip 2026',
              status: 'upcoming',
              legs: [
                { id: 'leg-1', destinationCountry: 'JPN', arrivalDate: '2026-04-15', departureDate: '2026-04-20', formStatus: 'ready', formData: {}, purpose: 'tourism', travelers: [] },
                { id: 'leg-2', destinationCountry: 'MYS', arrivalDate: '2026-04-20', departureDate: '2026-04-25', formStatus: 'not-started', formData: {}, purpose: 'tourism', travelers: [] },
              ],
              createdAt: '2026-03-01',
              updatedAt: '2026-03-15',
            }}
          />
        ),
      },
      active: {
        description: 'Active trip in progress',
        render: () => (
          <TripCard
            trip={{
              id: 'trip-2',
              name: 'Singapore Business',
              status: 'active',
              legs: [
                { id: 'leg-1', destinationCountry: 'SGP', arrivalDate: '2026-03-20', departureDate: '2026-03-25', formStatus: 'submitted', formData: {}, purpose: 'business', travelers: [] },
              ],
              createdAt: '2026-03-01',
              updatedAt: '2026-03-20',
            }}
          />
        ),
      },
      completed: {
        description: 'Completed trip',
        render: () => (
          <TripCard
            trip={{
              id: 'trip-3',
              name: 'Tokyo Weekend',
              status: 'completed',
              legs: [
                { id: 'leg-1', destinationCountry: 'JPN', arrivalDate: '2026-02-01', departureDate: '2026-02-04', formStatus: 'submitted', formData: {}, purpose: 'tourism', travelers: [] },
              ],
              createdAt: '2026-01-15',
              updatedAt: '2026-02-04',
            }}
          />
        ),
      },
    },
  },

  PassportValidityWarning: {
    domain: 'trips',
    variants: {
      warning: {
        description: 'Passport validity warning banner',
        render: () => (
          <PassportValidityWarning
            status={{ isValid: false, shortfallDays: 45 }}
            countryName="Japan"
            requiredMonths={6}
            passportExpiry="2026-07-15"
          />
        ),
      },
    },
  },

  // ─── Forms ─────────────────────────────────────────────────────

  AutoFilledBadge: {
    domain: 'forms',
    variants: {
      auto: {
        description: 'Auto-filled from passport profile',
        render: () => <AutoFilledBadge source="auto" />,
      },
      user: {
        description: 'User-entered value',
        render: () => <AutoFilledBadge source="user" />,
      },
      'auto-medium': {
        description: 'Auto-filled — medium size',
        render: () => <AutoFilledBadge source="auto" size="medium" />,
      },
    },
  },

  // ─── Profile ──────────────────────────────────────────────────

  PassportExpiryBadge: {
    domain: 'profile',
    variants: {
      valid: {
        description: 'Valid passport — green badge',
        render: () => <PassportExpiryBadge expiryDate="2028-06-15" today={TODAY} />,
      },
      'expiring-soon': {
        description: 'Expiring soon — amber badge',
        render: () => <PassportExpiryBadge expiryDate="2026-08-01" today={TODAY} />,
      },
      expired: {
        description: 'Expired passport — red badge',
        render: () => <PassportExpiryBadge expiryDate="2026-04-01" today={TODAY} />,
      },
    },
  },

  DocumentValidityCard: {
    domain: 'profile',
    variants: {
      valid: {
        description: 'Document validity card — passport valid for all countries',
        render: () => <DocumentValidityCard passportExpiry="2028-06-15" today={TODAY} />,
      },
      'expiring-soon': {
        description: 'Document validity card — passport expiring soon',
        render: () => <DocumentValidityCard passportExpiry="2026-08-01" today={TODAY} />,
      },
    },
  },

  FamilyMemberCard: {
    domain: 'profile',
    variants: {
      default: {
        description: 'Family member card with valid passport',
        render: () => (
          <FamilyMemberCard
            member={{
              id: 'member-1',
              relationship: 'spouse',
              givenNames: 'Jane',
              surname: 'Smith',
              nationality: 'USA',
              dateOfBirth: '1990-05-15',
              gender: 'F',
              passportNumber: 'CD7654321',
              passportExpiry: '2028-12-01',
              createdAt: '2026-01-01',
              updatedAt: '2026-03-01',
            }}
            onEdit={noop}
            onRemove={noop}
          />
        ),
      },
      child: {
        description: 'Child family member card',
        render: () => (
          <FamilyMemberCard
            member={{
              id: 'member-2',
              relationship: 'child',
              givenNames: 'Emma',
              surname: 'Smith',
              nationality: 'USA',
              dateOfBirth: '2018-09-20',
              gender: 'F',
              passportNumber: 'EF1234567',
              passportExpiry: '2027-06-15',
              createdAt: '2026-01-01',
              updatedAt: '2026-03-01',
            }}
            onEdit={noop}
          />
        ),
      },
    },
  },

  // ─── Submission ───────────────────────────────────────────────

  AutoFillBanner: {
    domain: 'submission',
    variants: {
      success: {
        description: 'All fields auto-filled — green banner',
        render: () => <AutoFillBanner filled={8} total={8} onDismiss={noop} />,
      },
      partial: {
        description: 'Some fields failed — amber warning banner',
        render: () => <AutoFillBanner filled={5} total={8} onDismiss={noop} />,
      },
    },
  },
};
