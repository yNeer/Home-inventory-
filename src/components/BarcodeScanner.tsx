import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { FaTimes } from 'react-icons/fa';

interface BarcodeScannerProps {
  onResult: (result: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onResult, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // We only want standard barcodes for products (EAN, UPC)
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 150 },
      aspectRatio: 1.0,
      supportedScanTypes: [] // Default supports all standard types
    };

    const scanner = new Html5QrcodeScanner("reader", config, false);
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        // Stop scanning after first successful read
        try {
          const res = scanner.clear();
          if (res && typeof (res as any).catch === 'function') {
            (res as any).catch(() => {});
          }
        } catch {
          // ignore
        }
        onResult(decodedText);
      },
      (err) => {
        // Ignore constant 'not found' errors from video stream
        if (typeof err === 'string' && !err.includes("NotFoundException")) {
            console.log("Scanner Error:", err);
        }
      }
    );

    return () => {
      if (scannerRef.current) {
        try {
          const res = scannerRef.current.clear();
          if (res && typeof (res as any).catch === 'function') {
            (res as any).catch((e: any) => console.warn("Failed to clear scanner", e));
          }
        } catch (e) {
          console.warn("Failed to clear scanner", e);
        }
      }
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-50"
      >
        <FaTimes size={20} />
      </button>

      <div className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl relative">
        <div className="p-4 bg-slate-50 text-center border-b border-slate-100">
           <h3 className="font-extrabold text-[#1a1b41] text-lg">Scan Barcode</h3>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Point camera at product barcode</p>
        </div>
        <div id="reader" className="w-full bg-black min-h-[300px]"></div>
        {error && <div className="p-4 text-center text-rose-500 font-bold text-sm bg-rose-50">{error}</div>}
      </div>
    </div>
  );
};

export default BarcodeScanner;
