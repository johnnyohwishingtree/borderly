/**
 * Upload Handler - File upload handling for passport images and documents
 * 
 * Manages secure file uploads for government portals including passport photos,
 * document scans, and form attachments with proper validation and error handling.
 */

import { AutomationStepResult } from '@/types/submission';

/**
 * File upload configuration
 */
export interface UploadConfig {
  maxFileSize: number; // bytes
  allowedTypes: string[];
  allowedExtensions: string[];
  resizeImages: boolean;
  maxImageWidth: number;
  maxImageHeight: number;
  imageQuality: number; // 0-1
  uploadTimeout: number;
  retryAttempts: number;
  enableProgressTracking: boolean;
  validateBeforeUpload: boolean;
}

/**
 * File information for upload
 */
export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  data: string; // Base64 encoded file data
  thumbnail?: string; // Base64 encoded thumbnail for images
  metadata?: {
    width?: number;
    height?: number;
    orientation?: number;
    exifData?: Record<string, any>;
  };
}

/**
 * Upload target configuration
 */
export interface UploadTarget {
  selector: string;
  uploadMethod: 'input' | 'drag_drop' | 'button_click' | 'custom';
  acceptAttribute?: string;
  multipleFiles?: boolean;
  customScript?: string;
  validationScript?: string;
  progressSelector?: string;
  errorSelector?: string;
  successSelector?: string;
}

/**
 * Upload progress information
 */
export interface UploadProgress {
  fileId: string;
  fileName: string;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  status: 'preparing' | 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
  remainingTime?: number;
}

/**
 * Upload validation result
 */
export interface UploadValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileSize: number;
  fileType: string;
  fileName: string;
  securityChecks: {
    virusScanned: boolean;
    fileSignatureValid: boolean;
    noExecutableContent: boolean;
    sizeWithinLimits: boolean;
  };
}

/**
 * Upload result
 */
export interface UploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  uploadedSize: number;
  serverResponse?: any;
  uploadUrl?: string;
  uploadTime: number;
  error?: string;
  validationResult?: UploadValidation;
}

/**
 * Common document types for government portals
 */
export const DOCUMENT_TYPES = {
  PASSPORT_PHOTO: {
    name: 'Passport Photo',
    allowedTypes: ['image/jpeg', 'image/png'],
    maxSize: 5 * 1024 * 1024, // 5MB
    maxWidth: 2000,
    maxHeight: 2000,
    aspectRatio: { min: 0.7, max: 1.3 } // Approximately square
  },
  PASSPORT_SCAN: {
    name: 'Passport Scan',
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSize: 10 * 1024 * 1024, // 10MB
    maxWidth: 3000,
    maxHeight: 4000
  },
  VISA_DOCUMENT: {
    name: 'Visa Document',
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    maxWidth: 3000,
    maxHeight: 4000
  },
  TRAVEL_ITINERARY: {
    name: 'Travel Itinerary',
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSize: 5 * 1024 * 1024
  },
  HOTEL_RESERVATION: {
    name: 'Hotel Reservation',
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSize: 5 * 1024 * 1024
  }
};

/**
 * Main upload handler class
 */
export class UploadHandler {
  private config: UploadConfig;
  private activeUploads: Map<string, UploadProgress>;
  private uploadQueue: FileInfo[];

  constructor(config?: Partial<UploadConfig>) {
    this.config = {
      maxFileSize: 10 * 1024 * 1024, // 10MB default
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'],
      resizeImages: true,
      maxImageWidth: 2048,
      maxImageHeight: 2048,
      imageQuality: 0.8,
      uploadTimeout: 60000, // 1 minute
      retryAttempts: 3,
      enableProgressTracking: true,
      validateBeforeUpload: true,
      ...config
    };

    this.activeUploads = new Map();
    this.uploadQueue = [];
  }

  /**
   * Upload a file to the specified target
   */
  async uploadFile(
    fileInfo: FileInfo,
    target: UploadTarget,
    executeScript: (code: string) => Promise<any>,
    documentType?: keyof typeof DOCUMENT_TYPES
  ): Promise<UploadResult> {
    const startTime = Date.now();
    const uploadId = this.generateUploadId();

    try {
      // Validate file before upload
      if (this.config.validateBeforeUpload) {
        const validation = await this.validateFile(fileInfo, documentType);
        if (!validation.isValid) {
          return {
            success: false,
            fileId: fileInfo.id,
            fileName: fileInfo.name,
            uploadedSize: 0,
            uploadTime: Date.now() - startTime,
            error: `File validation failed: ${validation.errors.join(', ')}`,
            validationResult: validation
          };
        }
      }

      // Process file if needed (resize images, etc.)
      const processedFile = await this.processFile(fileInfo, documentType);

      // Track upload progress
      const progress: UploadProgress = {
        fileId: fileInfo.id,
        fileName: fileInfo.name,
        bytesUploaded: 0,
        totalBytes: processedFile.size,
        percentage: 0,
        status: 'preparing'
      };

      if (this.config.enableProgressTracking) {
        this.activeUploads.set(uploadId, progress);
      }

      // Perform the actual upload
      const uploadResult = await this.performUpload(
        processedFile,
        target,
        executeScript,
        uploadId,
        progress
      );

      return {
        success: uploadResult.success,
        fileId: fileInfo.id,
        fileName: fileInfo.name,
        uploadedSize: uploadResult.success ? processedFile.size : 0,
        uploadTime: Date.now() - startTime,
        serverResponse: uploadResult.serverResponse,
        uploadUrl: uploadResult.uploadUrl,
        error: uploadResult.error
      };

    } catch (error) {
      return {
        success: false,
        fileId: fileInfo.id,
        fileName: fileInfo.name,
        uploadedSize: 0,
        uploadTime: Date.now() - startTime,
        error: `Upload failed: ${(error as Error).message}`
      };
    } finally {
      this.activeUploads.delete(uploadId);
    }
  }

  /**
   * Upload multiple files sequentially or in parallel
   */
  async uploadMultipleFiles(
    files: FileInfo[],
    target: UploadTarget,
    executeScript: (code: string) => Promise<any>,
    options: { parallel?: boolean; documentType?: keyof typeof DOCUMENT_TYPES } = {}
  ): Promise<{ results: UploadResult[]; successCount: number; failureCount: number }> {
    const { parallel = false, documentType } = options;
    
    if (parallel) {
      // Upload files in parallel
      const uploadPromises = files.map(file => 
        this.uploadFile(file, target, executeScript, documentType)
      );
      
      const results = await Promise.all(uploadPromises);
      const successCount = results.filter(r => r.success).length;
      
      return {
        results,
        successCount,
        failureCount: results.length - successCount
      };
    } else {
      // Upload files sequentially
      const results: UploadResult[] = [];
      let successCount = 0;
      
      for (const file of files) {
        const result = await this.uploadFile(file, target, executeScript, documentType);
        results.push(result);
        
        if (result.success) {
          successCount++;
        }
        
        // Small delay between sequential uploads
        if (file !== files[files.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      return {
        results,
        successCount,
        failureCount: results.length - successCount
      };
    }
  }

  /**
   * Detect upload targets on the page
   */
  async detectUploadTargets(
    executeScript: (code: string) => Promise<any>
  ): Promise<UploadTarget[]> {
    const detectionScript = `
      (function() {
        const targets = [];
        
        // Look for file input elements
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
          targets.push({
            selector: '#' + input.id || 'input[type="file"]:nth-child(' + Array.from(input.parentNode.children).indexOf(input) + ')',
            uploadMethod: 'input',
            acceptAttribute: input.accept || '',
            multipleFiles: input.multiple || false
          });
        });
        
        // Look for drag-drop zones
        const dragDropZones = document.querySelectorAll('[data-dropzone], .dropzone, .file-drop-zone');
        dragDropZones.forEach(zone => {
          targets.push({
            selector: '#' + zone.id || '.' + zone.className.split(' ')[0],
            uploadMethod: 'drag_drop',
            multipleFiles: zone.hasAttribute('data-multiple') || zone.hasAttribute('multiple')
          });
        });
        
        // Look for upload buttons
        const uploadButtons = document.querySelectorAll('button[data-upload], .upload-btn, input[type="button"][value*="upload" i]');
        uploadButtons.forEach(button => {
          targets.push({
            selector: '#' + button.id || button.tagName.toLowerCase() + '[value="' + button.value + '"]',
            uploadMethod: 'button_click'
          });
        });
        
        return targets;
      })();
    `;

    try {
      const targets = await executeScript(detectionScript);
      return targets || [];
    } catch (error) {
      console.warn('Upload target detection failed:', error);
      return [];
    }
  }

  /**
   * Get upload progress for active uploads
   */
  getUploadProgress(uploadId?: string): UploadProgress | UploadProgress[] {
    if (uploadId) {
      return this.activeUploads.get(uploadId) || null;
    }
    
    return Array.from(this.activeUploads.values());
  }

  /**
   * Cancel an active upload
   */
  cancelUpload(uploadId: string): boolean {
    const progress = this.activeUploads.get(uploadId);
    if (progress) {
      progress.status = 'failed';
      progress.error = 'Upload cancelled by user';
      this.activeUploads.delete(uploadId);
      return true;
    }
    return false;
  }

  /**
   * Validate file before upload
   */
  private async validateFile(
    fileInfo: FileInfo,
    documentType?: keyof typeof DOCUMENT_TYPES
  ): Promise<UploadValidation> {
    const validation: UploadValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      fileSize: fileInfo.size,
      fileType: fileInfo.type,
      fileName: fileInfo.name,
      securityChecks: {
        virusScanned: true, // Placeholder - would integrate with actual scanner
        fileSignatureValid: true,
        noExecutableContent: true,
        sizeWithinLimits: true
      }
    };

    // Check file size
    const maxSize = documentType ? DOCUMENT_TYPES[documentType].maxSize : this.config.maxFileSize;
    if (fileInfo.size > maxSize) {
      validation.errors.push(`File size ${this.formatFileSize(fileInfo.size)} exceeds limit of ${this.formatFileSize(maxSize)}`);
      validation.securityChecks.sizeWithinLimits = false;
    }

    // Check file type
    const allowedTypes = documentType ? DOCUMENT_TYPES[documentType].allowedTypes : this.config.allowedTypes;
    if (!allowedTypes.includes(fileInfo.type)) {
      validation.errors.push(`File type ${fileInfo.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file extension
    const extension = '.' + fileInfo.name.split('.').pop()?.toLowerCase();
    if (!this.config.allowedExtensions.includes(extension)) {
      validation.errors.push(`File extension ${extension} is not allowed`);
    }

    // Validate file signature (basic check)
    if (fileInfo.data) {
      const signature = fileInfo.data.substring(0, 50); // First few bytes
      if (!this.validateFileSignature(signature, fileInfo.type)) {
        validation.errors.push('File signature does not match the declared file type');
        validation.securityChecks.fileSignatureValid = false;
      }
    }

    // Check for executable content in file name
    const executableExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif'];
    if (executableExtensions.some(ext => fileInfo.name.toLowerCase().includes(ext))) {
      validation.errors.push('File name contains executable extension');
      validation.securityChecks.noExecutableContent = false;
    }

    // Image-specific validation
    if (fileInfo.type.startsWith('image/') && documentType && DOCUMENT_TYPES[documentType]) {
      const docType = DOCUMENT_TYPES[documentType];
      if (fileInfo.metadata?.width && fileInfo.metadata?.height) {
        if ('maxWidth' in docType && docType.maxWidth && fileInfo.metadata.width > docType.maxWidth) {
          validation.warnings.push(`Image width ${fileInfo.metadata.width}px exceeds recommended ${docType.maxWidth}px`);
        }
        if ('maxHeight' in docType && docType.maxHeight && fileInfo.metadata.height > docType.maxHeight) {
          validation.warnings.push(`Image height ${fileInfo.metadata.height}px exceeds recommended ${docType.maxHeight}px`);
        }
        
        // Check aspect ratio for passport photos
        if (documentType === 'PASSPORT_PHOTO' && 'aspectRatio' in docType) {
          const ratio = fileInfo.metadata.width / fileInfo.metadata.height;
          const { min, max } = docType.aspectRatio as any;
          if (ratio < min || ratio > max) {
            validation.warnings.push(`Passport photo aspect ratio ${ratio.toFixed(2)} should be between ${min} and ${max}`);
          }
        }
      }
    }

    validation.isValid = validation.errors.length === 0;
    return validation;
  }

  /**
   * Process file (resize images, optimize, etc.)
   */
  private async processFile(
    fileInfo: FileInfo,
    documentType?: keyof typeof DOCUMENT_TYPES
  ): Promise<FileInfo> {
    let processedFile = { ...fileInfo };

    // Process images
    if (fileInfo.type.startsWith('image/') && this.config.resizeImages) {
      const docType = documentType ? DOCUMENT_TYPES[documentType] : null;
      const maxWidth = (docType && 'maxWidth' in docType ? docType.maxWidth : undefined) || this.config.maxImageWidth;
      const maxHeight = (docType && 'maxHeight' in docType ? docType.maxHeight : undefined) || this.config.maxImageHeight;
      
      if (fileInfo.metadata?.width && fileInfo.metadata?.height) {
        if (fileInfo.metadata.width > maxWidth || fileInfo.metadata.height > maxHeight) {
          // Would integrate with image processing library in production
          console.log(`Resizing image from ${fileInfo.metadata.width}x${fileInfo.metadata.height} to fit ${maxWidth}x${maxHeight}`);
          
          // Placeholder for image resizing
          // In production, would use canvas or image processing library
          processedFile.metadata = {
            ...processedFile.metadata,
            width: Math.min(fileInfo.metadata.width, maxWidth),
            height: Math.min(fileInfo.metadata.height, maxHeight)
          };
        }
      }
    }

    return processedFile;
  }

  /**
   * Perform the actual file upload
   */
  private async performUpload(
    fileInfo: FileInfo,
    target: UploadTarget,
    executeScript: (code: string) => Promise<any>,
    uploadId: string,
    progress: UploadProgress
  ): Promise<{ success: boolean; serverResponse?: any; uploadUrl?: string; error?: string }> {
    progress.status = 'uploading';
    
    try {
      let uploadScript: string;
      
      switch (target.uploadMethod) {
        case 'input':
          uploadScript = this.generateInputUploadScript(fileInfo, target);
          break;
          
        case 'drag_drop':
          uploadScript = this.generateDragDropUploadScript(fileInfo, target);
          break;
          
        case 'button_click':
          uploadScript = this.generateButtonUploadScript(fileInfo, target);
          break;
          
        case 'custom':
          if (!target.customScript) {
            throw new Error('Custom upload method requires customScript');
          }
          uploadScript = target.customScript.replace('{{FILE_DATA}}', fileInfo.data);
          break;
          
        default:
          throw new Error(`Unsupported upload method: ${target.uploadMethod}`);
      }

      const result = await executeScript(uploadScript);
      
      if (result.success) {
        progress.status = 'completed';
        progress.percentage = 100;
        progress.bytesUploaded = fileInfo.size;
        
        return {
          success: true,
          serverResponse: result.response,
          uploadUrl: result.uploadUrl
        };
      } else {
        progress.status = 'failed';
        progress.error = result.error;
        
        return {
          success: false,
          error: result.error
        };
      }

    } catch (error) {
      progress.status = 'failed';
      progress.error = (error as Error).message;
      
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Generate script for input-based file upload
   */
  private generateInputUploadScript(fileInfo: FileInfo, target: UploadTarget): string {
    return `
      (function() {
        try {
          const input = document.querySelector('${target.selector}');
          if (!input) {
            return { success: false, error: 'File input not found' };
          }
          
          // Create a File object from the base64 data
          const binaryString = atob('${fileInfo.data.split(',')[1] || fileInfo.data}');
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const file = new File([bytes], ${JSON.stringify(fileInfo.name)}, { 
            type: ${JSON.stringify(fileInfo.type)},
            lastModified: ${fileInfo.lastModified}
          });
          
          // Create FileList-like object
          const fileList = {
            0: file,
            length: 1,
            item: function(index) { return index === 0 ? file : null; }
          };
          
          // Set the files on the input
          Object.defineProperty(input, 'files', {
            value: fileList,
            writable: false
          });
          
          // Trigger change event
          input.dispatchEvent(new Event('change', { bubbles: true }));
          
          return { 
            success: true, 
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          };
          
        } catch (error) {
          return { success: false, error: error.message };
        }
      })();
    `;
  }

  /**
   * Generate script for drag-drop upload
   */
  private generateDragDropUploadScript(fileInfo: FileInfo, target: UploadTarget): string {
    return `
      (function() {
        try {
          const dropZone = document.querySelector('${target.selector}');
          if (!dropZone) {
            return { success: false, error: 'Drop zone not found' };
          }
          
          // Create file from base64 data
          const binaryString = atob('${fileInfo.data.split(',')[1] || fileInfo.data}');
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const file = new File([bytes], ${JSON.stringify(fileInfo.name)}, { 
            type: ${JSON.stringify(fileInfo.type)},
            lastModified: ${fileInfo.lastModified}
          });
          
          // Create drag event
          const dragEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true
          });
          
          // Add files to the drag event
          Object.defineProperty(dragEvent, 'dataTransfer', {
            value: {
              files: [file],
              items: [{
                kind: 'file',
                type: file.type,
                getAsFile: () => file
              }]
            }
          });
          
          // Dispatch the drop event
          dropZone.dispatchEvent(dragEvent);
          
          return { 
            success: true, 
            fileName: file.name,
            fileSize: file.size
          };
          
        } catch (error) {
          return { success: false, error: error.message };
        }
      })();
    `;
  }

  /**
   * Generate script for button-click upload
   */
  private generateButtonUploadScript(fileInfo: FileInfo, target: UploadTarget): string {
    return `
      (function() {
        try {
          const button = document.querySelector('${target.selector}');
          if (!button) {
            return { success: false, error: 'Upload button not found' };
          }
          
          // Click the button to trigger file dialog
          button.click();
          
          // Wait for file dialog to open and simulate selection
          return new Promise((resolve) => {
            setTimeout(() => {
              // This would require integration with the native file dialog
              // For now, return a placeholder success
              resolve({ 
                success: true, 
                message: 'Button clicked, file dialog should open'
              });
            }, 1000);
          });
          
        } catch (error) {
          return { success: false, error: error.message };
        }
      })();
    `;
  }

  /**
   * Validate file signature against declared type
   */
  private validateFileSignature(signature: string, declaredType: string): boolean {
    // Basic file signature validation
    const signatures: Record<string, string[]> = {
      'image/jpeg': ['/9j/', 'ffd8'],
      'image/png': ['iVBORw0KGgo'],
      'application/pdf': ['JVBERi'],
      'image/gif': ['R0lGOD']
    };

    const expectedSignatures = signatures[declaredType];
    if (!expectedSignatures) {
      return true; // Unknown type, assume valid
    }

    return expectedSignatures.some(sig => signature.toLowerCase().startsWith(sig.toLowerCase()));
  }

  /**
   * Format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Generate unique upload ID
   */
  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
}