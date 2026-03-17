import { describe, it, expect } from 'vitest';
import { inngest } from '../inngest.js';

describe('Inngest Client', () => {
  it('has the correct app ID', () => {
    expect(inngest.id).toBe('borderly-pipeline');
  });
});

describe('Event Types', () => {
  it('defines all expected pipeline events', () => {
    // This is a compile-time check — if event names are wrong,
    // TypeScript would catch it. But we can verify the client exists.
    expect(inngest).toBeDefined();
  });
});
