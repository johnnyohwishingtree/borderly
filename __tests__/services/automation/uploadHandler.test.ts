import { UploadHandler } from '../../../src/services/automation/upload/uploadHandler';
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
    lastModified: Date.now(),
    data: '/9j/4AAQbase64data',
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

function makeExecuteScript(result: Record<string, unknown> = { success: true, response: 'ok' }) {
  return jest.fn().mockResolvedValue(result);
}

// ---------------------------------------------------------------------------
// constructor
// ---------------------------------------------------------------------------
describe('UploadHandler constructor', () => {
  it('creates instance with default config', () => {
    const handler = new UploadHandler();
    expect(handler).toBeInstanceOf(UploadHandler);
  });

  it('merges partial config with defaults', () => {
    const handler = new UploadHandler({ maxFileSize: 5 * 1024 * 1024 });
    expect(handler).toBeInstanceOf(UploadHandler);
  });
});

// ---------------------------------------------------------------------------
// uploadFile
// ---------------------------------------------------------------------------
describe('uploadFile', () => {
  it('returns success for valid file upload', async () => {
    const handler = new UploadHandler({ validateBeforeUpload: false });
    const executeScript = makeExecuteScript({ success: true, response: 'uploaded' });

    const result = await handler.uploadFile(makeFileInfo(), makeTarget(), executeScript);
    expect(result.success).toBe(true);
    expect(result.fileId).toBe('file-1');
    expect(result.fileName).toBe('passport.jpg');
    expect(result.uploadedSize).toBeGreaterThan(0);
  });

  it('fails validation for oversized file', async () => {
    const handler = new UploadHandler({ maxFileSize: 100 });
    const executeScript = makeExecuteScript();

    const result = await handler.uploadFile(makeFileInfo({ size: 200 }), makeTarget(), executeScript);
    expect(result.success).toBe(false);
    expect(result.error).toContain('File validation failed');
    expect(result.error).toContain('exceeds limit');
  });

  it('fails validation for disallowed file type', async () => {
    const handler = new UploadHandler();
    const executeScript = makeExecuteScript();

    const result = await handler.uploadFile(
      makeFileInfo({ type: 'application/zip', name: 'file.zip' }),
      makeTarget(),
      executeScript
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('not allowed');
  });

  it('fails validation for executable file names', async () => {
    const handler = new UploadHandler();
    const executeScript = makeExecuteScript();

    const result = await handler.uploadFile(
      makeFileInfo({ name: 'malware.exe.jpg' }),
      makeTarget(),
      executeScript
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('executable');
  });

  it('handles executeScript failure', async () => {
    const handler = new UploadHandler({ validateBeforeUpload: false });
    const executeScript = jest.fn().mockRejectedValue(new Error('WebView crash'));

    const result = await handler.uploadFile(makeFileInfo(), makeTarget(), executeScript);
    expect(result.success).toBe(false);
    expect(result.error).toContain('WebView crash');
  });

  it('handles script returning failure', async () => {
    const handler = new UploadHandler({ validateBeforeUpload: false });
    const executeScript = makeExecuteScript({ success: false, error: 'input not found' });

    const result = await handler.uploadFile(makeFileInfo(), makeTarget(), executeScript);
    expect(result.success).toBe(false);
    expect(result.error).toBe('input not found');
  });
});

// ---------------------------------------------------------------------------
// uploadMultipleFiles
// ---------------------------------------------------------------------------
describe('uploadMultipleFiles', () => {
  it('uploads files sequentially by default', async () => {
    const handler = new UploadHandler({ validateBeforeUpload: false });
    const executeScript = makeExecuteScript({ success: true, response: 'ok' });

    const files = [makeFileInfo({ id: 'f1' }), makeFileInfo({ id: 'f2' })];
    const result = await handler.uploadMultipleFiles(files, makeTarget(), executeScript);
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(0);
    expect(result.results).toHaveLength(2);
  });

  it('uploads files in parallel when requested', async () => {
    const handler = new UploadHandler({ validateBeforeUpload: false });
    const executeScript = makeExecuteScript({ success: true, response: 'ok' });

    const files = [makeFileInfo({ id: 'f1' }), makeFileInfo({ id: 'f2' })];
    const result = await handler.uploadMultipleFiles(files, makeTarget(), executeScript, { parallel: true });
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(0);
  });

  it('counts failures correctly', async () => {
    const handler = new UploadHandler({ validateBeforeUpload: false });
    const executeScript = jest.fn()
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'fail' });

    const files = [makeFileInfo({ id: 'f1' }), makeFileInfo({ id: 'f2' })];
    const result = await handler.uploadMultipleFiles(files, makeTarget(), executeScript);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// detectUploadTargets
// ---------------------------------------------------------------------------
describe('detectUploadTargets', () => {
  it('returns detected targets from script', async () => {
    const targets = [{ selector: '#upload', uploadMethod: 'input' }];
    const executeScript = jest.fn().mockResolvedValue(targets);

    const handler = new UploadHandler();
    const result = await handler.detectUploadTargets(executeScript);
    expect(result).toEqual(targets);
  });

  it('returns empty array when detection fails', async () => {
    const executeScript = jest.fn().mockRejectedValue(new Error('no webview'));

    const handler = new UploadHandler();
    const result = await handler.detectUploadTargets(executeScript);
    expect(result).toEqual([]);
  });

  it('returns empty array when script returns falsy', async () => {
    const executeScript = jest.fn().mockResolvedValue(null);

    const handler = new UploadHandler();
    const result = await handler.detectUploadTargets(executeScript);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getUploadProgress
// ---------------------------------------------------------------------------
describe('getUploadProgress', () => {
  it('returns empty array when no active uploads', () => {
    const handler = new UploadHandler();
    const progress = handler.getUploadProgress();
    expect(progress).toEqual([]);
  });

  it('throws when requesting unknown upload ID', () => {
    const handler = new UploadHandler();
    expect(() => handler.getUploadProgress('nonexistent')).toThrow('Upload progress not found');
  });
});

// ---------------------------------------------------------------------------
// cancelUpload
// ---------------------------------------------------------------------------
describe('cancelUpload', () => {
  it('returns false for unknown upload ID', () => {
    const handler = new UploadHandler();
    expect(handler.cancelUpload('nonexistent')).toBe(false);
  });
});
