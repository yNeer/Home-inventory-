import React, { useState, useEffect, useRef } from 'react';
import { db, InventoryItem } from '../db';
import { processImageWithMultiDirectionalOCR, ParsedOCRResult } from '../utils/ocr';
import { lookupBarcode } from '../utils/productLookup';
import { extractBarcodeFromImage } from '../utils/barcodeExtractor';
import { optimizeProductPhoto, reduceToSDImage } from '../utils/imageProcessor';
import { isOCRDownloaded, downloadOCRModel } from '../utils/ocrManager';
import BarcodeScanner from './BarcodeScanner';
import {
  FaCamera,
  FaFolderOpen,
  FaSpinner,
  FaArrowLeft,
  FaCheck,
  FaBarcode,
  FaMagic,
  FaImages,
  FaCheckCircle,
  FaCloudDownloadAlt,
  FaSearchPlus,
  FaTimes,
  FaRedo,
  FaTrash,
  FaExclamationCircle,
  FaInfoCircle,
  FaEdit,
  FaTag
} from 'react-icons/fa';

interface AddItemProps {
  onBack: () => void;
  initialType?: 'grocery' | 'medicine';
}

const COMMON_MEDICINE_PRESETS = [
  'Dolo 650',
  'Paracetamol 500mg',
  'Amoxicillin 500mg',
  'Cetirizine 10mg',
  'Azithromycin 500mg',
  'Pantoprazole 40mg',
  'Ibuprofen 400mg',
  'Cough Syrup 100ml'
];

const COMMON_GROCERY_PRESETS = [
  'Full Cream Milk 1L',
  'Whole Wheat Bread',
  'Basmati Rice 5kg',
  'Eggs (12-Pack)',
  'Refined Sunflower Oil 1L',
  'Iodized Salt 1kg',
  'Green Tea (25 Bags)',
  'Organic Honey 500g'
];

const AddItem: React.FC<AddItemProps> = ({ onBack, initialType = 'grocery' }) => {
  const [loading, setLoading] = useState(false);
  const [ocrStatusText, setOcrStatusText] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [scanMode, setScanMode] = useState<'smart' | 'multi'>('smart');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [frontImagePreview, setFrontImagePreview] = useState<string | null>(null);
  const [sdPhotoFile, setSdPhotoFile] = useState<File | null>(null);
  const [sdPhotoSizeKb, setSdPhotoSizeKb] = useState<number | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // In-app alert/notification banner (replaces window.alert)
  const [formNotice, setFormNotice] = useState<{
    type: 'error' | 'success' | 'info';
    message: string;
  } | null>(null);

  // Refs for camera vs gallery inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const frontCameraInputRef = useRef<HTMLInputElement>(null);
  const frontGalleryInputRef = useRef<HTMLInputElement>(null);
  const detailsCameraInputRef = useRef<HTMLInputElement>(null);
  const detailsGalleryInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // OCR offline capability state
  const [ocrOfflineReady, setOcrOfflineReady] = useState(false);
  const [downloadingOCR, setDownloadingOCR] = useState(false);
  const [ocrDownloadPct, setOcrDownloadPct] = useState(0);

  // OCR Extracted feedback banner
  const [lastOcrResult, setLastOcrResult] = useState<ParsedOCRResult | null>(null);

  // Options for product name selection & editing
  const [nameOptions, setNameOptions] = useState<string[]>([]);
  const [selectedNameOption, setSelectedNameOption] = useState<string | null>(null);
  const [showPresetNames, setShowPresetNames] = useState(false);

  const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    type: initialType,
    price: '',
    quantity: 1,
    lowQuantityThreshold: 2,
    mfgDate: '',
    expiryDate: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    batchNo: '',
    components: '',
    barcode: '',
    description: '',
    details: '',
    reminderOption: 'none',
    medicineTiming: 'any'
  });

  useEffect(() => {
    setOcrOfflineReady(isOCRDownloaded());
  }, []);

  const handleDownloadOCR = async () => {
    setDownloadingOCR(true);
    setOcrDownloadPct(10);
    const success = await downloadOCRModel((progress) => {
      setOcrDownloadPct(progress.percent);
      setOcrStatusText(progress.status);
    });
    setDownloadingOCR(false);
    if (success) {
      setOcrOfflineReady(true);
      setFormNotice({
        type: 'success',
        message: 'OCR model ready for 100% offline scanning.'
      });
    }
  };

  // Dedicated on-demand OCR scanner (scans top, side panels, and crimp flaps)
  const runOCRScan = async (sourceFile?: File | null) => {
    const fileToScan = sourceFile || sdPhotoFile;
    if (!fileToScan) {
      setFormNotice({
        type: 'info',
        message: 'Please take or upload a front photo first to scan text.'
      });
      return;
    }

    setLoading(true);
    setOcrStatusText('Scanning Top-to-Bottom & Right-to-Left (Top & Sideways)...');
    setOcrProgress(15);

    try {
      const extractedData = await processImageWithMultiDirectionalOCR(fileToScan, (pct, status) => {
        setOcrProgress(pct);
        setOcrStatusText(status);
      });

      if (extractedData && extractedData.extractedFieldsCount > 0) {
        setLastOcrResult(extractedData);
        if (extractedData.nameCandidates && extractedData.nameCandidates.length > 0) {
          setNameOptions((prev) =>
            Array.from(new Set([...extractedData.nameCandidates!, ...prev])).slice(0, 12)
          );
        }
        const angles = extractedData.scannedAngles?.length || 2;
        setFormNotice({
          type: 'success',
          message: `Detected and filled ${extractedData.extractedFieldsCount} fields (${angles} views scanned: Top & Sideways)!`
        });
      } else {
        if (extractedData?.nameCandidates && extractedData.nameCandidates.length > 0) {
          setNameOptions((prev) =>
            Array.from(new Set([...extractedData.nameCandidates!, ...prev])).slice(0, 12)
          );
        }
        setFormNotice({
          type: 'info',
          message: 'OCR scan complete. You can review or enter missing details below.'
        });
      }

      setFormData((prev) => ({
        ...prev,
        name: extractedData?.name || prev.name,
        price: extractedData?.price || prev.price,
        mfgDate: extractedData?.mfgDate || prev.mfgDate,
        expiryDate: extractedData?.expiryDate || prev.expiryDate,
        batchNo: extractedData?.batchNo || prev.batchNo,
        components: extractedData?.components || prev.components,
        details: extractedData?.details || prev.details
      }));
    } catch (err) {
      console.warn('OCR scan notice:', err);
      setFormNotice({
        type: 'info',
        message: 'OCR scan timed out. You can fill in the details manually.'
      });
    } finally {
      setLoading(false);
      setOcrStatusText('');
      setOcrProgress(0);
    }
  };

  // Process a selected or captured image file: downscales for memory safety & auto-fills all fields from all directions
  const processCapturedFile = async (file: File) => {
    if (!file) return;

    setLoading(true);
    setOcrStatusText('Optimizing image & preparing multi-angle scanner...');
    setOcrProgress(15);
    setFormNotice(null);

    try {
      // 1. Immediately downscale to Standard Definition (SD: max 640px, ~25-45KB) for responsive preview & storage
      const sdResult = await reduceToSDImage(file);
      if (sdResult.dataUrl) {
        setImagePreview(sdResult.dataUrl);
        setFrontImagePreview(sdResult.dataUrl);
        setSdPhotoFile(sdResult.file);
        setSdPhotoSizeKb(sdResult.sizeKb);
      }

      // 2. Fast non-blocking barcode check
      let decodedBarcode: string | null = null;
      let catalogProductName = '';
      let catalogDescription = '';
      let catalogDetails = '';

      try {
        decodedBarcode = await extractBarcodeFromImage(sdResult.file);
        if (decodedBarcode) {
          const product = await lookupBarcode(decodedBarcode);
          if (product) {
            catalogProductName = product.name;
            if (product.description) catalogDescription = product.description;
            if (product.details) catalogDetails = product.details;
          }
        }
      } catch (err) {
        console.warn('Fast barcode check skipped:', err);
      }

      // 3. Multi-Directional OCR Scan: reads top, front face, side panels, and crimp flaps
      setOcrStatusText('Reading package text from top and side panels...');
      setOcrProgress(30);

      const extractedData = await processImageWithMultiDirectionalOCR(file, (pct, status) => {
        setOcrProgress(Math.min(98, 20 + Math.round(pct * 0.78)));
        setOcrStatusText(status);
      });

      if (extractedData) {
        setLastOcrResult(extractedData);
        const candidates = extractedData.nameCandidates || [];
        const combined = [...candidates];
        if (catalogProductName && !combined.includes(catalogProductName)) {
          combined.unshift(catalogProductName);
        }
        if (combined.length > 0) {
          setNameOptions((prev) => Array.from(new Set([...combined, ...prev])).slice(0, 12));
        }
      } else if (catalogProductName) {
        setNameOptions((prev) => Array.from(new Set([catalogProductName, ...prev])).slice(0, 12));
      }

      // 4. Auto-fill all detected product fields
      setFormData((prev) => ({
        ...prev,
        name: extractedData?.name || catalogProductName || prev.name,
        price: extractedData?.price || prev.price,
        mfgDate: extractedData?.mfgDate || prev.mfgDate,
        expiryDate: extractedData?.expiryDate || prev.expiryDate,
        batchNo: extractedData?.batchNo || prev.batchNo,
        components: extractedData?.components || prev.components,
        details: extractedData?.details || catalogDetails || prev.details,
        description: catalogDescription || prev.description,
        barcode: decodedBarcode || prev.barcode
      }));

      const count = extractedData?.extractedFieldsCount || 0;
      if (count > 0) {
        const angles = extractedData?.scannedAngles?.length || 2;
        setFormNotice({
          type: 'success',
          message: `Auto-filled ${count} fields from package (${angles} views scanned: Top & Sideways)!`
        });
      } else {
        setFormNotice({
          type: 'info',
          message: `Photo attached (~${sdResult.sizeKb || 35} KB). Label scanned; you can review or adjust fields below.`
        });
      }
    } catch (error) {
      console.warn('Scan handling notification:', error);
      setFormNotice({
        type: 'info',
        message: 'Photo attached! You can review or enter product details manually.'
      });
    } finally {
      setLoading(false);
      setOcrStatusText('');
      setOcrProgress(0);
      // Reset input values so selecting the same file again triggers onChange
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleSmartScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processCapturedFile(file);
    }
  };

  // Multi-Scan: Dedicated front of product photo (enforces SD image reduction)
  const handleFrontImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const sdResult = await reduceToSDImage(file);
      if (sdResult.dataUrl) {
        setFrontImagePreview(sdResult.dataUrl);
        if (!imagePreview) setImagePreview(sdResult.dataUrl);
        setSdPhotoFile(sdResult.file);
        setSdPhotoSizeKb(sdResult.sizeKb);
        setFormNotice({
          type: 'success',
          message: `Front photo reduced to SD image (~${sdResult.sizeKb} KB).`
        });
      }
    } catch (err) {
      console.warn('Failed to process front image:', err);
    } finally {
      if (frontCameraInputRef.current) frontCameraInputRef.current.value = '';
      if (frontGalleryInputRef.current) frontGalleryInputRef.current.value = '';
    }
  };

  // Multi-Scan: Dedicated details image (converts to SD first, then runs OCR safely)
  const handleDetailsImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const sdResult = await reduceToSDImage(file, 'label_sd.jpg');
      await runOCRScan(sdResult.file);
    } catch (error) {
      console.warn('Details OCR read warning:', error);
      setFormNotice({
        type: 'info',
        message: 'Could not auto-read text from this image. Please enter details manually.'
      });
    } finally {
      setLoading(false);
      setOcrStatusText('');
      setOcrProgress(0);
      if (detailsCameraInputRef.current) detailsCameraInputRef.current.value = '';
      if (detailsGalleryInputRef.current) detailsGalleryInputRef.current.value = '';
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setShowScanner(false);
    setLoading(true);
    setOcrStatusText(`Looking up barcode ${barcode}...`);
    try {
      const product = await lookupBarcode(barcode);
      if (product) {
        setFormData((prev) => ({
          ...prev,
          barcode,
          name: product.name || prev.name,
          type: product.type || prev.type,
          description: product.description || prev.description,
          details: product.details || prev.details
        }));
        if (product.image_url && !imagePreview && !frontImagePreview) {
          setImagePreview(product.image_url);
        }
        if (product.name) {
          setNameOptions((prev) => Array.from(new Set([product.name, ...prev])).slice(0, 12));
        }
        setFormNotice({
          type: 'success',
          message: `Found product: "${product.name}"`
        });
      } else {
        setFormData((prev) => ({ ...prev, barcode, name: prev.name || `Product ${barcode}` }));
        setFormNotice({
          type: 'info',
          message: `Barcode ${barcode} recorded.`
        });
      }
    } catch (error) {
      console.warn('Barcode lookup warning:', error);
    } finally {
      setLoading(false);
      setOcrStatusText('');
    }
  };

  const handleSelectNameOption = (optName: string) => {
    setFormData((prev) => ({ ...prev, name: optName }));
    setSelectedNameOption(optName);
    // Focus the name input field so user can edit right away
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.focus();
        const len = optName.length;
        nameInputRef.current.setSelectionRange(len, len);
      }
    }, 60);
  };

  const handleClearName = () => {
    setFormData((prev) => ({ ...prev, name: '' }));
    setSelectedNameOption(null);
    if (nameInputRef.current) {
      nameInputRef.current.focus();
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    let parsedValue: string | number = value;
    if (type === 'number') {
      parsedValue = value === '' ? '' : Number(value);
    }
    setFormData((prev) => ({ ...prev, [name]: parsedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormNotice({
        type: 'error',
        message: 'Please enter a product name before saving.'
      });
      const nameInput = document.querySelector<HTMLInputElement>('input[name="name"]');
      if (nameInput) nameInput.focus();
      return;
    }

    try {
      const finalImage = frontImagePreview || imagePreview || undefined;

      await db.items.add({
        ...formData,
        image: finalImage
      });
      onBack();
    } catch (error) {
      console.error('Error saving item:', error);
      setFormNotice({
        type: 'error',
        message: 'Failed to save item. Please check storage.'
      });
    }
  };

  const activePhoto = frontImagePreview || imagePreview;

  const handleClearPhoto = () => {
    setImagePreview(null);
    setFrontImagePreview(null);
    setSdPhotoFile(null);
    setSdPhotoSizeKb(null);
    setLastOcrResult(null);
  };

  return (
    <div className="min-h-full bg-[#F8F9FE] flex flex-col pb-[120px] md:pb-12 selection:bg-indigo-300 relative w-full h-full overflow-y-auto">
      {/* Top Sticky Header */}
      <header className="bg-white/80 backdrop-blur-2xl px-6 md:px-10 pt-safe py-4 shadow-[0_4px_30px_rgb(0,0,0,0.02)] border-b border-white flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4 mt-2 sm:mt-6">
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="w-12 h-12 -ml-3 rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all md:hidden"
          >
            <FaArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#1a1b41] tracking-tight">Add Product</h2>
            <p className="text-xs font-bold text-slate-400">Capture photo, scan batch no & expiry</p>
          </div>
        </div>

        {/* Offline OCR Readiness Pill */}
        <div className="flex items-center gap-3 mt-2 sm:mt-6">
          {ocrOfflineReady ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full shadow-sm">
              <FaCheckCircle size={12} />
              <span>Offline OCR Ready</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleDownloadOCR}
              disabled={downloadingOCR}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-full transition-all active:scale-95"
              title="Download OCR model for offline scanning"
            >
              {downloadingOCR ? <FaSpinner className="animate-spin" size={12} /> : <FaCloudDownloadAlt size={14} />}
              <span>{downloadingOCR ? `Downloading ${ocrDownloadPct}%` : 'Download OCR'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="hidden md:flex items-center gap-2 rounded-2xl px-6 py-3 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50"
          >
            <FaCheck size={16} /> Save Product
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            aria-label="Save product"
            disabled={loading}
            className="md:hidden w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50"
          >
            <FaCheck size={16} />
          </button>
        </div>
      </header>

      {/* Hidden file inputs for Smart Scan */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleSmartScan}
        className="hidden"
        aria-hidden="true"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleSmartScan}
        className="hidden"
        aria-hidden="true"
      />

      {/* Hidden file inputs for Multi-Scan */}
      <input
        ref={frontCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFrontImage}
        className="hidden"
        aria-hidden="true"
      />
      <input
        ref={frontGalleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFrontImage}
        className="hidden"
        aria-hidden="true"
      />
      <input
        ref={detailsCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleDetailsImage}
        className="hidden"
        aria-hidden="true"
      />
      <input
        ref={detailsGalleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleDetailsImage}
        className="hidden"
        aria-hidden="true"
      />

      <form onSubmit={handleSubmit} className="px-6 md:px-10 py-6 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left Column: Image Capturing & OCR */}
        <div className="col-span-1 space-y-4 flex flex-col">
          {/* Notification / Toast Banner */}
          {formNotice && (
            <div
              className={`p-4 rounded-2xl border flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 ${
                formNotice.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : formNotice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-800'
              }`}
            >
              <div className="flex items-center gap-2.5 text-xs font-bold">
                {formNotice.type === 'error' && <FaExclamationCircle className="text-rose-500 shrink-0" size={15} />}
                {formNotice.type === 'success' && <FaCheckCircle className="text-emerald-500 shrink-0" size={15} />}
                {formNotice.type === 'info' && <FaInfoCircle className="text-indigo-500 shrink-0" size={15} />}
                <span>{formNotice.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFormNotice(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Dismiss message"
              >
                <FaTimes size={12} />
              </button>
            </div>
          )}

          {/* Scanner Mode Toggle */}
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-full">
            <button
              type="button"
              onClick={() => setScanMode('smart')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                scanMode === 'smart' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FaMagic /> Smart Scan (All-in-One)
            </button>
            <button
              type="button"
              onClick={() => setScanMode('multi')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                scanMode === 'multi' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FaImages /> Multi-Scan (Front + Label)
            </button>
          </div>

          {/* OCR / Processing Progress Card */}
          {loading && (
            <div className="bg-indigo-600 text-white rounded-2xl p-4 shadow-lg shadow-indigo-200 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                <span className="flex items-center gap-2">
                  <FaSpinner className="animate-spin" size={14} />
                  <span>{ocrStatusText || 'Processing image...'}</span>
                </span>
                <span>{ocrProgress}%</span>
              </div>
              <div className="w-full bg-indigo-900/40 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(5, ocrProgress)}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* OCR Results Feedback Banner */}
          {lastOcrResult && lastOcrResult.extractedSummary.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <FaCheckCircle className="text-emerald-500" />
                  Detected {lastOcrResult.extractedFieldsCount} Details from Image
                </span>
                <button
                  type="button"
                  onClick={() => setLastOcrResult(null)}
                  className="text-emerald-700 hover:text-emerald-900"
                >
                  <FaTimes size={12} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {lastOcrResult.extractedSummary.map((item, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-bold bg-white text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full shadow-2xs"
                  >
                    {item}
                  </span>
                ))}
              </div>
              {lastOcrResult.scannedAngles && lastOcrResult.scannedAngles.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-emerald-200/70 flex items-center gap-1.5 flex-wrap text-[10.5px] text-emerald-800">
                  <span className="font-bold text-emerald-900">Scanned:</span>
                  {lastOcrResult.scannedAngles.map((dir, i) => (
                    <span
                      key={i}
                      className="bg-emerald-100/90 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-300/60 font-medium"
                    >
                      {dir}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {scanMode === 'smart' ? (
            /* Smart Scan: Front of product in readable quality */
            <div className="relative overflow-hidden bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center justify-center min-h-[340px] md:min-h-[420px] transition-all">
              {activePhoto ? (
                <div className="w-full h-full min-h-[340px] md:min-h-[420px] relative flex flex-col justify-between p-4 bg-slate-900">
                  <img
                    src={activePhoto}
                    alt="Product"
                    className="absolute inset-0 w-full h-full object-contain bg-slate-900"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none"></div>

                  {/* Top Bar: Badge & Zoom */}
                  <div className="relative z-20 flex items-center justify-between w-full">
                    <span className="bg-slate-900/85 backdrop-blur-md text-white border border-emerald-400/40 text-[10.5px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-white font-extrabold tracking-wide">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                        </span>
                        ✓ SD Optimized (640px)
                      </span>
                      {sdPhotoSizeKb && (
                        <span className="text-emerald-300 font-semibold text-[10px] bg-emerald-950/70 px-2 py-0.5 rounded-full border border-emerald-500/25">
                          ~{sdPhotoSizeKb} KB
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomedImage(activePhoto)}
                      className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 shadow-md flex items-center gap-1.5 hover:bg-white active:scale-95 transition-all"
                    >
                      <FaSearchPlus size={13} />
                      <span>Zoom Photo</span>
                    </button>
                  </div>

                  {/* Bottom Bar: Action buttons */}
                  <div className="relative z-20 flex flex-col gap-2.5 pt-4">
                    <button
                      type="button"
                      onClick={() => runOCRScan()}
                      disabled={loading}
                      className="w-full bg-indigo-600/95 hover:bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <FaMagic size={13} />
                      <span>Auto-Detect Expiry & Batch (OCR)</span>
                    </button>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="text-white">
                        <span className="text-xs font-bold block drop-shadow-md">Front Photo Attached</span>
                        <span className="text-[10px] text-white/80 drop-shadow-sm">SD resolution • memory safe</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="flex-1 sm:flex-initial bg-white/90 hover:bg-white text-slate-800 px-3 py-2 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          <FaRedo size={12} />
                          <span>Retake</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleClearPhoto}
                          className="bg-rose-500/90 hover:bg-rose-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                        >
                          <FaTrash size={12} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center flex flex-col items-center py-8 px-6 w-full max-w-sm">
                  <div className="w-20 h-20 bg-indigo-50 rounded-[28px] flex items-center justify-center mb-4 relative">
                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow-md">
                      SD 640px
                    </div>
                    <FaCamera className="text-3xl text-indigo-500" />
                  </div>

                  <p className="text-slate-800 font-extrabold text-xl tracking-tight mb-2">Front of Product (SD Image)</p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                    Take a clear photo of the product or label. Automatically converted to standard definition (640px) to prevent crashes and ensure lightning-fast saving.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                      type="button"
                      id="btn-take-photo"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-2xl text-xs shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-all"
                    >
                      <FaCamera size={14} />
                      <span>Take Photo</span>
                    </button>
                    <button
                      type="button"
                      id="btn-upload-gallery"
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <FaFolderOpen size={14} />
                      <span>Upload File</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Multi-Scan Options */
            <div className="flex flex-col gap-4">
              {/* Front of Product Image in Readable Quality */}
              <div className="relative p-4 bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center justify-center">
                {frontImagePreview ? (
                  <div className="w-full h-44 relative rounded-xl overflow-hidden bg-slate-900">
                    <img src={frontImagePreview} className="w-full h-full object-contain" alt="Front of Product" />
                    <div className="absolute top-2 left-2 bg-emerald-600/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                      <span>✓ SD Front Photo</span>
                    </div>
                    <div className="absolute bottom-2 right-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setZoomedImage(frontImagePreview)}
                        className="bg-white/90 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 shadow"
                      >
                        <FaSearchPlus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFrontImagePreview(null)}
                        className="bg-rose-500/90 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center flex flex-col items-center py-4 w-full">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 mb-2">
                      <FaCamera size={20} />
                    </div>
                    <p className="text-slate-800 font-bold text-sm">1. Front of Product (SD Image)</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Standard definition photo (640px • ~35 KB)</p>
                    <div className="flex gap-2 w-full max-w-xs">
                      <button
                        type="button"
                        onClick={() => frontCameraInputRef.current?.click()}
                        className="flex-1 py-2 px-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <FaCamera size={11} /> Camera
                      </button>
                      <button
                        type="button"
                        onClick={() => frontGalleryInputRef.current?.click()}
                        className="flex-1 py-2 px-3 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <FaFolderOpen size={11} /> Gallery
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Details Label OCR */}
              <div className="relative p-4 bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center justify-center">
                <div className="text-center flex flex-col items-center py-4 w-full">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-2">
                    <FaMagic size={20} />
                  </div>
                  <p className="text-slate-800 font-bold text-sm">2. Scan Details Label (OCR)</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Reads Batch No, Expiry (Exp), Manufacturing Date (Mfg) & MRP</p>
                  <div className="flex gap-2 w-full max-w-xs">
                    <button
                      type="button"
                      onClick={() => detailsCameraInputRef.current?.click()}
                      className="flex-1 py-2 px-3 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <FaCamera size={11} /> Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => detailsGalleryInputRef.current?.click()}
                      className="flex-1 py-2 px-3 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <FaFolderOpen size={11} /> Gallery
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Barcode Scanner Button */}
              <button
                type="button"
                id="btn-scan-barcode-modal"
                onClick={() => setShowScanner(true)}
                className="h-14 bg-white border border-slate-200 rounded-[20px] shadow-sm flex items-center justify-center gap-3 font-bold text-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-95"
              >
                <FaBarcode size={20} className="text-indigo-500" />
                <span>3. Scan Barcode (Optional)</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Extracted Product Information Form */}
        <div className="space-y-6 col-span-1">
          <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-5">
            {/* Multi-Directional OCR Auto-Fill Confirmation Pill */}
            {lastOcrResult && lastOcrResult.extractedFieldsCount > 0 && (
              <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-extrabold tracking-wide">
                    <FaMagic className="text-emerald-600" />
                    <span>Auto-Filled from Package (Top & Sides Scanned)</span>
                  </div>
                  <span className="text-[10.5px] font-extrabold bg-emerald-200/70 text-emerald-800 px-2.5 py-0.5 rounded-full">
                    {lastOcrResult.extractedFieldsCount} fields detected
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {lastOcrResult.extractedSummary.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 bg-white text-emerald-900 border border-emerald-200/90 text-xs font-semibold px-2.5 py-1 rounded-xl shadow-2xs"
                    >
                      <FaCheck className="text-emerald-500 text-[10px]" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Barcode Display if present */}
            {formData.barcode && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaBarcode className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Barcode</span>
                </div>
                <span className="font-mono text-sm font-bold text-slate-800">{formData.barcode}</span>
              </div>
            )}

            {/* Product Name with Detected Options & Full Editing Support */}
            <div className="space-y-2">
              <div className="flex items-center justify-between pl-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  Product Name *
                  {formData.name && (
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <FaEdit className="text-[9px]" /> editable
                    </span>
                  )}
                </label>
                {formData.name && (
                  <button
                    type="button"
                    onClick={handleClearName}
                    className="text-[11px] font-semibold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
                    title="Clear product name"
                  >
                    <FaTimes size={10} /> Clear
                  </button>
                )}
              </div>

              {/* Main Name Input - Always directly editable */}
              <div className="relative">
                <input
                  ref={nameInputRef}
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Dolo 650 or Organic Milk"
                  className="w-full bg-slate-50/70 rounded-2xl pl-5 pr-10 py-4 text-slate-800 font-bold text-lg focus:outline-none focus:bg-indigo-50/40 focus:ring-2 focus:ring-indigo-100 transition-all border border-slate-100"
                  required
                />
                {formData.name && (
                  <button
                    type="button"
                    onClick={handleClearName}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs transition-colors"
                    title="Clear"
                  >
                    <FaTimes size={9} />
                  </button>
                )}
              </div>

              {/* Detected Name Options from Scan */}
              {(nameOptions.length > 0 || (formData.components && formData.components.trim().length > 3)) && (
                <div className="bg-gradient-to-br from-indigo-50/60 via-slate-50 to-purple-50/30 border border-indigo-100/90 rounded-2xl p-3.5 mt-2">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-950">
                      <FaMagic className="text-indigo-600 text-[11px]" />
                      <span>Choose Name from Scan:</span>
                    </div>
                    <span className="text-[10.5px] text-slate-500 font-medium">
                      Tap to select, then edit above
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {nameOptions.map((opt, i) => {
                      const isSelected = formData.name.trim().toLowerCase() === opt.trim().toLowerCase();
                      return (
                        <button
                          key={`${opt}-${i}`}
                          type="button"
                          onClick={() => handleSelectNameOption(opt)}
                          className={`group px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-left flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 scale-[1.02]'
                              : 'bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 border border-slate-200/90 hover:border-indigo-300 shadow-2xs'
                          }`}
                        >
                          {isSelected ? (
                            <FaCheck size={9} className="text-white shrink-0" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 group-hover:bg-indigo-500 shrink-0" />
                          )}
                          <span className="truncate max-w-[220px]">{opt}</span>
                        </button>
                      );
                    })}

                    {/* Active formulation / salt chip if available and not already listed */}
                    {formData.components && (() => {
                      const saltName = formData.components.split(/[,;\n]/)[0]?.trim();
                      if (!saltName || saltName.length < 3 || nameOptions.some(o => o.toLowerCase() === saltName.toLowerCase())) return null;
                      const isSelected = formData.name.trim().toLowerCase() === saltName.toLowerCase();
                      return (
                        <button
                          key="salt-chip"
                          type="button"
                          onClick={() => handleSelectNameOption(saltName)}
                          className={`group px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-left flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 scale-[1.02]'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/90 shadow-2xs'
                          }`}
                          title="Use Active Formulation / Salt"
                        >
                          {isSelected ? (
                            <FaCheck size={9} className="text-white shrink-0" />
                          ) : (
                            <span className="text-[9.5px] uppercase font-extrabold text-emerald-600 bg-emerald-100/80 px-1 py-0.5 rounded">Salt</span>
                          )}
                          <span className="truncate max-w-[220px]">{saltName}</span>
                        </button>
                      );
                    })()}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-indigo-100/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <FaEdit className="text-indigo-500 text-[10px]" />
                      <span>Tap any option to choose it; you can freely type, adjust or append in the box above.</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Common Presets Toggle */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowPresetNames(!showPresetNames)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 pl-1 cursor-pointer"
                >
                  <FaTag className="text-[10px]" />
                  <span>{showPresetNames ? 'Hide common names' : `Or choose from common ${formData.type === 'medicine' ? 'medicines' : 'groceries'}`}</span>
                </button>

                {showPresetNames && (
                  <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3 mt-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Popular {formData.type === 'medicine' ? 'Medicines' : 'Groceries'} (Tap to select & edit):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(formData.type === 'medicine' ? COMMON_MEDICINE_PRESETS : COMMON_GROCERY_PRESETS).map((preset) => {
                        const isSelected = formData.name.trim().toLowerCase() === preset.trim().toLowerCase();
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleSelectNameOption(preset)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {isSelected && <FaCheck size={8} />}
                            <span>{preset}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Type, Price & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">
                  Category
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full bg-slate-50/70 rounded-2xl px-4 py-4 text-slate-800 font-bold text-sm sm:text-base focus:outline-none focus:bg-indigo-50/40 focus:ring-2 focus:ring-indigo-100 transition-all border border-slate-100"
                >
                  <option value="grocery">Grocery / Food</option>
                  <option value="medicine">Medicine / Pharmacy</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">
                  Price / MRP
                </label>
                <div className="flex items-center bg-slate-50/70 rounded-2xl px-4 py-4 focus-within:bg-indigo-50/40 focus-within:ring-2 focus-within:ring-indigo-100 transition-all border border-slate-100">
                  <span className="text-slate-400 font-extrabold text-base mr-2">₹</span>
                  <input
                    type="text"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full bg-transparent text-slate-800 font-bold text-base focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">
                  Quantity / Stock
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity ?? 1}
                  onChange={handleChange}
                  min="0"
                  placeholder="1"
                  className="w-full bg-slate-50/70 rounded-2xl px-4 py-4 text-slate-800 font-bold text-base focus:outline-none focus:bg-indigo-50/40 focus:ring-2 focus:ring-indigo-100 transition-all border border-slate-100"
                />
              </div>
            </div>

            {/* Batch No (Fetched using OCR) */}
            <div className="bg-indigo-50/30 border border-indigo-100/60 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest">
                  Batch No. (OCR Fetched)
                </label>
                {formData.batchNo && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    ✓ Detected
                  </span>
                )}
              </div>
              <input
                type="text"
                name="batchNo"
                value={formData.batchNo || ''}
                onChange={handleChange}
                placeholder="e.g. B2401-A, LOT8912"
                className="w-full bg-white rounded-xl px-4 py-3 text-slate-800 font-mono font-bold text-base focus:outline-none focus:ring-2 focus:ring-indigo-200 border border-indigo-100"
              />
            </div>

            {/* Dates: Expiry and Mfg */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5 pl-1">
                  <label className="text-[10px] font-extrabold text-rose-600 uppercase tracking-widest">
                    Expiry Date (Exp) *
                  </label>
                  {formData.expiryDate && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      ✓ Detected
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate || ''}
                  onChange={handleChange}
                  className="w-full bg-slate-50/70 rounded-2xl px-4 py-4 text-slate-800 font-bold text-sm focus:outline-none focus:bg-indigo-50/40 focus:ring-2 focus:ring-indigo-100 transition-all border border-slate-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 pl-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Manufacturing Date (Mfg)
                  </label>
                  {formData.mfgDate && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      ✓ Detected
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  name="mfgDate"
                  value={formData.mfgDate || ''}
                  onChange={handleChange}
                  className="w-full bg-slate-50/70 rounded-2xl px-4 py-4 text-slate-800 font-bold text-sm focus:outline-none focus:bg-indigo-50/40 focus:ring-2 focus:ring-indigo-100 transition-all border border-slate-100"
                />
              </div>
            </div>

            {/* Details (Volume, Weight, Units) */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">
                Volume / Weight / Pack Details (OCR)
              </label>
              <input
                type="text"
                name="details"
                value={formData.details || ''}
                onChange={handleChange}
                placeholder="e.g. 500ml • 10 Tablets • 1kg"
                className="w-full bg-slate-50/70 rounded-2xl px-5 py-4 text-slate-800 font-bold text-base focus:outline-none focus:bg-indigo-50/40 focus:ring-2 focus:ring-indigo-100 transition-all border border-slate-100"
              />
            </div>

            {/* Medicine Specific dosage & composition */}
            {formData.type === 'medicine' && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">
                      Total Tablets
                    </label>
                    <input
                      type="number"
                      name="totalQuantity"
                      value={formData.totalQuantity || ''}
                      onChange={handleChange}
                      placeholder="e.g. 30"
                      min="1"
                      className="w-full bg-slate-50/70 rounded-2xl px-5 py-3 text-slate-800 font-bold text-base focus:outline-none focus:ring-2 focus:ring-indigo-100 border border-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">
                      Daily Dose
                    </label>
                    <input
                      type="number"
                      name="dailyDose"
                      value={formData.dailyDose || ''}
                      onChange={handleChange}
                      placeholder="e.g. 2"
                      min="1"
                      className="w-full bg-slate-50/70 rounded-2xl px-5 py-3 text-slate-800 font-bold text-base focus:outline-none focus:ring-2 focus:ring-indigo-100 border border-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">
                    Composition / Active Ingredients
                  </label>
                  <textarea
                    name="components"
                    value={formData.components || ''}
                    onChange={handleChange}
                    rows={2}
                    placeholder="e.g. Paracetamol 650mg, Caffeine 50mg"
                    className="w-full bg-slate-50/70 rounded-2xl px-5 py-3 text-slate-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 border border-slate-100 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">
                Description / Notes
              </label>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                rows={2}
                placeholder="Storage instructions, brand info, or notes..."
                className="w-full bg-slate-50/70 rounded-2xl px-5 py-3 text-slate-700 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 border border-slate-100 resize-none"
              />
            </div>
          </div>
        </div>
      </form>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onResult={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Zoom / Readable Image Preview Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            className="absolute top-6 right-6 w-12 h-12 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center text-lg transition-colors"
          >
            <FaTimes />
          </button>
          <div
            className="max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl border border-white/20 bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={zoomedImage} alt="Product Quality" className="w-full h-full object-contain" />
          </div>
          <p className="text-white/80 text-xs font-bold mt-4 tracking-wider uppercase">
            Front of Product — High Clarity Readable Quality
          </p>
        </div>
      )}
    </div>
  );
};

export default AddItem;
