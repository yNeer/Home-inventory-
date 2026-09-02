/**
 * Utility to process images completely offline using HTML5 Canvas.
 * Supports:
 * 1. optimizeProductPhoto: Keeps full color, high clarity, readable quality for front of product photos.
 * 2. processImageForOCR: Grayscale, auto-contrast, luminance tuning for Tesseract OCR.
 */

/**
 * Optimizes the front of product photo for display and local storage.
 * Preserves true color, sharp text, and high readable quality without crushing into black/white.
 */
export const optimizeProductPhoto = async (file: File): Promise<{ dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No Canvas Context');

        // Scale to a crisp, readable maximum dimension (1400px)
        const MAX_SIZE = 1400;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;

        // Better image smoothing for crisp text readability
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as high quality JPEG (0.88)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        resolve({ dataUrl, width, height });
      };

      img.onerror = () => reject('Image load failed');
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.onerror = () => reject('File read failed');
    reader.readAsDataURL(file);
  });
};

/**
 * Pre-processes an image specifically for Tesseract OCR:
 * Converts to grayscale and enhances contrast so stamped batch numbers and dates stand out.
 */
export const processImageForOCR = async (file: File): Promise<{ processedFile: File; dataUrl: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No Canvas Context');

        // Initial Scale (max 2000px)
        const MAX_SIZE = 2000;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to Grayscale & Boost Contrast
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const contrast = 1.8; // Boost contrast
        const intercept = 128 * (1 - contrast);

        for (let i = 0; i < data.length; i += 4) {
          // Grayscale (Luminance)
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;

          // Apply Contrast
          gray = gray * contrast + intercept;

          // Clamp values
          if (gray > 255) gray = 255;
          if (gray < 0) gray = 0;

          data[i] = gray;     // R
          data[i + 1] = gray; // G
          data[i + 2] = gray; // B
        }

        ctx.putImageData(imageData, 0, 0);

        // Export to Blob -> File
        canvas.toBlob((blob) => {
          if (!blob) return reject('Canvas to Blob failed');
          const processedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_cleaned.jpg", { type: 'image/jpeg' });
          resolve({
            processedFile,
            dataUrl: canvas.toDataURL('image/jpeg', 0.9)
          });
        }, 'image/jpeg', 0.9);
      };

      img.onerror = () => reject('Image load failed');
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.onerror = () => reject('File read failed');
    reader.readAsDataURL(file);
  });
};
