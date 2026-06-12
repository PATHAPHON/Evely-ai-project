/**
 * Converts a Blob to a base64-encoded string (without the data URI prefix).
 *
 * Uses FileReader to read the blob as a data URL, then strips the
 * `data:...;base64,` prefix to return only the raw base64 content.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read blob as base64'));
    };

    reader.readAsDataURL(blob);
  });
}
