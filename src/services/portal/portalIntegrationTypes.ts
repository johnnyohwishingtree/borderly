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
