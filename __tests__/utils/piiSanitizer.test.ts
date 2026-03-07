import {
  sanitizeString,
  sanitizeObject,
  sanitizeError,
  sanitizeUrl,
  createSanitizer,
} from '../../src/utils/piiSanitizer';

describe('PII Sanitizer', () => {
  describe('sanitizeString', () => {
    it('should redact passport numbers', () => {
      const input = 'My passport number is AB123456789 and it expires soon';
      const result = sanitizeString(input);
      expect(result).toBe('My passport number is [PASSPORT] and it expires soon');
    });

    it('should redact email addresses', () => {
      const input = 'Contact me at john.doe@example.com for updates';
      const result = sanitizeString(input);
      expect(result).toBe('Contact me at [EMAIL] for updates');
    });

    it('should redact phone numbers', () => {
      const input = 'Call me at +1-555-123-4567 or (555) 987-6543';
      const result = sanitizeString(input);
      expect(result).toBe('Call me at [PHONE] or [PHONE]');
    });

    it('should redact credit card numbers', () => {
      const input = 'My card number is 1234-5678-9012-3456';
      const result = sanitizeString(input);
      expect(result).toBe('My card number is [CARD]');
    });

    it('should redact dates of birth', () => {
      const input = 'Born on 12/25/1990 or 1990-12-25';
      const result = sanitizeString(input);
      expect(result).toBe('Born on [DOB] or [DOB]');
    });

    it('should redact names in common patterns', () => {
      const input = 'Customer: John Smith';
      const result = sanitizeString(input);
      expect(result).toBe('Customer: [NAME]');
    });

    it('should redact addresses', () => {
      const input = 'I live at 123 Main Street in the city';
      const result = sanitizeString(input);
      expect(result).toBe('I live at [ADDRESS] in the city');
    });

    it('should apply custom rules', () => {
      const input = 'Secret code: ABC123XYZ';
      const result = sanitizeString(input, {
        customRules: [
          { pattern: /ABC\d{3}XYZ/g, replacement: '[SECRET]' }
        ]
      });
      expect(result).toBe('Secret code: [SECRET]');
    });

    it('should preserve non-PII content', () => {
      const input = 'The weather is nice today. I like programming.';
      const result = sanitizeString(input);
      expect(result).toBe(input);
    });
  });

  describe('sanitizeObject', () => {
    it('should redact sensitive fields', () => {
      const input = {
        name: 'John Doe',
        password: 'secret123',
        age: 30,
        email: 'john@example.com',
        publicInfo: 'This is public',
      };

      const result = sanitizeObject(input);
      expect(result).toEqual({
        age: 30,
        publicInfo: 'This is public',
      });
      expect(result.name).toBeUndefined();
      expect(result.password).toBeUndefined(); 
      expect(result.email).toBeUndefined();
    });

    it('should preserve structure when requested', () => {
      const input = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        password: 'secret123',
      };

      const result = sanitizeObject(input, { preserveStructure: true });
      expect(result).toEqual({
        firstName: '[REDACTED]',
        lastName: '[REDACTED]',
        age: 30,
        password: '[REDACTED]',
      });
    });

    it('should respect whitelisted fields', () => {
      const input = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        password: 'secret123',
      };

      const result = sanitizeObject(input, { 
        whitelistedFields: ['firstName'] 
      });
      expect(result).toEqual({
        firstName: 'John',
        age: 30,
      });
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: 'John Doe',
          password: 'secret123',
          preferences: {
            email: 'john@example.com',
            theme: 'dark',
          },
        },
        settings: {
          notifications: true,
        },
      };

      const result = sanitizeObject(input);
      expect(result.user.preferences.theme).toBe('dark');
      expect(result.user.preferences.email).toBeUndefined();
      expect(result.settings.notifications).toBe(true);
      expect(result.user.password).toBeUndefined();
      expect(result.user.name).toBeUndefined();
    });

    it('should handle arrays', () => {
      const input = {
        users: [
          { name: 'John Doe', password: 'secret1' },
          { name: 'Jane Smith', password: 'secret2' },
        ],
        tags: ['public', 'visible'],
      };

      const result = sanitizeObject(input);
      expect(result.tags).toEqual(['public', 'visible']);
      expect(result.users[0].password).toBeUndefined();
      expect(result.users[1].password).toBeUndefined();
    });

    it('should handle null and undefined values', () => {
      const input = {
        value1: null,
        value2: undefined,
        name: 'John Doe',
      };

      const result = sanitizeObject(input);
      expect(result.value1).toBeNull();
      expect(result.value2).toBeUndefined();
    });

    it('should handle primitive values', () => {
      expect(sanitizeObject('hello')).toBe('hello');
      expect(sanitizeObject(123)).toBe(123);
      expect(sanitizeObject(true)).toBe(true);
      expect(sanitizeObject(null)).toBeNull();
    });
  });

  describe('sanitizeError', () => {
    it('should sanitize error messages', () => {
      const error = new Error('Failed to authenticate user john@example.com');
      const result = sanitizeError(error);
      
      expect(result.name).toBe('Error');
      expect(result.message).toBe('Failed to authenticate user [EMAIL]');
    });

    it('should sanitize stack traces', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error with john@example.com\n    at test.js:1:1';
      
      const result = sanitizeError(error);
      expect(result.stack).toBe('Error: Test error with [EMAIL]\n    at test.js:1:1');
    });

    it('should handle errors with cause', () => {
      const causeError = new Error('Cause error');
      const error = new Error('Main error');
      (error as any).cause = { 
        error: causeError,
        context: { email: 'user@example.com' }
      };

      const result = sanitizeError(error);
      expect(result.cause.context.email).toBeUndefined();
    });
  });

  describe('sanitizeUrl', () => {
    it('should remove query parameters', () => {
      const url = 'https://api.example.com/users?email=john@example.com&token=secret123';
      const result = sanitizeUrl(url);
      expect(result).toBe('https://api.example.com/users');
    });

    it('should remove fragments', () => {
      const url = 'https://example.com/page#section-with-email=john@example.com';
      const result = sanitizeUrl(url);
      expect(result).toBe('https://example.com/page');
    });

    it('should handle malformed URLs', () => {
      const url = 'not-a-valid-url with john@example.com';
      const result = sanitizeUrl(url);
      expect(result).toBe('not-a-valid-url with [EMAIL]');
    });

    it('should preserve basic URL structure', () => {
      const url = 'https://api.example.com/v1/users';
      const result = sanitizeUrl(url);
      expect(result).toBe('https://api.example.com/v1/users');
    });
  });

  describe('createSanitizer', () => {
    it('should create sanitizer with custom options', () => {
      const options = {
        preserveStructure: true,
        customRules: [
          { pattern: /SECRET\d+/g, replacement: '[CUSTOM]' }
        ]
      };

      const sanitizer = createSanitizer(options);
      
      const stringResult = sanitizer.string('Message with SECRET123');
      expect(stringResult).toBe('Message with [CUSTOM]');

      const objectResult = sanitizer.object({ password: 'test', age: 25 });
      expect(objectResult).toEqual({ password: '[REDACTED]', age: 25 });
    });

    it('should provide all sanitization methods', () => {
      const sanitizer = createSanitizer({});
      
      expect(typeof sanitizer.string).toBe('function');
      expect(typeof sanitizer.object).toBe('function');
      expect(typeof sanitizer.error).toBe('function');
      expect(typeof sanitizer.url).toBe('function');
    });
  });

  describe('edge cases', () => {
    it('should handle empty inputs', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeObject({})).toEqual({});
      expect(sanitizeUrl('')).toBe('');
    });

    it('should handle inputs with only PII', () => {
      const input = 'john@example.com';
      const result = sanitizeString(input);
      expect(result).toBe('[EMAIL]');
    });

    it('should handle mixed case sensitive field names', () => {
      const input = {
        FirstName: 'John',
        EMAIL: 'john@example.com',
        Age: 30,
      };

      const result = sanitizeObject(input);
      expect(result.Age).toBe(30);
      expect(result.FirstName).toBeUndefined();
      expect(result.EMAIL).toBeUndefined();
    });
  });
});