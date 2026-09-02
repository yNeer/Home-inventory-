import { Html5Qrcode } from 'html5-qrcode';

/**
 * Extracts barcodes or QR codes from an image file.
 * Prioritizes native window.BarcodeDetector (fast, 0 overhead, robust on Android/Chrome).
 * Falls back to Html5Qrcode with safe sandbox offscreen mounting and strict timeout.
 * Guaranteed never to throw or crash the application.
 */
export const extractBarcodeFromImage = async (imageFile: File): Promise<string | null> => {
  // Strategy 1: Native BarcodeDetector API (modern Chrome/Edge/Android)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'itf']
      });
      const bitmap = await createImageBitmap(imageFile);
      try {
        const barcodes = await detector.detect(bitmap);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          return barcodes[0].rawValue.trim();
        }
      } finally {
        if (bitmap && typeof (bitmap as any).close === 'function') {
          (bitmap as any).close();
        }
      }
    } catch (nativeErr) {
      console.warn('Native BarcodeDetector attempt skipped:', nativeErr);
    }
  }

  // Strategy 2: Html5Qrcode fallback with guaranteed safety & cleanup
  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = (val: string | null) => {
      if (!resolved) {
        resolved = true;
        resolve(val);
      }
    };

    // Strict 2.5-second safety timeout so it never hangs the UI
    const timer = setTimeout(() => {
      safeResolve(null);
    }, 2500);

    try {
      // Offscreen container with valid dimensions (must not be display: none for Html5Qrcode)
      const containerId = 'safe-barcode-scanner-offscreen';
      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0px';
        container.style.width = '300px';
        container.style.height = '300px';
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '-1';
        document.body.appendChild(container);
      }

      const html5QrCode = new Html5Qrcode(containerId);

      const safeClear = () => {
        try {
          const res = html5QrCode.clear();
          if (res && typeof (res as any).catch === 'function') {
            (res as any).catch(() => {});
          }
        } catch {
          // Ignore synchronous cleanup errors
        }
      };

      html5QrCode
        .scanFile(imageFile, false)
        .then((decodedText) => {
          clearTimeout(timer);
          safeClear();
          safeResolve(decodedText ? decodedText.trim() : null);
        })
        .catch(() => {
          clearTimeout(timer);
          safeClear();
          safeResolve(null);
        });
    } catch (err) {
      clearTimeout(timer);
      console.warn('Html5Qrcode initialization handled safely:', err);
      safeResolve(null);
    }
  });
};
