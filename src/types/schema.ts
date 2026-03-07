export interface FormField {
  id: string;
  label: string; // Display label
  type: 'text' | 'date' | 'select' | 'boolean' | 'number' | 'textarea';
  required: boolean;

  // Mapping from universal profile
  autoFillSource?: string; // Dot-notation path, e.g., "profile.passportNumber", "trip.accommodation.address.line1"

  // If autoFillSource is null, this is a country-specific field the user must fill
  countrySpecific: boolean;

  // For select fields
  options?: { value: string; label: string }[];

  // Validation
  validation?: {
    pattern?: string; // Regex
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };

  // Help text explaining what this field means
  helpText?: string;

  // What to show in the government portal walkthrough
  portalFieldName?: string; // The label used in the actual government form
  portalScreenshot?: string; // Asset reference for walkthrough

  // Automation instructions for this field
  automation?: {
    selector?: string; // CSS/XPath selector for the input field
    fillMethod?: 'input' | 'select' | 'click' | 'upload'; // How to interact with the field
    transformValue?: string; // JavaScript expression to transform the value
    waitFor?: string; // Selector to wait for before filling
    dependencies?: string[]; // Other field IDs that must be filled first
  };
}

export interface FormSection {
  id: string;
  title: string; // e.g., "Personal Information"
  fields: FormField[];
}

export interface SubmissionStep {
  order: number;
  title: string;
  description: string;
  screenshotAsset?: string;
  fieldsOnThisScreen: string[]; // Field IDs visible on this portal screen
  tips?: string[];

  // Automation instructions for this step
  automation?: {
    url?: string; // URL to navigate to for this step
    actions?: Array<{
      type: 'navigate' | 'click' | 'wait' | 'fill' | 'submit' | 'scroll';
      selector?: string; // Element selector
      value?: string; // Value to enter or URL to navigate to
      waitFor?: string; // What to wait for
      timeout?: number; // Timeout in milliseconds
    }>;
    completionIndicator?: string; // Selector that indicates the step is complete
    errorSelectors?: string[]; // Selectors that indicate an error occurred
  };
}

export interface CountryFormSchema {
  countryCode: string; // ISO 3166-1 alpha-3
  countryName: string;
  schemaVersion: string; // Semver
  lastUpdated: string; // ISO 8601
  portalUrl: string; // Government portal URL
  portalName: string; // e.g., "Visit Japan Web"

  // Schema metadata
  metadata: {
    priority: number; // Implementation priority (1 = highest)
    complexity: 'low' | 'medium' | 'high'; // Implementation complexity
    popularity: number; // 1-100 based on traveler volume
    lastVerified: string; // ISO 8601 - when portal was last verified working
    supportedLanguages: string[]; // Portal language support
    implementationStatus: 'planned' | 'in_progress' | 'complete' | 'deprecated';
    maintenanceFrequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  };

  // Portal change detection
  changeDetection: {
    checksum?: string; // Hash of critical portal elements
    monitoredSelectors: string[]; // CSS selectors to monitor for changes
    lastChangeDetected?: string; // ISO 8601 timestamp
    changeThreshold: number; // Percentage change that invalidates schema
    fallbackActions: Array<{
      trigger: string; // What change triggers this action
      action: 'notify' | 'disable' | 'fallback_manual'; // What to do
      message?: string; // User-facing message
    }>;
  };

  // Timing requirements
  submission: {
    earliestBeforeArrival: string; // e.g., "14d" (14 days)
    latestBeforeArrival: string; // e.g., "0h" (can do on arrival)
    recommended: string; // e.g., "72h"
    processingTime?: string; // How long approval takes, e.g., "24h"
    blackoutPeriods?: Array<{
      start: string; // ISO date or date pattern
      end: string;
      reason: string; // e.g., "Portal maintenance"
    }>;
  };

  // Multi-step portal flow support
  portalFlow: {
    requiresAccount: boolean;
    multiStep: boolean;
    canSaveProgress: boolean;
    sessionTimeout?: string; // How long sessions last, e.g., "30m"
    prerequisites?: Array<{
      type: 'document' | 'payment' | 'approval' | 'other';
      description: string;
      required: boolean;
    }>;
  };

  // Form sections
  sections: FormSection[];

  // Step-by-step submission guide
  submissionGuide: SubmissionStep[];

  // Automation script for the entire portal
  automation?: {
    enabled: boolean;
    version: string;
    entryUrl: string;
    testMode: boolean; // Whether to run in test/sandbox mode
    successIndicators: string[]; // Selectors that indicate successful completion
    failureIndicators: string[]; // Selectors that indicate failure
    dataExtractionRules?: Array<{
      name: string; // What data to extract (e.g., "confirmationNumber", "qrCode")
      selector: string;
      attribute?: string; // Which attribute to extract (default: textContent)
      required: boolean;
    }>;
  };
}

// Schema validation and migration types
export interface SchemaValidationResult {
  valid: boolean;
  errors: Array<{
    path: string; // JSONPath to the invalid field
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    path: string;
    message: string;
  }>;
}

export interface SchemaMigration {
  fromVersion: string;
  toVersion: string;
  transformations: Array<{
    operation: 'add' | 'remove' | 'rename' | 'transform';
    path: string; // JSONPath
    newPath?: string; // For rename operations
    defaultValue?: any; // For add operations
    transformer?: string; // JavaScript function string for transform operations
  }>;
  description: string;
  reversible: boolean;
}

export interface SchemaRegistry {
  schemas: Record<string, CountryFormSchema>; // countryCode -> schema
  migrations: Record<string, SchemaMigration[]>; // countryCode -> migrations
  metadata: {
    lastUpdated: string;
    version: string;
    supportedCountries: string[];
  };
}

export interface CountryPriority {
  countryCode: string;
  priority: number; // 1 = highest priority
  factors: {
    travelVolume: number; // 1-100
    implementationComplexity: number; // 1-100 (lower = easier)
    portalStability: number; // 1-100 (higher = more stable)
    userDemand: number; // 1-100
    strategicImportance: number; // 1-100
  };
  calculatedScore: number; // Weighted combination of factors
  lastUpdated: string;
  notes?: string;
}

// Keep backward compatibility
export interface CountrySchema extends CountryFormSchema {
  portalInfo: {
    name: string;
    url: string;
    description: string;
  };
  submissionSteps: {
    title: string;
    description: string;
    screenshots?: string[];
  }[];
}
