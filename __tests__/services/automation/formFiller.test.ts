import { FormFiller } from '../../../src/services/automation/filler/formFiller';
import type { FilledForm } from '../../../src/services/forms/formEngine';
import type { PortalFieldMapping } from '../../../src/types/submission';

// Mock dependencies
jest.mock(
  '../../../src/services/submission/automationScripts',
  () => ({
    AutomationScriptUtils: {
      applyTransform: jest.fn((value: unknown) => value),
    },
  }),
);

jest.mock(
  '../../../src/services/automation/filler/fillStrategies',
  () => ({
    createDefaultFillStrategies: jest.fn(() => {
      const strategies = new Map();
      strategies.set('text', {
        inputType: 'text',
        fillMethod: (_el: string, _val: unknown) =>
          'element.value = value;',
      });
      strategies.set('select', {
        inputType: 'select',
        fillMethod: (_el: string, _val: unknown) =>
          'element.value = value;',
      });
      return strategies;
    }),
  }),
);

function createFilledForm(
  fields: Array<{ id: string; currentValue: unknown }>,
): FilledForm {
  return {
    countryCode: 'JPN',
    countryName: 'Japan',
    portalName: 'Visit Japan Web',
    portalUrl: 'https://vjw.digital.go.jp',
    sections: [
      {
        id: 'personal',
        title: 'Personal Information',
        fields: fields.map((f) => ({
          id: f.id,
          label: f.id,
          type: 'text' as const,
          required: true,
          currentValue: f.currentValue,
          source: 'auto' as const,
          needsUserInput: false,
          countrySpecific: false,
        })),
      },
    ],
    stats: { totalFields: fields.length, autoFilled: 0, userFilled: 0, remaining: fields.length, completionPercentage: 0 },
  };
}

function createFieldMapping(
  overrides: Partial<PortalFieldMapping> = {},
): PortalFieldMapping {
  return {
    fieldId: 'name',
    selector: '#name-input',
    inputType: 'text',
    ...overrides,
  };
}

describe('FormFiller', () => {
  let filler: FormFiller;
  let executeScript: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    filler = new FormFiller({
      timeout: 5000,
      validateAfterFill: false,
      captureScreenshots: false,
      retryFailedFields: false,
      maxRetries: 1,
    });
    executeScript = jest.fn();
  });

  describe('fillForm', () => {
    it('fills all fields and returns 100% fill rate on success', async () => {
      executeScript.mockResolvedValue({
        success: { name: true, passport: true },
        failed: {},
        total: 2,
      });

      const filledForm = createFilledForm([
        { id: 'name', currentValue: 'Taro Yamada' },
        { id: 'passport', currentValue: 'AB1234567' },
      ]);

      const mappings: Record<string, PortalFieldMapping> = {
        name: createFieldMapping({ fieldId: 'name', selector: '#name' }),
        passport: createFieldMapping({
          fieldId: 'passport',
          selector: '#passport',
        }),
      };

      const result = await filler.fillForm(filledForm, mappings, executeScript);

      expect(result.success).toBe(true);
      expect(result.fillRate).toBe(100);
      expect(result.filledFields).toEqual(['name', 'passport']);
      expect(result.failedFields).toHaveLength(0);
    });

    it('returns success with 100% fill rate when there are no fillable fields', async () => {
      const filledForm = createFilledForm([]);
      const mappings: Record<string, PortalFieldMapping> = {};

      const result = await filler.fillForm(filledForm, mappings, executeScript);

      expect(result.success).toBe(true);
      expect(result.fillRate).toBe(100);
      expect(executeScript).not.toHaveBeenCalled();
    });

    it('reports failed fields when script returns failures', async () => {
      executeScript.mockResolvedValue({
        success: { name: true },
        failed: { passport: 'Element not found' },
        total: 2,
      });

      const filledForm = createFilledForm([
        { id: 'name', currentValue: 'Taro' },
        { id: 'passport', currentValue: 'AB123' },
      ]);

      const mappings: Record<string, PortalFieldMapping> = {
        name: createFieldMapping({ fieldId: 'name', selector: '#name' }),
        passport: createFieldMapping({
          fieldId: 'passport',
          selector: '#passport',
        }),
      };

      const result = await filler.fillForm(filledForm, mappings, executeScript);

      expect(result.fillRate).toBe(50);
      expect(result.success).toBe(false);
      expect(result.failedFields).toEqual([
        { fieldId: 'passport', error: 'Element not found' },
      ]);
    });

    it('marks all fields as failed when executeScript throws', async () => {
      executeScript.mockRejectedValue(new Error('WebView crashed'));

      const filledForm = createFilledForm([
        { id: 'name', currentValue: 'Taro' },
      ]);

      const mappings: Record<string, PortalFieldMapping> = {
        name: createFieldMapping({ fieldId: 'name', selector: '#name' }),
      };

      const result = await filler.fillForm(filledForm, mappings, executeScript);

      expect(result.success).toBe(false);
      expect(result.failedFields).toHaveLength(1);
      expect(result.failedFields[0].error).toContain('WebView crashed');
    });

    it('skips fields with empty or undefined values', async () => {
      executeScript.mockResolvedValue({
        success: { name: true },
        failed: {},
        total: 1,
      });

      const filledForm = createFilledForm([
        { id: 'name', currentValue: 'Taro' },
        { id: 'email', currentValue: '' },
        { id: 'phone', currentValue: undefined },
      ]);

      const mappings: Record<string, PortalFieldMapping> = {
        name: createFieldMapping({ fieldId: 'name', selector: '#name' }),
        email: createFieldMapping({ fieldId: 'email', selector: '#email' }),
        phone: createFieldMapping({ fieldId: 'phone', selector: '#phone' }),
      };

      const result = await filler.fillForm(filledForm, mappings, executeScript);

      expect(result.totalFields).toBe(1);
      expect(result.filledFields).toEqual(['name']);
    });

    it('retries failed fields when retryFailedFields is enabled', async () => {
      filler = new FormFiller({
        retryFailedFields: true,
        maxRetries: 1,
        validateAfterFill: false,
      });

      // Initial fill: passport fails
      executeScript.mockResolvedValueOnce({
        success: { name: true },
        failed: { passport: 'Element not found' },
        total: 2,
      });

      // Retry for passport succeeds
      executeScript.mockResolvedValueOnce({ success: true, value: 'AB123' });

      const filledForm = createFilledForm([
        { id: 'name', currentValue: 'Taro' },
        { id: 'passport', currentValue: 'AB123' },
      ]);

      const mappings: Record<string, PortalFieldMapping> = {
        name: createFieldMapping({ fieldId: 'name', selector: '#name' }),
        passport: createFieldMapping({
          fieldId: 'passport',
          selector: '#passport',
        }),
      };

      const result = await filler.fillForm(filledForm, mappings, executeScript);

      expect(result.filledFields).toContain('passport');
    });
  });

  describe('fillSingleField', () => {
    it('fills a single text field and returns success', async () => {
      executeScript.mockResolvedValue({ success: true, value: 'Taro' });

      const mapping = createFieldMapping({
        fieldId: 'name',
        selector: '#name',
        inputType: 'text',
      });

      const result = await filler.fillSingleField(
        'name',
        'Taro',
        mapping,
        executeScript,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        fieldId: 'name',
        value: 'Taro',
        filled: true,
      });
    });

    it('returns error when no fill strategy exists for input type', async () => {
      const mapping = createFieldMapping({
        inputType: 'file' as any,
      });

      const result = await filler.fillSingleField(
        'doc',
        'file.pdf',
        mapping,
        executeScript,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No fill strategy for input type');
    });

    it('returns error when executeScript fails for single field', async () => {
      executeScript.mockRejectedValue(new Error('Element detached'));

      const mapping = createFieldMapping();

      const result = await filler.fillSingleField(
        'name',
        'Taro',
        mapping,
        executeScript,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Single field fill error');
      expect(result.error).toContain('Element detached');
    });

    it('returns failure when script result indicates failure', async () => {
      executeScript.mockResolvedValue({
        success: false,
        error: 'Element not found: #name',
      });

      const mapping = createFieldMapping();

      const result = await filler.fillSingleField(
        'name',
        'Taro',
        mapping,
        executeScript,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Element not found: #name');
    });
  });

  describe('detectAndExtractFields', () => {
    it('returns detected fields from the DOM', async () => {
      const mockFields = {
        firstName: {
          value: 'Taro',
          type: 'text',
          selector: 'input[type="text"]',
          required: true,
        },
        email: {
          value: 'taro@example.com',
          type: 'email',
          selector: 'input[type="email"]',
          required: false,
        },
      };

      executeScript.mockResolvedValue(mockFields);

      const result = await filler.detectAndExtractFields(executeScript);

      expect(result).toEqual(mockFields);
      expect(result.firstName.value).toBe('Taro');
      expect(result.email.type).toBe('email');
    });

    it('returns empty object when no fields are found', async () => {
      executeScript.mockResolvedValue(null);

      const result = await filler.detectAndExtractFields(executeScript);

      expect(result).toEqual({});
    });

    it('returns empty object when detection script throws', async () => {
      executeScript.mockRejectedValue(new Error('Script error'));

      const result = await filler.detectAndExtractFields(executeScript);

      expect(result).toEqual({});
    });
  });
});
