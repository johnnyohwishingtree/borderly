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
}

export interface CountryFormSchema {
  countryCode: string; // ISO 3166-1 alpha-3
  countryName: string;
  schemaVersion: string; // Semver
  lastUpdated: string; // ISO 8601
  portalUrl: string; // Government portal URL
  portalName: string; // e.g., "Visit Japan Web"

  // Timing requirements
  submission: {
    earliestBeforeArrival: string; // e.g., "14d" (14 days)
    latestBeforeArrival: string; // e.g., "0h" (can do on arrival)
    recommended: string; // e.g., "72h"
  };

  // Form sections
  sections: FormSection[];

  // Step-by-step submission guide
  submissionGuide: SubmissionStep[];
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
