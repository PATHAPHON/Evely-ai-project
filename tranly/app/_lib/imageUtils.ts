/**
 * Trims transparent pixels from the borders of an image Blob (PNG).
 * It loads the image onto a canvas, finds the bounding box of non-transparent pixels,
 * crops the canvas to that bounding box (with a tiny padding), and returns a new Blob.
 */
export async function trimTransparentPixels(blob: Blob): Promise<Blob> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(blob);
    }

    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.src = url;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          return resolve(blob);
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const { data, width, height } = imgData;

        let minX = width;
        let maxX = 0;
        let minY = height;
        let maxY = 0;
        let hasPixels = false;

        // Inspect alpha channel (every 4th value: r, g, b, a)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const alphaIndex = (y * width + x) * 4 + 3;
            const alpha = data[alphaIndex];
            if (alpha > 10) { // alpha threshold for non-transparent pixels
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              hasPixels = true;
            }
          }
        }

        if (!hasPixels) {
          URL.revokeObjectURL(url);
          return resolve(blob);
        }

        // Add small padding (e.g. 4px) to prevent cutting off edges
        const pad = 4;
        const cropX = Math.max(0, minX - pad);
        const cropY = Math.max(0, minY - pad);
        const cropW = Math.min(width - cropX, (maxX - minX) + pad * 2);
        const cropH = Math.min(height - cropY, (maxY - minY) + pad * 2);

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext('2d');
        if (!cropCtx) {
          URL.revokeObjectURL(url);
          return resolve(blob);
        }

        // Enable high-quality image smoothing and a subtle blur filter (0.4px)
        // to feather and smooth out jagged transparent edges (anti-aliasing)
        cropCtx.imageSmoothingEnabled = true;
        cropCtx.imageSmoothingQuality = 'high';
        cropCtx.filter = 'blur(0.4px)';

        cropCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        cropCanvas.toBlob(
          (croppedBlob) => {
            URL.revokeObjectURL(url);
            resolve(croppedBlob || blob);
          },
          'image/png'
        );
      } catch (err) {
        console.error('Error trimming transparent pixels:', err);
        URL.revokeObjectURL(url);
        resolve(blob);
      }
    };

    img.onerror = (err) => {
      console.error('Failed to load image for trimming:', err);
      URL.revokeObjectURL(url);
      resolve(blob);
    };
  });
}

/**
 * Resizes an image Blob so that its largest dimension does not exceed maxDimension.
 * If the image is already smaller than maxDimension, the original Blob is returned.
 */
export async function resizeImage(blob: Blob, maxDimension: number): Promise<Blob> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(blob);
    }

    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.src = url;

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width <= maxDimension && height <= maxDimension) {
          URL.revokeObjectURL(url);
          return resolve(blob);
        }

        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          return resolve(blob);
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (resizedBlob) => {
            URL.revokeObjectURL(url);
            resolve(resizedBlob || blob);
          },
          blob.type,
          0.85
        );
      } catch (err) {
        console.error('Error resizing image:', err);
        URL.revokeObjectURL(url);
        resolve(blob);
      }
    };

    img.onerror = (err) => {
      console.error('Failed to load image for resizing:', err);
      URL.revokeObjectURL(url);
      resolve(blob);
    };
  });
}

