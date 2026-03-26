/**
 * Automation Services - Core WebView automation and form filling engine
 *
 * This module provides the main exports for the automation engine that enables
 * automated form filling in government portals through controlled WebView interactions.
 */

// Core automation services
export { FormFiller } from './filler';
export { DOMInteraction } from './interaction';
export { NavigationController } from './navigation';
export { ElementDetector } from './detection';
export { UploadHandler } from './upload';

// Import classes for type annotations
import { FormFiller } from './filler';
import { DOMInteraction } from './interaction';
import { NavigationController } from './navigation';
import { ElementDetector } from './detection';
import { UploadHandler } from './upload';

// Portal detection utility
import { PortalDetector } from '../../utils/portal';

// Re-export types for external use
export type {
  FileInfo,
  UploadTarget,
  UploadResult,
  UploadConfig
} from './upload';

export type {
  DOMInteractionConfig,
  ElementInteractionOptions,
  ElementDetectionResult,
  ClickResult,
  TypeResult
} from './interaction';

export type {
  NavigationState,
  NavigationStep,
  NavigationFlow,
  FlowStep,
  NavigationConfig
} from './navigation';

export type {
  DetectionConfig,
  DetectionCriteria,
  PollingStrategy,
  ElementDetectionResult as DetectorElementResult,
  ElementInfo
} from './detection';

export type {
  FormFillConfig as FillerConfig,
  FormFillResult as FillerResult
} from './filler';

// Automation utilities
export { SelectorBuilder } from './selectorBuilder';
export { DataTransformer } from './dataTransformer';
export { ElementUtils } from './elementUtils';
export { ErrorHandling } from './errorHandling';
export { PerformanceMonitor } from './performanceMonitor';
export { AutomationPatterns } from './automationPatterns';

export {
  PortalDetector
} from '../../utils/portal';

export type {
  PortalIdentification,
  PortalFeatures,
  AuthenticationInfo,
  FormStructureInfo,
  CaptchaInfo,
  PortalChangeInfo
} from '../../utils/portal';

/**
 * Automation Engine - Main orchestrator class
 *
 * Coordinates all automation services to provide a unified interface
 * for government portal form automation.
 */
export class AutomationEngine {
  private formFiller: FormFiller;
  private domInteraction: DOMInteraction;
  private navigationController: NavigationController;
  private elementDetector: ElementDetector;
  private uploadHandler: UploadHandler;
  private portalDetector: PortalDetector;

  constructor(config: {
    formFiller?: any;
    domInteraction?: any;
    navigation?: any;
    elementDetection?: any;
    upload?: any;
  } = {}) {
    this.formFiller = new FormFiller(config.formFiller);
    this.domInteraction = new DOMInteraction(config.domInteraction);
    this.navigationController = new NavigationController(config.navigation);
    this.elementDetector = new ElementDetector(config.elementDetection);
    this.uploadHandler = new UploadHandler(config.upload);
    this.portalDetector = new PortalDetector();
  }

  getFormFiller(): FormFiller {
    return this.formFiller;
  }

  getDOMInteraction(): DOMInteraction {
    return this.domInteraction;
  }

  getNavigationController(): NavigationController {
    return this.navigationController;
  }

  getElementDetector(): ElementDetector {
    return this.elementDetector;
  }

  getUploadHandler(): UploadHandler {
    return this.uploadHandler;
  }

  getPortalDetector(): PortalDetector {
    return this.portalDetector;
  }

  async initialize(executeScript: (code: string) => Promise<any>): Promise<void> {
    const commonScript = await this.loadCommonAutomationScript();
    await executeScript(commonScript);
  }

  private async loadCommonAutomationScript(): Promise<string> {
    return `
      window.BorderlyAutomation = window.BorderlyAutomation || {};
      window.BorderlyAutomation._loaded = true;
      console.log('Borderly Automation scripts loaded');
    `;
  }

  reset(): void {
    this.navigationController.reset();
    this.elementDetector.clearCache();
  }

  getStatus(): {
    initialized: boolean;
    activeServices: string[];
    cacheStats: any;
  } {
    return {
      initialized: true,
      activeServices: [
        'formFiller',
        'domInteraction',
        'navigationController',
        'elementDetector',
        'uploadHandler',
        'portalDetector'
      ],
      cacheStats: this.elementDetector.getCacheStats()
    };
  }
}
