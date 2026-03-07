/**
 * Automation Services - Core WebView automation and form filling engine
 * 
 * This module provides the main exports for the automation engine that enables
 * automated form filling in government portals through controlled WebView interactions.
 */

// Core automation services
export { FormFiller } from './formFiller';
export { DOMInteraction } from './domInteraction';
export { NavigationController } from './navigationController';
export { ElementDetector } from './elementDetector';
export { UploadHandler } from './uploadHandler';

// Re-export types for external use
export type {
  FormFillConfig,
  FormFillResult,
  FileInfo,
  UploadTarget,
  UploadResult,
  UploadConfig
} from './uploadHandler';

export type {
  DOMInteractionConfig,
  ElementInteractionOptions,
  ElementDetectionResult,
  ClickResult,
  TypeResult
} from './domInteraction';

export type {
  NavigationState,
  NavigationStep,
  NavigationFlow,
  FlowStep,
  NavigationConfig
} from './navigationController';

export type {
  DetectionConfig,
  DetectionCriteria,
  PollingStrategy,
  ElementDetectionResult as DetectorElementResult,
  ElementInfo
} from './elementDetector';

export type {
  FormFillConfig as FillerConfig,
  FormFillResult as FillerResult
} from './formFiller';

// Automation utilities
export {
  SelectorBuilder,
  DataTransformer,
  ElementUtils,
  ErrorHandling,
  PerformanceMonitor,
  AutomationPatterns
} from '../../utils/automationHelpers';

export {
  PortalDetector
} from '../../utils/portalDetection';

export type {
  PortalIdentification,
  PortalFeatures,
  AuthenticationInfo,
  FormStructureInfo,
  CaptchaInfo,
  PortalChangeInfo
} from '../../utils/portalDetection';

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

  /**
   * Get form filler instance
   */
  getFormFiller(): FormFiller {
    return this.formFiller;
  }

  /**
   * Get DOM interaction instance
   */
  getDOMInteraction(): DOMInteraction {
    return this.domInteraction;
  }

  /**
   * Get navigation controller instance
   */
  getNavigationController(): NavigationController {
    return this.navigationController;
  }

  /**
   * Get element detector instance
   */
  getElementDetector(): ElementDetector {
    return this.elementDetector;
  }

  /**
   * Get upload handler instance
   */
  getUploadHandler(): UploadHandler {
    return this.uploadHandler;
  }

  /**
   * Get portal detector instance
   */
  getPortalDetector(): PortalDetector {
    return this.portalDetector;
  }

  /**
   * Initialize automation engine with WebView
   */
  async initialize(executeScript: (code: string) => Promise<any>): Promise<void> {
    // Load common automation scripts into WebView
    const commonScript = await this.loadCommonAutomationScript();
    await executeScript(commonScript);
  }

  /**
   * Load common automation script
   */
  private async loadCommonAutomationScript(): Promise<string> {
    // In production, this would load the actual script file
    // For now, return a simplified version
    return `
      // Borderly Automation Common Scripts
      window.BorderlyAutomation = window.BorderlyAutomation || {};
      window.BorderlyAutomation._loaded = true;
      
      // Basic utilities are loaded inline
      console.log('Borderly Automation scripts loaded');
    `;
  }

  /**
   * Reset all automation services
   */
  reset(): void {
    this.navigationController.reset();
    this.elementDetector.clearCache();
  }

  /**
   * Get automation engine status
   */
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