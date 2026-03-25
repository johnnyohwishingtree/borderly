/**
 * Upload Handler Types — Type definitions for file upload handling
 */

/**
 * File upload configuration
 */
export interface UploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  allowedExtensions: string[];
  resizeImages: boolean;
  maxImageWidth: number;
  maxImageHeight: number;
  imageQuality: number;
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
  data: string;
  thumbnail?: string;
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
    maxSize: 5 * 1024 * 1024,
    maxWidth: 2000,
    maxHeight: 2000,
    aspectRatio: { min: 0.7, max: 1.3 }
  },
  PASSPORT_SCAN: {
    name: 'Passport Scan',
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
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
