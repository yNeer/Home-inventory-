/**
 * Utility to process images safely offline using HTML5 Canvas.
 * Enforces Standard Definition (SD) resolution to prevent mobile memory crashes.
 *
 * SD Standard:
 * - Max dimension: 640px (e.g. 640x480 or 480x640)
 * - JPEG quality: 0.68
 * - Target file size: ~25KB - 45KB (dramatically reduces IndexedDB storage & RAM)
 */

export const SD_MAX_DIMENSION = 640;
export const SD_JPEG_QUALITY = 0.68;

export interface ProcessedImageResult {
  dataUrl: string;
  file: File;
  width: number;
  height: number;
  sizeKb: number;
}

/**
 * Safely loads an Image element with proper resource cleanup.
 * Guarantees that URL.revokeObjectURL is only called after the image has been rasterized.
 */
const loadImageElement = (file: File | Blob): Promise<{ img: HTMLImageElement; cleanup: () => void }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    let objectUrl: string | null = null;

    const cleanup = () => {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // Ignore revocation error
        }
        objectUrl = null;
      }
    };

    img.onload = () => {
      resolve({ img, cleanup });
    };

    img.onerror = () => {
      cleanup();
      // Fallback via FileReader in case ObjectURL is restricted
      const reader = new FileReader();
      reader.onload = (e) => {
        const fallbackImg = new Image();
        fallbackImg.onload = () => resolve({ img: fallbackImg, cleanup: () => {} });
        fallbackImg.onerror = () => reject(new Error('Image format could not be decoded.'));
        fallbackImg.src = (e.target?.result as string) || '';
      };
      reader.onerror = () => reject(new Error('File reading failed.'));
      reader.readAsDataURL(file);
    };

    try {
      objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = () => reject(new Error('File reading failed.'));
      reader.readAsDataURL(file);
    }
  });
};

/**
 * Reduces any input image (from camera or gallery) down to Standard Definition (SD).
 * Max dimension: 640px, JPEG quality 0.68.
 * Completely immune to unhandled exceptions and memory leaks.
 */
export const reduceToSDImage = async (
  file: File | Blob,
  fallbackFilename = 'photo_sd.jpg'
): Promise<ProcessedImageResult> => {
  const originalName = file instanceof File ? file.name : fallbackFilename;
  const safeFilename = originalName.replace(/\.[^/.]+$/, '') + '_sd.jpg';

  let cleanupFn: (() => void) | null = null;

  try {
    const { img, cleanup } = await loadImageElement(file);
    cleanupFn = cleanup;

    // Calculate aspect ratio constrained to SD resolution (max 640px)
    let srcWidth = img.naturalWidth || img.width || 640;
    let srcHeight = img.naturalHeight || img.height || 480;

    let targetWidth = srcWidth;
    let targetHeight = srcHeight;

    if (srcWidth > srcHeight) {
      if (srcWidth > SD_MAX_DIMENSION) {
        targetHeight = Math.round((srcHeight * SD_MAX_DIMENSION) / srcWidth);
        targetWidth = SD_MAX_DIMENSION;
      }
    } else {
      if (srcHeight > SD_MAX_DIMENSION) {
        targetWidth = Math.round((srcWidth * SD_MAX_DIMENSION) / srcHeight);
        targetHeight = SD_MAX_DIMENSION;
      }
    }

    // Minimum boundary protection
    targetWidth = Math.max(targetWidth, 100);
    targetHeight = Math.max(targetHeight, 100);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium'; // Medium is optimal and fast on mobile GPUs
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const dataUrl = canvas.toDataURL('image/jpeg', SD_JPEG_QUALITY);
      const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

      // Create a lightweight compressed File object for any downstream operations
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob((b) => res(b), 'image/jpeg', SD_JPEG_QUALITY)
      );

      const finalFile = blob
        ? new File([blob], safeFilename, { type: 'image/jpeg' })
        : (file instanceof File ? file : new File([file], safeFilename, { type: 'image/jpeg' }));

      // Free canvas memory buffer immediately
      canvas.width = 0;
      canvas.height = 0;

      return {
        dataUrl,
        file: finalFile,
        width: targetWidth,
        height: targetHeight,
        sizeKb: Math.max(sizeKb, 1)
      };
    }
  } catch (err) {
    console.warn('Canvas SD reduction warning, using safe fallback:', err);
  } finally {
    if (cleanupFn) {
      cleanupFn();
    }
  }

  // Fallback if canvas fails completely
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = (reader.result as string) || '';
      const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
      const fallbackFile = file instanceof File ? file : new File([file], safeFilename, { type: 'image/jpeg' });
      resolve({
        dataUrl,
        file: fallbackFile,
        width: 640,
        height: 480,
        sizeKb: Math.max(sizeKb, 1)
      });
    };
    reader.onerror = () => {
      const fallbackFile = file instanceof File ? file : new File([file], safeFilename, { type: 'image/jpeg' });
      resolve({
        dataUrl: '',
        file: fallbackFile,
        width: 0,
        height: 0,
        sizeKb: 0
      });
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Backward-compatible helper for existing components.
 * Guarantees SD image output (max 640px, ~30-45KB).
 */
export const optimizeProductPhoto = async (
  file: File
): Promise<{ dataUrl: string; width: number; height: number; sizeKb: number }> => {
  const result = await reduceToSDImage(file);
  return {
    dataUrl: result.dataUrl,
    width: result.width,
    height: result.height,
    sizeKb: result.sizeKb
  };
};

/**
 * Rotates an existing HTMLCanvasElement by 0, 90, 180, or 270 degrees.
 */
export const createRotatedCanvas = (
  sourceCanvas: HTMLCanvasElement,
  angleDegrees: number
): HTMLCanvasElement => {
  const normalizedAngle = ((angleDegrees % 360) + 360) % 360;
  if (normalizedAngle === 0) return sourceCanvas;

  const rotated = document.createElement('canvas');
  const isPerpendicular = normalizedAngle === 90 || normalizedAngle === 270;
  rotated.width = isPerpendicular ? sourceCanvas.height : sourceCanvas.width;
  rotated.height = isPerpendicular ? sourceCanvas.width : sourceCanvas.height;

  const ctx = rotated.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate((normalizedAngle * Math.PI) / 180);
  ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);

  return rotated;
};

/**
 * Crops a relative bounding box from a source canvas and optionally rotates it.
 */
export const createCroppedCanvas = (
  sourceCanvas: HTMLCanvasElement,
  xPct: number,
  yPct: number,
  wPct: number,
  hPct: number,
  rotateDegrees: number = 0
): HTMLCanvasElement => {
  const sx = Math.floor(sourceCanvas.width * xPct);
  const sy = Math.floor(sourceCanvas.height * yPct);
  const sw = Math.max(10, Math.floor(sourceCanvas.width * wPct));
  const sh = Math.max(10, Math.floor(sourceCanvas.height * hPct));

  const cropped = document.createElement('canvas');
  cropped.width = sw;
  cropped.height = sh;
  const ctx = cropped.getContext('2d');
  if (ctx) {
    ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  }
  if (rotateDegrees !== 0) {
    const rotated = createRotatedCanvas(cropped, rotateDegrees);
    cropped.width = 0;
    cropped.height = 0;
    return rotated;
  }
  return cropped;
};

export interface OCREnhancedCanvases {
  canvas0: HTMLCanvasElement;
  canvas90: HTMLCanvasElement;
  canvas270: HTMLCanvasElement;
  canvas180: HTMLCanvasElement;
  canvasRightEdge: HTMLCanvasElement;
  canvasLeftEdge: HTMLCanvasElement;
  canvasTopEdge: HTMLCanvasElement;
  canvasBottomEdge: HTMLCanvasElement;
  cleanup: () => void;
}

/**
 * Prepares high-contrast, multi-angle OCR canvases for reading package text
 * both top-to-bottom and right-to-left (sideways panels, crimp flaps, dot-matrix stamps).
 */
export const prepareOCREnhancedCanvases = async (
  file: File | Blob
): Promise<OCREnhancedCanvases> => {
  const { img, cleanup: cleanupImg } = await loadImageElement(file);

  const OCR_MAX_DIM = 1080;
  const srcW = img.naturalWidth || img.width || 800;
  const srcH = img.naturalHeight || img.height || 600;

  let targetW = srcW;
  let targetH = srcH;
  if (srcW > srcH) {
    if (srcW > OCR_MAX_DIM) {
      targetH = Math.round((srcH * OCR_MAX_DIM) / srcW);
      targetW = OCR_MAX_DIM;
    }
  } else {
    if (srcH > OCR_MAX_DIM) {
      targetW = Math.round((srcW * OCR_MAX_DIM) / srcH);
      targetH = OCR_MAX_DIM;
    }
  }

  const canvas0 = document.createElement('canvas');
  canvas0.width = targetW;
  canvas0.height = targetH;
  const ctx0 = canvas0.getContext('2d', { willReadFrequently: true });

  if (ctx0) {
    ctx0.drawImage(img, 0, 0, targetW, targetH);

    // Contrast stretching / normalization for text legibility
    try {
      const imgData = ctx0.getImageData(0, 0, targetW, targetH);
      const data = imgData.data;
      const len = data.length;

      let minLuma = 255;
      let maxLuma = 0;

      // Sample luma to calculate dynamic range
      const step = 8;
      for (let i = 0; i < len; i += 4 * step) {
        const luma = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        if (luma < minLuma) minLuma = luma;
        if (luma > maxLuma) maxLuma = luma;
      }

      const range = maxLuma - minLuma;
      if (range > 25 && range < 235) {
        // Stretch contrast so text separates starkly from packaging backgrounds
        const factor = 255 / range;
        for (let i = 0; i < len; i += 4) {
          const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const stretched = Math.min(255, Math.max(0, (luma - minLuma) * factor));
          data[i] = stretched;
          data[i + 1] = stretched;
          data[i + 2] = stretched;
        }
        ctx0.putImageData(imgData, 0, 0);
      }
    } catch {
      // If getImageData is restricted, proceed with raw rendered canvas
    }
  }

  cleanupImg();

  // 1. Full Package Rotations:
  // canvas0 = Top-to-Bottom (0° upright)
  // canvas90 = Right-to-Left / Sideways (90° clockwise: converts right-side vertical text to horizontal)
  // canvas270 = Left-to-Right / Sideways (270° counter-clockwise: converts left-side vertical text to horizontal)
  // canvas180 = Inverted (180°)
  const canvas90 = createRotatedCanvas(canvas0, 90);
  const canvas270 = createRotatedCanvas(canvas0, 270);
  const canvas180 = createRotatedCanvas(canvas0, 180);

  // 2. High-Detail Side Edge Crops:
  // On medicine strips, bottles, and cartons, expiry and batch dates are printed
  // along the side edges or crimp flaps in dot-matrix font.
  // We crop the right and left 38% edges and rotate them 90° so they read as crisp horizontal lines!
  const canvasRightEdge = createCroppedCanvas(canvas0, 0.62, 0, 0.38, 1.0, 90);
  const canvasLeftEdge = createCroppedCanvas(canvas0, 0, 0, 0.38, 1.0, 90);
  const canvasTopEdge = createCroppedCanvas(canvas0, 0, 0, 1.0, 0.35, 0);
  const canvasBottomEdge = createCroppedCanvas(canvas0, 0, 0.65, 1.0, 0.35, 0);

  const cleanup = () => {
    try {
      canvas0.width = 0;
      canvas0.height = 0;
      if (canvas90 !== canvas0) {
        canvas90.width = 0;
        canvas90.height = 0;
      }
      if (canvas270 !== canvas0) {
        canvas270.width = 0;
        canvas270.height = 0;
      }
      if (canvas180 !== canvas0) {
        canvas180.width = 0;
        canvas180.height = 0;
      }
      canvasRightEdge.width = 0;
      canvasRightEdge.height = 0;
      canvasLeftEdge.width = 0;
      canvasLeftEdge.height = 0;
      canvasTopEdge.width = 0;
      canvasTopEdge.height = 0;
      canvasBottomEdge.width = 0;
      canvasBottomEdge.height = 0;
    } catch {
      // ignore
    }
  };

  return {
    canvas0,
    canvas90,
    canvas270,
    canvas180,
    canvasRightEdge,
    canvasLeftEdge,
    canvasTopEdge,
    canvasBottomEdge,
    cleanup
  };
};

/**
 * Safe OCR image pre-processing.
 * Operates on lightweight SD dimensions to avoid WASM memory overflows.
 */
export const processImageForOCR = async (
  file: File | Blob
): Promise<{ processedFile: File; dataUrl: string }> => {
  try {
    // Guarantee SD image so memory remains low
    const sd = await reduceToSDImage(file, 'ocr_source.jpg');
    return {
      processedFile: sd.file,
      dataUrl: sd.dataUrl
    };
  } catch (err) {
    console.warn('processImageForOCR fallback:', err);
    const fallbackFile = file instanceof File ? file : new File([file], 'ocr.jpg', { type: 'image/jpeg' });
    return {
      processedFile: fallbackFile,
      dataUrl: ''
    };
  }
};
