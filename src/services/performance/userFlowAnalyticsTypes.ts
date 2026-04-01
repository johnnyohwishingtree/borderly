/**
 * User Flow Analytics — Types & Constants
 *
 * All interfaces and predefined flow definitions used by the
 * UserFlowAnalytics service and its calculation helpers.
 */

export interface UserAction {
  id: string;
  timestamp: number;
  screen: string;
  action: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface UserSession {
  id: string;
  startTime: number;
  endTime?: number;
  actions: UserAction[];
  completed: boolean;
  abandonedAt?: string; // screen where user abandoned
}

export interface FlowStep {
  screen: string;
  action: string;
  expectedNext?: string[];
  isOptional: boolean;
  criticalPath: boolean;
}

export interface UserFlow {
  id: string;
  name: string;
  description: string;
  steps: FlowStep[];
  expectedDuration: number; // in milliseconds
}

export interface FlowAnalytics {
  flowId: string;
  totalSessions: number;
  completionRate: number;
  averageDuration: number;
  dropoffPoints: Array<{
    step: string;
    dropoffRate: number;
    userCount: number;
  }>;
  frictionPoints: Array<{
    step: string;
    averageTime: number;
    retryRate: number;
    errorRate: number;
  }>;
  conversionFunnel: Array<{
    step: string;
    userCount: number;
    conversionRate: number;
  }>;
}

export interface UserBehaviorPattern {
  id: string;
  pattern: string;
  frequency: number;
  impact: 'positive' | 'negative' | 'neutral';
  recommendations: string[];
}

export interface OptimizationInsight {
  id: string;
  type: 'friction_point' | 'conversion_opportunity' | 'user_preference' | 'performance_issue' | 'behavior_pattern';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedFlow: string;
  affectedUsers: number;
  potentialImpact: string;
  actionItems: string[];
}

// Predefined user flows for Borderly app
export const PREDEFINED_FLOWS: UserFlow[] = [
  {
    id: 'onboarding',
    name: 'User Onboarding',
    description: 'Complete onboarding from welcome to profile confirmation',
    expectedDuration: 180000, // 3 minutes
    steps: [
      { screen: 'Welcome', action: 'continue', expectedNext: ['PassportScan'], isOptional: false, criticalPath: true },
      { screen: 'PassportScan', action: 'scan_passport', expectedNext: ['Main'], isOptional: false, criticalPath: true },
      { screen: 'BiometricSetup', action: 'enable_biometrics', expectedNext: ['TripList'], isOptional: true, criticalPath: false },
    ],
  },
  {
    id: 'trip_creation',
    name: 'Trip Creation',
    description: 'Create a new trip with multiple destinations',
    expectedDuration: 120000, // 2 minutes
    steps: [
      { screen: 'TripList', action: 'create_trip', expectedNext: ['CreateTrip'], isOptional: false, criticalPath: true },
      { screen: 'CreateTrip', action: 'add_destination', expectedNext: ['CreateTrip', 'TripDetail'], isOptional: false, criticalPath: true },
      { screen: 'CreateTrip', action: 'save_trip', expectedNext: ['TripDetail'], isOptional: false, criticalPath: true },
      { screen: 'TripDetail', action: 'view_trip', expectedNext: ['LegForm'], isOptional: false, criticalPath: true },
    ],
  },
  {
    id: 'form_completion',
    name: 'Form Completion',
    description: 'Complete country-specific form for a trip leg',
    expectedDuration: 300000, // 5 minutes
    steps: [
      { screen: 'TripDetail', action: 'start_form', expectedNext: ['LegForm'], isOptional: false, criticalPath: true },
      { screen: 'LegForm', action: 'fill_form', expectedNext: ['SubmissionGuide'], isOptional: false, criticalPath: true },
      { screen: 'SubmissionGuide', action: 'copy_data', expectedNext: ['QRWallet'], isOptional: true, criticalPath: false },
      { screen: 'QRWallet', action: 'add_qr', expectedNext: [], isOptional: true, criticalPath: false },
    ],
  },
  {
    id: 'passport_scanning',
    name: 'Passport Scanning',
    description: 'Scan and verify passport information',
    expectedDuration: 30000, // 30 seconds
    steps: [
      { screen: 'PassportScan', action: 'open_camera', expectedNext: [], isOptional: false, criticalPath: true },
      { screen: 'PassportScan', action: 'scan_mrz', expectedNext: ['Main'], isOptional: false, criticalPath: true },
    ],
  },
];
