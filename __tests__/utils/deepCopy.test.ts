import { deepCopy } from '../../src/utils/deepCopy';

describe('deepCopy', () => {
  it('copies a simple object', () => {
    const obj = { a: 1, b: 'two' };
    const copy = deepCopy(obj);
    expect(copy).toEqual(obj);
    expect(copy).not.toBe(obj);
  });

  it('copies nested objects without shared references', () => {
    const obj = { nested: { value: 42 } };
    const copy = deepCopy(obj);
    copy.nested.value = 99;
    expect(obj.nested.value).toBe(42);
  });

  it('copies arrays', () => {
    const arr = [1, [2, 3], { a: 4 }];
    const copy = deepCopy(arr);
    expect(copy).toEqual(arr);
    expect(copy).not.toBe(arr);
    expect(copy[1]).not.toBe(arr[1]);
  });

  it('copies primitives', () => {
    expect(deepCopy(42)).toBe(42);
    expect(deepCopy('hello')).toBe('hello');
    expect(deepCopy(true)).toBe(true);
    expect(deepCopy(null)).toBe(null);
  });

  it('loses undefined values in objects (JSON serialization)', () => {
    const obj = { a: 1, b: undefined };
    const copy = deepCopy(obj);
    expect(copy).toEqual({ a: 1 });
    expect('b' in copy).toBe(false);
  });

  it('loses Date objects (converts to string)', () => {
    const obj = { date: new Date('2025-01-01') };
    const copy = deepCopy(obj);
    expect(typeof copy.date).toBe('string');
  });

  it('handles empty object', () => {
    expect(deepCopy({})).toEqual({});
  });

  it('handles empty array', () => {
    expect(deepCopy([])).toEqual([]);
  });
});
