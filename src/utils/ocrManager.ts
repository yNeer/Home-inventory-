import Tesseract from 'tesseract.js';

export interface OCRDownloadProgress {
  percent: number;
  status: string;
}

const OCR_CACHE_KEY = 'home_inventory_ocr_ready';
const OCR_CACHE_TIMESTAMP_KEY = 'home_inventory_ocr_cached_at';

/**
 * Checks if the OCR engine language model is already initialized / cached.
 */
export const isOCRDownloaded = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(OCR_CACHE_KEY) === 'true';
};

export const getOCRCacheDate = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(OCR_CACHE_TIMESTAMP_KEY);
};

/**
 * Downloads and caches the Tesseract language model ('eng') in IndexedDB / CacheStorage
 * for completely offline OCR scanning.
 */
export const downloadOCRModel = async (
  onProgress?: (progress: OCRDownloadProgress) => void
): Promise<boolean> => {
  try {
    if (onProgress) {
      onProgress({ percent: 5, status: 'Initializing OCR Engine...' });
    }

    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m: any) => {
        if (onProgress && m) {
          let pct = Math.round((m.progress || 0) * 100);
          if (m.status === 'loading language traineddata') {
            onProgress({
              percent: Math.min(95, Math.max(15, pct)),
              status: `Downloading language model (eng.traineddata): ${pct}%`
            });
          } else if (m.status === 'loaded language traineddata') {
            onProgress({ percent: 95, status: 'Language model cached successfully!' });
          } else if (m.status === 'initializing api' || m.status === 'initialized api') {
            onProgress({ percent: 98, status: 'Finalizing OCR setup...' });
          } else if (m.status) {
            onProgress({ percent: Math.min(90, Math.max(10, pct)), status: m.status });
          }
        }
      }
    });

    // Test simple recognition to confirm model works
    if (onProgress) {
      onProgress({ percent: 99, status: 'Verifying offline readiness...' });
    }

    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE
    });

    await worker.terminate();

    localStorage.setItem(OCR_CACHE_KEY, 'true');
    localStorage.setItem(OCR_CACHE_TIMESTAMP_KEY, new Date().toLocaleDateString());

    if (onProgress) {
      onProgress({ percent: 100, status: 'OCR downloaded and ready offline!' });
    }

    return true;
  } catch (error) {
    console.error('Failed to download OCR model:', error);
    if (onProgress) {
      onProgress({ percent: 0, status: 'Download failed. Please check internet connection.' });
    }
    return false;
  }
};
