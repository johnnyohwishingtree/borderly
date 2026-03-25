/**
 * Upload Scripts — WebView script generators for file upload operations
 */

import type { FileInfo, UploadTarget } from './uploadTypes';

/**
 * Generate script for input-based file upload
 */
export function generateInputUploadScript(fileInfo: FileInfo, target: UploadTarget): string {
  return `
    (function() {
      try {
        const input = document.querySelector('${target.selector}');
        if (!input) {
          return { success: false, error: 'File input not found' };
        }

        const binaryString = atob('${fileInfo.data.split(',')[1] || fileInfo.data}');
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const file = new File([bytes], ${JSON.stringify(fileInfo.name)}, {
          type: ${JSON.stringify(fileInfo.type)},
          lastModified: ${fileInfo.lastModified}
        });

        const fileList = {
          0: file,
          length: 1,
          item: function(index) { return index === 0 ? file : null; }
        };

        Object.defineProperty(input, 'files', {
          value: fileList,
          writable: false
        });

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
export function generateDragDropUploadScript(fileInfo: FileInfo, target: UploadTarget): string {
  return `
    (function() {
      try {
        const dropZone = document.querySelector('${target.selector}');
        if (!dropZone) {
          return { success: false, error: 'Drop zone not found' };
        }

        const binaryString = atob('${fileInfo.data.split(',')[1] || fileInfo.data}');
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const file = new File([bytes], ${JSON.stringify(fileInfo.name)}, {
          type: ${JSON.stringify(fileInfo.type)},
          lastModified: ${fileInfo.lastModified}
        });

        const dragEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true
        });

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
export function generateButtonUploadScript(_fileInfo: FileInfo, target: UploadTarget): string {
  return `
    (function() {
      try {
        const button = document.querySelector('${target.selector}');
        if (!button) {
          return { success: false, error: 'Upload button not found' };
        }

        button.click();

        return new Promise((resolve) => {
          setTimeout(() => {
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
 * Generate upload target detection script
 */
export function generateDetectionScript(): string {
  return `
    (function() {
      const targets = [];

      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach(input => {
        targets.push({
          selector: '#' + input.id || 'input[type="file"]:nth-child(' + Array.from(input.parentNode.children).indexOf(input) + ')',
          uploadMethod: 'input',
          acceptAttribute: input.accept || '',
          multipleFiles: input.multiple || false
        });
      });

      const dragDropZones = document.querySelectorAll('[data-dropzone], .dropzone, .file-drop-zone');
      dragDropZones.forEach(zone => {
        targets.push({
          selector: '#' + zone.id || '.' + zone.className.split(' ')[0],
          uploadMethod: 'drag_drop',
          multipleFiles: zone.hasAttribute('data-multiple') || zone.hasAttribute('multiple')
        });
      });

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
}
