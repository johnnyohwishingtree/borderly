export interface PortalInfo {
  name: string;
  url: string;
  countryCode: string;
  features: {
    supportsDeepLinks: boolean;
    supportsAutoFill: boolean;
    requiresManualEntry: boolean;
  };
  guidelines: {
    recommendedBrowser: string[];
    preparationTips: string[];
    commonIssues: string[];
  };
}

export interface PortalLaunchOptions {
  openInExternalBrowser?: boolean;
  prefillData?: boolean;
  trackingParams?: Record<string, string>;
}

export interface PortalAnalyticsEvent {
  countryCode: string;
  success: boolean;
  errorCategory?: string; // e.g. 'timeout', 'url_invalid', 'cannot_open', 'unknown'
  timestamp: string; // ISO 8601
}
