import {
  generateInputUploadScript,
  generateDragDropUploadScript,
  generateButtonUploadScript,
  generateDetectionScript,
} from '../../../src/services/automation/upload/uploadScripts';

import type { FileInfo, UploadTarget } from '../../../src/services/automation/upload/uploadTypes';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
function makeFileInfo(overrides?: Partial<FileInfo>): FileInfo {
  return {
    id: 'file-1',
    name: 'passport.jpg',
    size: 500000,
    type: 'image/jpeg',
    lastModified: 1700000000000,
    data: 'data:image/jpeg;base64,/9j/abc123',
    ...overrides,
  };
}

function makeTarget(overrides?: Partial<UploadTarget>): UploadTarget {
  return {
    selector: '#file-upload',
    uploadMethod: 'input',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// generateInputUploadScript
// ---------------------------------------------------------------------------
describe('generateInputUploadScript', () => {
  it('generates script with selector and file info', () => {
    const script = generateInputUploadScript(makeFileInfo(), makeTarget());
    expect(script).toContain('#file-upload');
    expect(script).toContain('passport.jpg');
    expect(script).toContain('image/jpeg');
  });

  it('includes base64 decoding logic', () => {
    const script = generateInputUploadScript(makeFileInfo(), makeTarget());
    expect(script).toContain('atob');
    expect(script).toContain('Uint8Array');
  });

  it('dispatches change event after setting files', () => {
    const script = generateInputUploadScript(makeFileInfo(), makeTarget());
    expect(script).toContain('change');
    expect(script).toContain('dispatchEvent');
  });

  it('handles element not found', () => {
    const script = generateInputUploadScript(makeFileInfo(), makeTarget());
    expect(script).toContain('File input not found');
  });
});

// ---------------------------------------------------------------------------
// generateDragDropUploadScript
// ---------------------------------------------------------------------------
describe('generateDragDropUploadScript', () => {
  it('generates script targeting the drop zone selector', () => {
    const script = generateDragDropUploadScript(makeFileInfo(), makeTarget({ selector: '.dropzone' }));
    expect(script).toContain('.dropzone');
    expect(script).toContain('DragEvent');
    expect(script).toContain('drop');
  });

  it('creates a file from base64 data', () => {
    const script = generateDragDropUploadScript(makeFileInfo(), makeTarget());
    expect(script).toContain('File');
    expect(script).toContain('atob');
  });

  it('sets dataTransfer with file', () => {
    const script = generateDragDropUploadScript(makeFileInfo(), makeTarget());
    expect(script).toContain('dataTransfer');
    expect(script).toContain('getAsFile');
  });

  it('handles element not found', () => {
    const script = generateDragDropUploadScript(makeFileInfo(), makeTarget());
    expect(script).toContain('Drop zone not found');
  });
});

// ---------------------------------------------------------------------------
// generateButtonUploadScript
// ---------------------------------------------------------------------------
describe('generateButtonUploadScript', () => {
  it('generates script that clicks the upload button', () => {
    const script = generateButtonUploadScript(makeFileInfo(), makeTarget({ selector: '#upload-btn' }));
    expect(script).toContain('#upload-btn');
    expect(script).toContain('button.click()');
  });

  it('handles element not found', () => {
    const script = generateButtonUploadScript(makeFileInfo(), makeTarget());
    expect(script).toContain('Upload button not found');
  });

  it('returns promise-based result', () => {
    const script = generateButtonUploadScript(makeFileInfo(), makeTarget());
    expect(script).toContain('Promise');
    expect(script).toContain('file dialog should open');
  });
});

// ---------------------------------------------------------------------------
// generateDetectionScript
// ---------------------------------------------------------------------------
describe('generateDetectionScript', () => {
  it('detects file input elements', () => {
    const script = generateDetectionScript();
    expect(script).toContain('input[type="file"]');
    expect(script).toContain("uploadMethod: 'input'");
  });

  it('detects drag-drop zones', () => {
    const script = generateDetectionScript();
    expect(script).toContain('[data-dropzone]');
    expect(script).toContain('.dropzone');
    expect(script).toContain("uploadMethod: 'drag_drop'");
  });

  it('detects upload buttons', () => {
    const script = generateDetectionScript();
    expect(script).toContain('[data-upload]');
    expect(script).toContain('.upload-btn');
    expect(script).toContain("uploadMethod: 'button_click'");
  });

  it('returns array of targets', () => {
    const script = generateDetectionScript();
    expect(script).toContain('const targets = []');
    expect(script).toContain('return targets');
  });
});
