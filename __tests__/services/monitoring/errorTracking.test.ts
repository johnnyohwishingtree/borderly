import {
  errorTracker,
  captureError,
  captureNetworkError,
  captureValidationError,
  addBreadcrumb,
  trackNavigation,
  trackUserAction,
} from '../../../src/services/monitoring/errorTracking';

describe('Error Tracking Service', () => {
  const mockDeviceInfo = {
    platform: 'ios',
    version: '17.0',
    model: 'iPhone14',
    isEmulator: false,
  };

  const mockAppState = {
    version: '1.0.0',
    buildNumber: '1',
    isDebug: true,
    activeScreen: 'TestScreen',
    hasProfile: true,
    tripCount: 2,
  };

  beforeEach(() => {
    errorTracker.clear();
    errorTracker.setEnabled(true);
    // Initialize without adding a breadcrumb by manually setting the state
    (errorTracker as any)['deviceInfo'] = mockDeviceInfo;
    (errorTracker as any)['appState'] = mockAppState;
  });

  describe('error capture', () => {
    it('should capture a basic error', () => {
      const error = new Error('Test error message');
      const errorId = captureError(error);

      expect(errorId).toBeTruthy();
      const stats = errorTracker.getErrorStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.recentErrors).toHaveLength(1);
      expect(stats.recentErrors[0].error.name).toBe('Error');
      expect(stats.recentErrors[0].error.message).toBe('Test error message');
    });

    it('should sanitize PII in error messages', () => {
      const error = new Error('Authentication failed for user john@example.com');
      captureError(error);

      const stats = errorTracker.getErrorStats();
      expect(stats.recentErrors[0].error.message).toBe('Authentication failed for user [EMAIL]');
    });

    it('should capture error with context', () => {
      const error = new Error('Form validation failed');
      captureError(error, {
        screen: 'PassportForm',
        flow: 'onboarding:user@example.com',
        userAction: 'submit_form',
        severity: 'high',
        tags: { form: 'passport', email: 'user@example.com' },
      });

      const stats = errorTracker.getErrorStats();
      const capturedError = stats.recentErrors[0];
      expect(capturedError.context.screen).toBe('PassportForm');
      expect(capturedError.context.flow).toBe('onboarding:[EMAIL]');
      expect(capturedError.context.userAction).toBe('submit_form');
      expect(capturedError.severity).toBe('high');
      expect(capturedError.tags.form).toBe('passport');
      expect(capturedError.tags.email).toBe('[REDACTED]'); // Tags are now sanitized
    });

    it('should include device and app context', () => {
      const error = new Error('Test error');
      captureError(error);

      const stats = errorTracker.getErrorStats();
      const capturedError = stats.recentErrors[0];
      expect(capturedError.context.deviceInfo).toEqual(mockDeviceInfo);
      expect(capturedError.context.appState).toEqual(mockAppState);
    });

    it('should not capture errors when disabled', () => {
      errorTracker.setEnabled(false);
      const error = new Error('Disabled error');
      const errorId = captureError(error);

      expect(errorId).toBe('');
      const stats = errorTracker.getErrorStats();
      expect(stats.totalErrors).toBe(0);
    });

    it('should apply beforeSend hook', () => {
      const beforeSendMock = jest.fn(report => {
        report.tags.processed = 'true';
        return report;
      });

      const { ErrorTracker } = require('../../../src/services/monitoring/errorTracking');
      const customTracker = new ErrorTracker({
        beforeSend: beforeSendMock,
      });

      const error = new Error('Hook test');
      customTracker.captureError(error);

      expect(beforeSendMock).toHaveBeenCalled();
    });

    it('should filter out errors via beforeSend hook', () => {
      const beforeSendMock = jest.fn(() => null);

      const { ErrorTracker } = require('../../../src/services/monitoring/errorTracking');
      const customTracker = new ErrorTracker({
        beforeSend: beforeSendMock,
      });

      const error = new Error('Filtered error');
      customTracker.captureError(error);

      const stats = customTracker.getErrorStats();
      expect(stats.totalErrors).toBe(0);
    });
  });

  describe('specialized error capture', () => {
    it('should capture network errors', () => {
      const networkError = new Error('Connection timeout');
      const errorId = captureNetworkError(
        'https://api.example.com/users?email=user@example.com',
        'POST',
        500,
        networkError
      );

      expect(errorId).toBeTruthy();
      const stats = errorTracker.getErrorStats();
      const error = stats.recentErrors[0];
      expect(error.error.name).toBe('NetworkError');
      expect(error.error.message).toContain('Network POST 500');
      expect(error.severity).toBe('high');
      expect(error.tags.type).toBe('network');
      expect(error.tags.url).toBe('https://api.example.com/users'); // URL query params removed
      expect(error.tags.statusCode).toBe('500');
    });

    it('should capture validation errors', () => {
      const errorId = captureValidationError(
        'email',
        'must_be_valid_email',
        'user_registration'
      );

      expect(errorId).toBeTruthy();
      const stats = errorTracker.getErrorStats();
      const error = stats.recentErrors[0];
      expect(error.error.name).toBe('ValidationError');
      expect(error.severity).toBe('low');
      expect(error.tags.type).toBe('validation');
      expect(error.tags.field).toBe('email');
      expect(error.tags.rule).toBe('must_be_valid_email');
      expect(error.tags.context).toBe('user_registration');
    });
  });

  describe('breadcrumb tracking', () => {
    it('should add breadcrumbs', () => {
      addBreadcrumb({
        type: 'user_action',
        message: 'User clicked submit button',
        level: 'info',
        data: { buttonId: 'submit', email: 'user@example.com' },
      });

      const exported = errorTracker.exportErrors();
      expect(exported.breadcrumbs).toHaveLength(1);
      
      const breadcrumb = exported.breadcrumbs[0];
      expect(breadcrumb.type).toBe('user_action');
      expect(breadcrumb.message).toBe('User clicked submit button');
      expect(breadcrumb.level).toBe('info');
      expect(breadcrumb.data?.buttonId).toBe('submit');
      expect(breadcrumb.data?.email).toBe('[REDACTED]'); // Should be sanitized
    });

    it('should limit breadcrumb count', () => {
      // Add more breadcrumbs than the default limit (50)
      for (let i = 0; i < 60; i++) {
        addBreadcrumb({
          type: 'user_action',
          message: `Action ${i}`,
          level: 'info',
        });
      }

      const exported = errorTracker.exportErrors();
      expect(exported.breadcrumbs).toHaveLength(50);
      expect(exported.breadcrumbs[0].message).toBe('Action 10'); // First 10 should be dropped
    });

    it('should track navigation events', () => {
      trackNavigation('HomeScreen', 'ProfileScreen');

      const exported = errorTracker.exportErrors();
      expect(exported.breadcrumbs).toHaveLength(1);
      expect(exported.breadcrumbs[0].type).toBe('navigation');
      expect(exported.breadcrumbs[0].message).toContain('HomeScreen');
      expect(exported.breadcrumbs[0].message).toContain('ProfileScreen');
    });

    it('should track user actions', () => {
      trackUserAction('button_click', { 
        buttonId: 'submit',
        formData: { email: 'user@example.com' }
      });

      const exported = errorTracker.exportErrors();
      expect(exported.breadcrumbs).toHaveLength(1);
      expect(exported.breadcrumbs[0].type).toBe('user_action');
      expect(exported.breadcrumbs[0].data?.formData?.email).toBe('[REDACTED]'); // Should be redacted in nested object
    });

    it('should sanitize navigation data', () => {
      trackNavigation('Screen:user@example.com', 'ProfileScreen');

      const exported = errorTracker.exportErrors();
      const breadcrumb = exported.breadcrumbs[0];
      expect(breadcrumb.message).toContain('[EMAIL]');
      expect(breadcrumb.data?.from).toBe('Screen:[EMAIL]');
    });
  });

  describe('app state management', () => {
    it('should update app state', () => {
      errorTracker.updateAppState({ activeScreen: 'NewScreen', tripCount: 5 });

      const error = new Error('Test error');
      captureError(error);

      const stats = errorTracker.getErrorStats();
      const capturedError = stats.recentErrors[0];
      expect(capturedError.context.appState?.activeScreen).toBe('NewScreen');
      expect(capturedError.context.appState?.tripCount).toBe(5);
      expect(capturedError.context.appState?.hasProfile).toBe(true); // Should preserve other fields
    });
  });

  describe('error statistics', () => {
    beforeEach(() => {
      // Add some test errors
      captureError(new Error('JS Error'), { severity: 'high' });
      captureNetworkError('https://api.test.com', 'GET', 404, new Error('Not found'));
      captureValidationError('email', 'invalid', 'format');
      captureError(new Error('Another error'), { severity: 'low' });
    });

    it('should count errors by type', () => {
      const stats = errorTracker.getErrorStats();
      expect(stats.errorsByType.javascript).toBe(2);
      expect(stats.errorsByType.network).toBe(1);
      expect(stats.errorsByType.validation).toBe(1);
    });

    it('should count errors by severity', () => {
      const stats = errorTracker.getErrorStats();
      expect(stats.errorsBySeverity.high).toBe(1); // JS error with explicit high severity
      expect(stats.errorsBySeverity.medium).toBe(1); // network error (404 status)
      expect(stats.errorsBySeverity.low).toBe(2); // validation error + low severity JS error
    });

    it('should filter recent errors', () => {
      // Mock old errors
      const oldTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      jest.spyOn(Date, 'now').mockReturnValue(oldTime);
      
      captureError(new Error('Old error'));
      
      jest.restoreAllMocks(); // Restore Date.now
      
      const stats = errorTracker.getErrorStats();
      // Should not include the old error in recent errors
      expect(stats.totalErrors).toBe(5); // 4 from beforeEach + 1 old
      expect(stats.recentErrors).toHaveLength(4); // Only the recent ones
    });
  });

  describe('error severity determination', () => {
    it('should classify security errors as critical', () => {
      const error = new Error('Security violation: unauthorized access');
      captureError(error);

      const stats = errorTracker.getErrorStats();
      expect(stats.recentErrors[0].severity).toBe('critical');
    });

    it('should classify network errors as high severity', () => {
      const error = new Error('Network timeout occurred');
      captureError(error);

      const stats = errorTracker.getErrorStats();
      expect(stats.recentErrors[0].severity).toBe('high');
    });

    it('should classify validation errors as medium severity', () => {
      const error = new Error('Validation failed for input field');
      captureError(error);

      const stats = errorTracker.getErrorStats();
      expect(stats.recentErrors[0].severity).toBe('medium');
    });

    it('should use provided severity over automatic classification', () => {
      const error = new Error('Security violation');
      captureError(error, { severity: 'low' });

      const stats = errorTracker.getErrorStats();
      expect(stats.recentErrors[0].severity).toBe('low');
    });
  });

  describe('error fingerprinting', () => {
    it('should generate consistent fingerprints for similar errors', () => {
      const error1 = new Error('Database connection failed');
      const error2 = new Error('Database connection failed');
      
      captureError(error1);
      captureError(error2);

      const stats = errorTracker.getErrorStats();
      expect(stats.recentErrors[0].fingerprint).toBe(stats.recentErrors[1].fingerprint);
    });

    it('should generate different fingerprints for different errors', () => {
      const error1 = new Error('Database connection failed');
      const error2 = new Error('Network timeout');
      
      captureError(error1);
      captureError(error2);

      const stats = errorTracker.getErrorStats();
      expect(stats.recentErrors[0].fingerprint).not.toBe(stats.recentErrors[1].fingerprint);
    });
  });

  describe('data export and cleanup', () => {
    it('should export errors and breadcrumbs', () => {
      captureError(new Error('Test error'));
      addBreadcrumb({ type: 'user_action', message: 'Test action', level: 'info' });

      const exported = errorTracker.exportErrors();
      expect(exported.errors).toHaveLength(1);
      expect(exported.breadcrumbs).toHaveLength(2); // Error capture + manual breadcrumb
      
      // Check that user action breadcrumb exists
      const userActionBreadcrumb = exported.breadcrumbs.find(b => b.type === 'user_action');
      expect(userActionBreadcrumb).toBeDefined();
      expect(userActionBreadcrumb?.message).toBe('Test action');
    });

    it('should clear all data', () => {
      captureError(new Error('Test error'));
      addBreadcrumb({ type: 'user_action', message: 'Test action', level: 'info' });

      errorTracker.clear();

      const stats = errorTracker.getErrorStats();
      const exported = errorTracker.exportErrors();
      expect(stats.totalErrors).toBe(0);
      expect(exported.breadcrumbs).toHaveLength(0);
    });
  });
});