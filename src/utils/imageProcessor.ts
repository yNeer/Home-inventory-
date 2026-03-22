/**
 * Utility to process images completely offline using HTML5 Canvas.
 * Goal: Auto-crop blank space, convert to grayscale, boost contrast, and resize.
 * This provides Tesseract with a much cleaner image to run OCR on.
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

        // 1. Initial Scale (max 2000px)
        const MAX_SIZE = 2000;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // 2. Convert to Grayscale & Boost Contrast
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

        // 3. Export to Blob -> File
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
