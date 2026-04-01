/**
 * Shared image picker service.
 *
 * Opens the system photo library and returns the selected image URI.
 * Used by both boarding pass barcode import and passport MRZ import.
 */

import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';

export interface ImagePickerResult {
  success: boolean;
  imageUri?: string;
  error?: string;
  cancelled?: boolean;
}

export async function selectImageFromLibrary(): Promise<ImagePickerResult> {
  return new Promise((resolve) => {
    launchImageLibrary(
      {
        mediaType: 'photo' as MediaType,
        includeBase64: false,
        quality: 1.0,
        maxWidth: 4000,
        maxHeight: 4000,
        selectionLimit: 1,
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel) {
          resolve({ success: false, error: 'User cancelled image selection', cancelled: true });
          return;
        }
        if (response.errorMessage) {
          resolve({ success: false, error: response.errorMessage });
          return;
        }
        const asset = response.assets?.[0];
        if (!asset || !asset.uri) {
          resolve({ success: false, error: 'No image selected or invalid image' });
          return;
        }
        resolve({ success: true, imageUri: asset.uri });
      },
    );
  });
}
