import type { FilledForm } from '../services/forms/formEngine';

export function findFieldInForm(form: FilledForm, fieldId: string) {
  for (const section of form.sections) {
    const field = section.fields.find(f => f.id === fieldId);
    if (field) {return field;}
  }
  return undefined;
}

export function validateFieldValue(field: any, value: unknown): string | undefined {
  // Check if required field is empty
  if (field.required && (value === undefined || value === '' || value === null)) {
    return `${field.label} is required`;
  }

  // Validate against field validation rules
  if (field.validation && value !== undefined && value !== '' && value !== null) {
    const validation = field.validation;
    const stringValue = String(value);
    const numericValue = Number(value);

    if (validation.pattern) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(stringValue)) {
        return `${field.label} format is invalid`;
      }
    }

    if (validation.minLength && stringValue.length < validation.minLength) {
      return `${field.label} must be at least ${validation.minLength} characters`;
    }

    if (validation.maxLength && stringValue.length > validation.maxLength) {
      return `${field.label} cannot exceed ${validation.maxLength} characters`;
    }

    if (validation.min !== undefined && !isNaN(numericValue) && numericValue < validation.min) {
      return `${field.label} must be at least ${validation.min}`;
    }

    if (validation.max !== undefined && !isNaN(numericValue) && numericValue > validation.max) {
      return `${field.label} cannot exceed ${validation.max}`;
    }
  }

  return undefined;
}
