import { logger } from '@/utils/logger';

describe('logger', () => {
  const originalDev = (global as Record<string, unknown>).__DEV__;

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    (global as Record<string, unknown>).__DEV__ = originalDev;
  });

  describe('debug', () => {
    it('calls console.log when __DEV__ is true', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      (global as Record<string, unknown>).__DEV__ = true;

      logger.debug('test message', 42);

      expect(spy).toHaveBeenCalledWith('test message', 42);
    });

    it('does not call console.log when __DEV__ is false', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      (global as Record<string, unknown>).__DEV__ = false;

      logger.debug('should not appear');

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('calls console.log with all arguments', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();

      logger.info('[Service]', 'started', { port: 3000 });

      expect(spy).toHaveBeenCalledWith('[Service]', 'started', { port: 3000 });
    });
  });

  describe('warn', () => {
    it('calls console.warn with all arguments', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation();

      logger.warn('[Storage]', 'cache miss');

      expect(spy).toHaveBeenCalledWith('[Storage]', 'cache miss');
    });
  });

  describe('error', () => {
    it('calls console.error with all arguments', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      const err = new Error('fail');

      logger.error('[Network]', 'request failed', err);

      expect(spy).toHaveBeenCalledWith('[Network]', 'request failed', err);
    });
  });
});
