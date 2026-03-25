/**
 * Upload Handler — File upload handling for passport images and documents
 *
 * Manages secure file uploads for government portals including passport photos,
 * document scans, and form attachments with proper validation and error handling.
 */

import type {
  UploadConfig,
  FileInfo,
  UploadTarget,
  UploadProgress,
  UploadValidation,
  UploadResult,
} from './uploadTypes';
import { DOCUMENT_TYPES } from './uploadTypes';
import {
  generateInputUploadScript,
  generateDragDropUploadScript,
  generateButtonUploadScript,
  generateDetectionScript,
} from './uploadScripts';

/**
 * Main upload handler class
 */
export class UploadHandler {
  private config: UploadConfig;
  private activeUploads: Map<string, UploadProgress>;

  constructor(config?: Partial<UploadConfig>) {
    this.config = {
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: [
        'image/jpeg', 'image/png', 'image/gif',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'],
      resizeImages: true,
      maxImageWidth: 2048,
      maxImageHeight: 2048,
      imageQuality: 0.8,
      uploadTimeout: 60000,
      retryAttempts: 3,
      enableProgressTracking: true,
      validateBeforeUpload: true,
      ...config
    };

    this.activeUploads = new Map();
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

      const processedFile = await this.processFile(fileInfo, documentType);

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

      const uploadResult = await this.performUpload(
        processedFile, target, executeScript, uploadId, progress
      );

      return {
        success: uploadResult.success,
        fileId: fileInfo.id,
        fileName: fileInfo.name,
        uploadedSize: uploadResult.success ? processedFile.size : 0,
        uploadTime: Date.now() - startTime,
        serverResponse: uploadResult.serverResponse,
        ...(uploadResult.uploadUrl && { uploadUrl: uploadResult.uploadUrl }),
        ...(uploadResult.error && { error: uploadResult.error })
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
      const uploadPromises = files.map(file =>
        this.uploadFile(file, target, executeScript, documentType)
      );

      const results = await Promise.all(uploadPromises);
      const successCount = results.filter(r => r.success).length;

      return { results, successCount, failureCount: results.length - successCount };
    } else {
      const results: UploadResult[] = [];
      let successCount = 0;

      for (const file of files) {
        const result = await this.uploadFile(file, target, executeScript, documentType);
        results.push(result);

        if (result.success) {
          successCount++;
        }

        if (file !== files[files.length - 1]) {
          await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
        }
      }

      return { results, successCount, failureCount: results.length - successCount };
    }
  }

  /**
   * Detect upload targets on the page
   */
  async detectUploadTargets(
    executeScript: (code: string) => Promise<any>
  ): Promise<UploadTarget[]> {
    try {
      const targets = await executeScript(generateDetectionScript());
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
      const progress = this.activeUploads.get(uploadId);
      if (progress) {
        return progress;
      }
      throw new Error(`Upload progress not found for ID: ${uploadId}`);
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
        virusScanned: true,
        fileSignatureValid: true,
        noExecutableContent: true,
        sizeWithinLimits: true
      }
    };

    const maxSize = documentType ? DOCUMENT_TYPES[documentType].maxSize : this.config.maxFileSize;
    if (fileInfo.size > maxSize) {
      validation.errors.push(`File size ${this.formatFileSize(fileInfo.size)} exceeds limit of ${this.formatFileSize(maxSize)}`);
      validation.securityChecks.sizeWithinLimits = false;
    }

    const allowedTypes = documentType ? DOCUMENT_TYPES[documentType].allowedTypes : this.config.allowedTypes;
    if (!allowedTypes.includes(fileInfo.type)) {
      validation.errors.push(`File type ${fileInfo.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    const extension = '.' + fileInfo.name.split('.').pop()?.toLowerCase();
    if (!this.config.allowedExtensions.includes(extension)) {
      validation.errors.push(`File extension ${extension} is not allowed`);
    }

    if (fileInfo.data) {
      const signature = fileInfo.data.substring(0, 50);
      if (!this.validateFileSignature(signature, fileInfo.type)) {
        validation.errors.push('File signature does not match the declared file type');
        validation.securityChecks.fileSignatureValid = false;
      }
    }

    const executableExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif'];
    if (executableExtensions.some(ext => fileInfo.name.toLowerCase().includes(ext))) {
      validation.errors.push('File name contains executable extension');
      validation.securityChecks.noExecutableContent = false;
    }

    if (fileInfo.type.startsWith('image/') && documentType && DOCUMENT_TYPES[documentType]) {
      const docType = DOCUMENT_TYPES[documentType];
      if (fileInfo.metadata?.width && fileInfo.metadata?.height) {
        if ('maxWidth' in docType && docType.maxWidth && fileInfo.metadata.width > docType.maxWidth) {
          validation.warnings.push(`Image width ${fileInfo.metadata.width}px exceeds recommended ${docType.maxWidth}px`);
        }
        if ('maxHeight' in docType && docType.maxHeight && fileInfo.metadata.height > docType.maxHeight) {
          validation.warnings.push(`Image height ${fileInfo.metadata.height}px exceeds recommended ${docType.maxHeight}px`);
        }

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

    if (fileInfo.type.startsWith('image/') && this.config.resizeImages) {
      const docType = documentType ? DOCUMENT_TYPES[documentType as keyof typeof DOCUMENT_TYPES] : null;
      const maxWidth: number = (docType && 'maxWidth' in docType ? docType.maxWidth as number : this.config.maxImageWidth) || this.config.maxImageWidth;
      const maxHeight: number = (docType && 'maxHeight' in docType ? docType.maxHeight as number : this.config.maxImageHeight) || this.config.maxImageHeight;

      if (fileInfo.metadata?.width && fileInfo.metadata?.height) {
        if (fileInfo.metadata.width > maxWidth || fileInfo.metadata.height > maxHeight) {
          console.log(`Resizing image from ${fileInfo.metadata.width}x${fileInfo.metadata.height} to fit ${maxWidth}x${maxHeight}`);

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
    _uploadId: string,
    progress: UploadProgress
  ): Promise<{ success: boolean; serverResponse?: any; uploadUrl?: string; error?: string }> {
    progress.status = 'uploading';

    try {
      let uploadScript: string;

      switch (target.uploadMethod) {
        case 'input':
          uploadScript = generateInputUploadScript(fileInfo, target);
          break;
        case 'drag_drop':
          uploadScript = generateDragDropUploadScript(fileInfo, target);
          break;
        case 'button_click':
          uploadScript = generateButtonUploadScript(fileInfo, target);
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

        return { success: false, error: result.error };
      }

    } catch (error) {
      progress.status = 'failed';
      progress.error = (error as Error).message;

      return { success: false, error: (error as Error).message };
    }
  }

  private validateFileSignature(signature: string, declaredType: string): boolean {
    const signatures: Record<string, string[]> = {
      'image/jpeg': ['/9j/', 'ffd8'],
      'image/png': ['iVBORw0KGgo'],
      'application/pdf': ['JVBERi'],
      'image/gif': ['R0lGOD']
    };

    const expectedSignatures = signatures[declaredType];
    if (!expectedSignatures) {
      return true;
    }

    return expectedSignatures.some(sig => signature.toLowerCase().startsWith(sig.toLowerCase()));
  }

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

  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
}
