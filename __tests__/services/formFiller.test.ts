/**
 * Unit tests for FormFiller.fillForm()
 *
 * FormFiller takes a FilledForm + field mappings + an executeScript function,
 * generates a JavaScript fill script, executes it, and returns a FormFillResult.
 * These tests mock executeScript to control the simulated DOM outcomes.
 */
import { FormFiller } from '../../src/services/automation/formFiller';
import type { FormFillConfig } from '../../src/services/automation/formFiller';
import type { FilledForm } from '../../src/services/forms/formEngine';
import type { PortalFieldMapping } from '../../src/types/submission';

// ─── Test helpers ─────────────────────────────────────────────────────────

function makeFilledForm(
  fields: Array<{ id: string; value: string }>,
): FilledForm {
  return {
    profileId: 'test-profile',
    countryCode: 'JPN',
    fillStats: {
      totalFields: fields.length,
      autoFilledFields: fields.length,
      manualFields: 0,
      fillPercentage: 100,
    },
    sections: [
      {
        id: 'section-1',
        title: 'Personal Info',
        fields: fields.map((f) => ({
          id: f.id,
          label: f.id,
          type: 'text' as const,
          currentValue: f.value,
          isAutoFilled: true,
          isRequired: true,
        })),
      },
    ],
  };
}

function makeMapping(
  fieldId: string,
  overrides: Partial<PortalFieldMapping> = {},
): PortalFieldMapping {
  return {
    fieldId,
    selector: `#${fieldId}`,
    inputType: 'text',
    required: true,
    ...overrides,
  };
}

/** Build a script executor that returns a successful result for all fields. */
function makeSuccessExecutor(
  fieldIds: string[],
): (code: string) => Promise<unknown> {
  const success: Record<string, true> = {};
  fieldIds.forEach((id) => { success[id] = true; });
  return jest.fn().mockResolvedValue({ success, failed: {}, total: fieldIds.length });
}

/** Build a script executor that returns all fields as failed. */
function makeFailExecutor(
  fieldIds: string[],
  errorMsg = 'Element not found',
): (code: string) => Promise<unknown> {
  const failed: Record<string, string> = {};
  fieldIds.forEach((id) => { failed[id] = errorMsg; });
  return jest.fn().mockResolvedValue({ success: {}, failed, total: fieldIds.length });
}

// ─── FormFiller construction ───────────────────────────────────────────────

describe('FormFiller — construction', () => {
  it('creates an instance with default config', () => {
    const filler = new FormFiller();
    expect(filler).toBeInstanceOf(FormFiller);
  });

  it('accepts partial config overrides', () => {
    const config: Partial<FormFillConfig> = {
      timeout: 10000,
      maxRetries: 1,
      validateAfterFill: false,
      retryFailedFields: false,
    };
    expect(() => new FormFiller(config)).not.toThrow();
  });
});

// ─── fillForm — happy path ─────────────────────────────────────────────────

describe('FormFiller.fillForm — happy path', () => {
  it('returns 100% fill rate when all fields succeed', async () => {
    const filler = new FormFiller({ retryFailedFields: false });
    const form = makeFilledForm([
      { id: 'surname', value: 'Smith' },
      { id: 'givenNames', value: 'John' },
    ]);
    const mappings: Record<string, PortalFieldMapping> = {
      surname: makeMapping('surname'),
      givenNames: makeMapping('givenNames'),
    };

    const execute = makeSuccessExecutor(['surname', 'givenNames']);
    const result = await filler.fillForm(form, mappings, execute);

    expect(result.fillRate).toBe(100);
    expect(result.success).toBe(true);
    expect(result.filledFields).toEqual(expect.arrayContaining(['surname', 'givenNames']));
    expect(result.failedFields).toHaveLength(0);
  });

  it('reports totalFields equal to fillable (mapped & valued) fields', async () => {
    const filler = new FormFiller({ retryFailedFields: false });
    const form = makeFilledForm([
      { id: 'passport', value: 'AB123456' },
      { id: 'nationality', value: 'USA' },
    ]);
    const mappings: Record<string, PortalFieldMapping> = {
      passport: makeMapping('passport'),
      nationality: makeMapping('nationality'),
    };

    const execute = makeSuccessExecutor(['passport', 'nationality']);
    const result = await filler.fillForm(form, mappings, execute);

    expect(result.totalFields).toBe(2);
  });
});

// ─── fillForm — edge cases ────────────────────────────────────────────────

describe('FormFiller.fillForm — edge cases', () => {
  it('returns success with 100% fill rate when form has no fields', async () => {
    const filler = new FormFiller({ retryFailedFields: false });
    const form = makeFilledForm([]);
    const execute = jest.fn();

    const result = await filler.fillForm(form, {}, execute);

    expect(result.success).toBe(true);
    expect(result.fillRate).toBe(100);
    expect(result.totalFields).toBe(0);
    expect(execute).not.toHaveBeenCalled();
  });

  it('skips fields that have no value (empty string)', async () => {
    const filler = new FormFiller({ retryFailedFields: false });
    const form = makeFilledForm([
      { id: 'surname', value: '' }, // no value — should not be sent
      { id: 'givenNames', value: 'Jane' },
    ]);
    const mappings: Record<string, PortalFieldMapping> = {
      surname: makeMapping('surname'),
      givenNames: makeMapping('givenNames'),
    };

    const execute = makeSuccessExecutor(['givenNames']);
    const result = await filler.fillForm(form, mappings, execute);

    // Only givenNames was fillable
    expect(result.totalFields).toBe(1);
    expect(result.filledFields).toContain('givenNames');
  });

  it('skips fields that have no mapping', async () => {
    const filler = new FormFiller({ retryFailedFields: false });
    const form = makeFilledForm([
      { id: 'unmapped', value: 'some value' },
      { id: 'surname', value: 'Smith' },
    ]);
    // Only surname has a mapping
    const mappings: Record<string, PortalFieldMapping> = {
      surname: makeMapping('surname'),
    };

    const execute = makeSuccessExecutor(['surname']);
    const result = await filler.fillForm(form, mappings, execute);

    expect(result.totalFields).toBe(1);
    expect(result.filledFields).toContain('surname');
  });

  it('handles null/undefined script result gracefully', async () => {
    const filler = new FormFiller({ retryFailedFields: false });
    const form = makeFilledForm([{ id: 'surname', value: 'Smith' }]);
    const mappings: Record<string, PortalFieldMapping> = {
      surname: makeMapping('surname'),
    };
    const execute = jest.fn().mockResolvedValue(null);

    const result = await filler.fillForm(form, mappings, execute);

    // All fields should be in failedFields when result is invalid
    expect(result.failedFields.length).toBeGreaterThan(0);
    expect(result.filledFields).toHaveLength(0);
  });

  it('handles script executor throwing an error', async () => {
    const filler = new FormFiller({ retryFailedFields: false });
    const form = makeFilledForm([{ id: 'surname', value: 'Smith' }]);
    const mappings: Record<string, PortalFieldMapping> = {
      surname: makeMapping('surname'),
    };
    const execute = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await filler.fillForm(form, mappings, execute);

    expect(result.success).toBe(false);
    expect(result.filledFields).toHaveLength(0);
    expect(result.failedFields).toHaveLength(1);
    expect(result.failedFields[0].error).toContain('Network error');
  });
});

// ─── fillForm — fill rate and success threshold ───────────────────────────

describe('FormFiller.fillForm — fill rate and success threshold', () => {
  it('marks success=true when fill rate >= 80%', async () => {
    const filler = new FormFiller({ retryFailedFields: false });
    // 5 fields total, 4 succeed = 80%
    const fieldIds = ['a', 'b', 'c', 'd', 'e'];
    const form = makeFilledForm(fieldIds.map((id) => ({ id, value: 'val' })));
    const mappings: Record<string, PortalFieldMapping> = Object.fromEntries(
      fieldIds.map((id) => [id, makeMapping(id)]),
    );

    const success: Record<string, true> = { a: true, b: true, c: true, d: true };
    const failed: Record<string, string> = { e: 'not found' };
    const execute = jest.fn().mockResolvedValue({ success, failed, total: 5 });

    const result = await filler.fillForm(form, mappings, execute);
    expect(result.fillRate).toBe(80);
    expect(result.success).toBe(true);
  });

  it('marks success=false when fill rate < 80%', async () => {
    const filler = new FormFiller({ retryFailedFields: false });
    const fieldIds = ['a', 'b', 'c', 'd', 'e'];
    const form = makeFilledForm(fieldIds.map((id) => ({ id, value: 'val' })));
    const mappings: Record<string, PortalFieldMapping> = Object.fromEntries(
      fieldIds.map((id) => [id, makeMapping(id)]),
    );

    const execute = makeFailExecutor(fieldIds);
    const result = await filler.fillForm(form, mappings, execute);

    expect(result.fillRate).toBe(0);
    expect(result.success).toBe(false);
  });

  it('reports correct fill rate for partial success', async () => {
    const filler = new FormFiller({ retryFailedFields: false });
    const fieldIds = ['a', 'b', 'c', 'd'];
    const form = makeFilledForm(fieldIds.map((id) => ({ id, value: 'val' })));
    const mappings: Record<string, PortalFieldMapping> = Object.fromEntries(
      fieldIds.map((id) => [id, makeMapping(id)]),
    );

    // 2 out of 4 succeed = 50%
    const execute = jest.fn().mockResolvedValue({
      success: { a: true, b: true },
      failed: { c: 'not found', d: 'not found' },
      total: 4,
    });

    const result = await filler.fillForm(form, mappings, execute);
    expect(result.fillRate).toBe(50);
    expect(result.filledFields).toHaveLength(2);
    expect(result.failedFields).toHaveLength(2);
  });
});

// ─── fillForm — input types ───────────────────────────────────────────────

describe('FormFiller.fillForm — input type strategies', () => {
  const inputTypes: Array<PortalFieldMapping['inputType']> = [
    'text',
    'select',
    'radio',
    'checkbox',
    'date',
  ];

  it.each(inputTypes)(
    'generates a fill script for inputType=%s without throwing',
    async (inputType) => {
      const filler = new FormFiller({ retryFailedFields: false });
      const form = makeFilledForm([{ id: 'field1', value: 'test-value' }]);
      const mappings: Record<string, PortalFieldMapping> = {
        field1: makeMapping('field1', { inputType }),
      };

      const execute = jest.fn().mockResolvedValue({
        success: { field1: true },
        failed: {},
        total: 1,
      });

      const result = await filler.fillForm(form, mappings, execute);
      expect(result.filledFields).toContain('field1');
    },
  );
});

// ─── fillForm — field transforms ─────────────────────────────────────────

describe('FormFiller.fillForm — field transforms', () => {
  it('applies date_format transform before filling', async () => {
    const filler = new FormFiller({ retryFailedFields: false });
    const form = makeFilledForm([{ id: 'dob', value: '1990-05-15' }]);
    const mappings: Record<string, PortalFieldMapping> = {
      dob: makeMapping('dob', {
        transform: {
          type: 'date_format',
          fromFormat: 'YYYY-MM-DD',
          toFormat: 'YYYY/MM/DD',
        },
      }),
    };

    let capturedScript = '';
    const execute = jest.fn().mockImplementation(async (code: string) => {
      capturedScript = code;
      return { success: { dob: true }, failed: {}, total: 1 };
    });

    await filler.fillForm(form, mappings, execute);

    // The transformed date should appear in the generated script
    expect(capturedScript).toContain('1990/05/15');
  });

  it('applies boolean_to_yesno transform before filling', async () => {
    const filler = new FormFiller({ retryFailedFields: false });
    const form = makeFilledForm([{ id: 'hasDrugs', value: 'false' }]);
    const mappings: Record<string, PortalFieldMapping> = {
      hasDrugs: makeMapping('hasDrugs', {
        transform: {
          type: 'boolean_to_yesno',
        },
      }),
    };

    let capturedScript = '';
    const execute = jest.fn().mockImplementation(async (code: string) => {
      capturedScript = code;
      return { success: { hasDrugs: true }, failed: {}, total: 1 };
    });

    await filler.fillForm(form, mappings, execute);

    // "false" boolean should transform to "No"
    expect(capturedScript.toLowerCase()).toContain('no');
  });
});

// ─── fillSingleField ─────────────────────────────────────────────────────

describe('FormFiller.fillSingleField', () => {
  it('returns success=true when script succeeds', async () => {
    const filler = new FormFiller();
    const mapping = makeMapping('surname');
    const execute = jest
      .fn()
      .mockResolvedValue({ success: true, value: 'Smith' });

    const result = await filler.fillSingleField('surname', 'Smith', mapping, execute);
    expect(result.success).toBe(true);
  });

  it('returns success=false when script returns success=false', async () => {
    const filler = new FormFiller();
    const mapping = makeMapping('surname');
    const execute = jest
      .fn()
      .mockResolvedValue({ success: false, error: 'Element not found: #surname' });

    const result = await filler.fillSingleField('surname', 'Smith', mapping, execute);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('returns success=false when execute throws', async () => {
    const filler = new FormFiller();
    const mapping = makeMapping('surname');
    const execute = jest.fn().mockRejectedValue(new Error('WebView crashed'));

    const result = await filler.fillSingleField('surname', 'Smith', mapping, execute);
    expect(result.success).toBe(false);
    expect(result.error).toContain('WebView crashed');
  });

  it('returns success=false for unsupported input type', async () => {
    const filler = new FormFiller();
    const mapping = makeMapping('upload', { inputType: 'unsupported-type' as any });
    const execute = jest.fn();

    const result = await filler.fillSingleField('upload', 'file.pdf', mapping, execute);
    expect(result.success).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });

  it('generates a script that targets the correct selector', async () => {
    const filler = new FormFiller();
    const mapping = makeMapping('myField', { selector: '#custom-selector' });
    let capturedCode = '';
    const execute = jest.fn().mockImplementation(async (code: string) => {
      capturedCode = code;
      return { success: true };
    });

    await filler.fillSingleField('myField', 'test', mapping, execute);
    expect(capturedCode).toContain('#custom-selector');
  });
});

// ─── detectAndExtractFields ───────────────────────────────────────────────

describe('FormFiller.detectAndExtractFields', () => {
  it('returns an empty object when execute returns null', async () => {
    const filler = new FormFiller();
    const execute = jest.fn().mockResolvedValue(null);

    const fields = await filler.detectAndExtractFields(execute);
    expect(fields).toEqual({});
  });

  it('returns an empty object when execute throws', async () => {
    const filler = new FormFiller();
    const execute = jest.fn().mockRejectedValue(new Error('script error'));

    const fields = await filler.detectAndExtractFields(execute);
    expect(fields).toEqual({});
  });

  it('returns the fields object when execute succeeds', async () => {
    const filler = new FormFiller();
    const mockFields = {
      surname: { value: 'Smith', type: 'text', selector: 'input[type="text"]', required: true },
    };
    const execute = jest.fn().mockResolvedValue(mockFields);

    const fields = await filler.detectAndExtractFields(execute);
    expect(fields).toEqual(mockFields);
  });

  it('calls execute with a script containing common field selectors', async () => {
    const filler = new FormFiller();
    let capturedCode = '';
    const execute = jest.fn().mockImplementation(async (code: string) => {
      capturedCode = code;
      return {};
    });

    await filler.detectAndExtractFields(execute);

    expect(capturedCode).toContain('input[type="text"]');
    expect(capturedCode).toContain('select');
    expect(capturedCode).toContain('textarea');
  });
});
