export interface FormField {
  id: string;
  type: 'text' | 'select' | 'date' | 'boolean' | 'number';
  label: string;
  required: boolean;
  options?: string[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  autoFillSource?: string; // dot notation path to profile data
  countrySpecific?: boolean;
}

export interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
}

export interface CountrySchema {
  countryCode: string;
  countryName: string;
  portalInfo: {
    name: string;
    url: string;
    description: string;
  };
  sections: FormSection[];
  submissionSteps: {
    title: string;
    description: string;
    screenshots?: string[];
  }[];
}
