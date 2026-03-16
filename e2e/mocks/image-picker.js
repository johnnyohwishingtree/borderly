// Web implementation of react-native-image-picker using <input type="file">.
// Opens the browser's native file picker instead of always returning didCancel.

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept || 'image/*';
    input.style.display = 'none';

    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) {
        resolve({ didCancel: true });
        document.body.removeChild(input);
        return;
      }

      try {
        const dataUri = await fileToBase64(file);
        const base64 = typeof dataUri === 'string' ? dataUri.split(',')[1] : '';
        resolve({
          didCancel: false,
          assets: [
            {
              uri: URL.createObjectURL(file),
              base64: base64,
              fileName: file.name,
              fileSize: file.size,
              type: file.type,
              width: 0,
              height: 0,
            },
          ],
        });
      } catch (err) {
        resolve({
          didCancel: false,
          errorCode: 'others',
          errorMessage: err instanceof Error ? err.message : 'Failed to read file',
        });
      }
      document.body.removeChild(input);
    };

    // Handle cancel (user closes the file picker without selecting)
    input.addEventListener('cancel', () => {
      resolve({ didCancel: true });
      document.body.removeChild(input);
    });

    document.body.appendChild(input);
    input.click();
  });
}

module.exports = {
  launchCamera: (options) => pickFile(options?.mediaType === 'video' ? 'video/*' : 'image/*'),
  launchImageLibrary: (options) => pickFile(options?.mediaType === 'video' ? 'video/*' : 'image/*'),
  MediaType: {
    photo: 'photo',
    video: 'video',
    mixed: 'mixed',
  },
  Quality: {
    low: 0,
    medium: 0.5,
    high: 1,
  },
};
