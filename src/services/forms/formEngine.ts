import { TravelerProfile } from '../../types/profile';
import { TripLeg } from '../../types/trip';
import { CountryFormSchema, FormField, FormSection } from '../../types/schema';
import { resolveAutoFillPath, FormContext } from './fieldMapper';

export interface FilledFormField extends FormField {
  currentValue: unknown;
  source: 'auto' | 'user' | 'default' | 'empty';
  needsUserInput: boolean;
}

export interface FilledFormSection {
  id: string;
  title: string;
  fields: FilledFormField[];
}

export interface FilledForm {
  countryCode: string;
  countryName: string;
  portalName: string;
  portalUrl: string;
  sections: FilledFormSection[];
  stats: FormStats;
}

export interface FormStats {
  totalFields: number;
  autoFilled: number;
  userFilled: number;
  remaining: number;
  completionPercentage: number;
}

/**
 * Core form generation engine. Takes a traveler profile, trip leg, and country schema
 * to produce a filled form with auto-populated data and tracking of what needs user input.
 */
export function generateFilledForm(
  profile: TravelerProfile,
  leg: TripLeg,
  schema: CountryFormSchema,
  existingFormData?: Record<string, unknown>
): FilledForm {
  const context: FormContext = { profile, leg };
  let autoFilled = 0;
  let userFilled = 0;
  let remaining = 0;
  let totalFields = 0;

  const sections: FilledFormSection[] = schema.sections.map(section => ({
    id: section.id,
    title: section.title,
    fields: section.fields.map(field => {
      totalFields++;
      return processFormField(field, context, existingFormData);
    }),
  }));

  // Count field statistics
  sections.forEach(section => {
    section.fields.forEach(field => {
      switch (field.source) {
        case 'auto':
          autoFilled++;
          break;
        case 'user':
          userFilled++;
          break;
        default:
          remaining++;
          break;
      }
    });
  });

  const completionPercentage = totalFields > 0 
    ? Math.round(((autoFilled + userFilled) / totalFields) * 100)
    : 0;

  return {
    countryCode: schema.countryCode,
    countryName: schema.countryName,
    portalName: schema.portalName,
    portalUrl: schema.portalUrl,
    sections,
    stats: { 
      totalFields, 
      autoFilled, 
      userFilled, 
      remaining, 
      completionPercentage 
    },
  };
}

/**
 * Processes a single form field to determine its value and source.
 */
function processFormField(
  field: FormField,
  context: FormContext,
  existingFormData?: Record<string, unknown>
): FilledFormField {
  // Check if user already provided this value
  if (existingFormData?.[field.id] !== undefined) {
    const userValue = existingFormData[field.id];
    return {
      ...field,
      currentValue: userValue,
      source: 'user',
      needsUserInput: false,
    };
  }

  // Try auto-fill from profile/trip
  if (field.autoFillSource) {
    const resolved = resolveAutoFillPath(field.autoFillSource, context);
    if (isValidFieldValue(resolved, field.type)) {
      return {
        ...field,
        currentValue: resolved,
        source: 'auto',
        needsUserInput: false,
      };
    }
  }

  // Field needs user input - set appropriate default value
  const defaultValue = getDefaultValue(field);
  return {
    ...field,
    currentValue: defaultValue,
    source: defaultValue !== null ? 'default' : 'empty',
    needsUserInput: true,
  };
}

/**
 * Checks if a resolved value is valid for a given field type.
 */
function isValidFieldValue(value: unknown, fieldType: string): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  switch (fieldType) {
    case 'text':
    case 'textarea':
      return typeof value === 'string' && value.trim().length > 0;
    
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    
    case 'date':
      if (typeof value === 'string') {
        return !isNaN(Date.parse(value));
      }
      return value instanceof Date && !isNaN(value.getTime());
    
    case 'boolean':
      return typeof value === 'boolean';
    
    case 'select':
      return typeof value === 'string' && value.length > 0;
    
    default:
      return false;
  }
}

/**
 * Gets the appropriate default value for a field type.
 */
function getDefaultValue(field: FormField): unknown {
  switch (field.type) {
    case 'boolean':
      return false;
    
    case 'number':
      return field.validation?.min ?? 0;
    
    case 'select':
      return field.options?.[0]?.value ?? '';
    
    case 'text':
    case 'textarea':
    case 'date':
    default:
      return '';
  }
}

/**
 * Updates form data with new user input for a specific field.
 */
export function updateFormData(
  currentFormData: Record<string, unknown>,
  fieldId: string,
  value: unknown
): Record<string, unknown> {
  return {
    ...currentFormData,
    [fieldId]: value,
  };
}

/**
 * Validates that all required fields in a form have values.
 */
export function validateFormCompletion(form: FilledForm): {
  isComplete: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  form.sections.forEach(section => {
    section.fields.forEach(field => {
      if (field.required && field.needsUserInput) {
        const isEmpty = field.currentValue === '' || 
                       field.currentValue === null || 
                       field.currentValue === undefined;
        
        if (isEmpty) {
          missingFields.push(field.id);
        }
      }
    });
  });

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Gets only the country-specific fields that need user input.
 * This implements the "Smart Delta" feature - only show fields unique to this country.
 */
export function getCountrySpecificFields(form: FilledForm): FilledFormField[] {
  const countrySpecificFields: FilledFormField[] = [];

  form.sections.forEach(section => {
    section.fields.forEach(field => {
      if (field.countrySpecific && field.needsUserInput) {
        countrySpecificFields.push(field);
      }
    });
  });

  return countrySpecificFields;
}

/**
 * Exports form data in a format suitable for copying to government portals.
 */
export function exportFormData(form: FilledForm): Record<string, unknown> {
  const exportData: Record<string, unknown> = {};

  form.sections.forEach(section => {
    section.fields.forEach(field => {
      if (field.currentValue !== '' && field.currentValue !== null && field.currentValue !== undefined) {
        exportData[field.id] = field.currentValue;
      }
    });
  });

  return exportData;
}

/**
 * Calculates form completion statistics for progress tracking.
 */
export function calculateFormProgress(form: FilledForm): {
  totalSections: number;
  completedSections: number;
  sectionProgress: { sectionId: string; completed: number; total: number }[];
} {
  const sectionProgress = form.sections.map(section => {
    const total = section.fields.filter(f => f.required).length;
    const completed = section.fields.filter(f => f.required && !f.needsUserInput).length;
    
    return {
      sectionId: section.id,
      completed,
      total,
    };
  });

  const completedSections = sectionProgress.filter(s => s.completed === s.total).length;

  return {
    totalSections: form.sections.length,
    completedSections,
    sectionProgress,
  };
}