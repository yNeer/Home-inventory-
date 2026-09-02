import React, { useState, useEffect } from 'react';
import { db, InventoryItem } from '../db';
import { processImageWithOCR, ParsedOCRResult } from '../utils/ocr';
import { lookupBarcode } from '../utils/productLookup';
import { extractBarcodeFromImage } from '../utils/barcodeExtractor';
import { processImageForOCR, optimizeProductPhoto } from '../utils/imageProcessor';
import { isOCRDownloaded, downloadOCRModel } from '../utils/ocrManager';
import BarcodeScanner from './BarcodeScanner';
import {
  FaCamera,
  FaSpinner,
  FaArrowLeft,
  FaCheck,
  FaBarcode,
  FaMagic,
  FaImages,
  FaCheckCircle,
  FaCloudDownloadAlt,
  FaSearchPlus,
  FaTimes
} from 'react-icons/fa';

interface AddItemProps {
  onBack: () => void;
  initialType?: 'grocery' | 'medicine';
}

const AddItem: React.FC<AddItemProps> = ({ onBack, initialType = 'grocery' }) => {
  const [loading, setLoading] = useState(false);
  const [ocrStatusText, setOcrStatusText] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [scanMode, setScanMode] = useState<'smart' | 'multi'>('smart');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [frontImagePreview, setFrontImagePreview] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // OCR offline capability state
  const [ocrOfflineReady, setOcrOfflineReady] = useState(false);
  const [downloadingOCR, setDownloadingOCR] = useState(false);
  const [ocrDownloadPct, setOcrDownloadPct] = useState(0);

  // OCR Extracted feedback banner
  const [lastOcrResult, setLastOcrResult] = useState<ParsedOCRResult | null>(null);

  const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    type: initialType,
    price: '',
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
    }
  };

  // Smart Scan: Capture front or product label, preserve readable quality photo, and extract all details via OCR
  const handleSmartScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setOcrStatusText('Optimizing readable photo & preparing AI...');
    setOcrProgress(15);

    try {
      // 1. Create crisp, high-resolution readable quality image for storage and display
      const { dataUrl: readableColorPhoto } = await optimizeProductPhoto(file);
      setImagePreview(readableColorPhoto);

      // 2. Prepare high-contrast image specifically for OCR in parallel
      setOcrStatusText('Detecting barcode and text...');
      setOcrProgress(30);
      const { processedFile } = await processImageForOCR(file);

      // 3. Extract barcode from original photo
      let decodedBarcode: string | null = null;
      try {
        decodedBarcode = await extractBarcodeFromImage(file);
      } catch (err) {
        console.warn('Barcode extraction skipped/failed:', err);
      }

      let productName = formData.name;
      let barcodeVal = formData.barcode;
      let descriptionVal = formData.description;
      let detailsVal = formData.details;

      if (decodedBarcode) {
        barcodeVal = decodedBarcode;
        setOcrStatusText(`Found Barcode: ${decodedBarcode}. Looking up details...`);
        try {
          const product = await lookupBarcode(decodedBarcode);
          if (product) {
            productName = product.name;
            if (product.description) descriptionVal = product.description;
            if (product.details) detailsVal = product.details;
          }
        } catch (err) {
          console.warn('Product lookup failed:', err);
        }
      }

      // 4. Run OCR for Expiry, Batch No, Mfg Date, MRP, Ingredients, Volume
      setOcrStatusText('Running OCR for Expiry, Batch No & MRP...');
      setOcrProgress(55);

      let extractedData: ParsedOCRResult | null = null;
      try {
        extractedData = await processImageWithOCR(processedFile, (pct, status) => {
          setOcrProgress(55 + Math.round(pct * 0.4));
          setOcrStatusText(status);
        });
        setLastOcrResult(extractedData);
      } catch (err) {
        console.warn('OCR processing failed:', err);
      }

      // 5. Update form state with all detected details
      setFormData(prev => ({
        ...prev,
        name: productName || extractedData?.name || prev.name,
        barcode: barcodeVal || prev.barcode,
        description: descriptionVal || prev.description,
        details: extractedData?.details || detailsVal || prev.details,
        price: extractedData?.price || prev.price,
        mfgDate: extractedData?.mfgDate || prev.mfgDate,
        expiryDate: extractedData?.expiryDate || prev.expiryDate,
        batchNo: extractedData?.batchNo || prev.batchNo,
        components: extractedData?.components || prev.components
      }));

    } catch (error) {
      console.error('Smart Scan failed:', error);
      alert('Could not process photo. You can still enter details manually.');
    } finally {
      setLoading(false);
      setOcrStatusText('');
      setOcrProgress(0);
    }
  };

  // Multi-Scan: Dedicated front of product photo in readable quality
  const handleFrontImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { dataUrl } = await optimizeProductPhoto(file);
      setFrontImagePreview(dataUrl);
      if (!imagePreview) {
        setImagePreview(dataUrl);
      }
    } catch (err) {
      console.error('Failed to process front image:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFrontImagePreview(reader.result as string);
        if (!imagePreview) setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Multi-Scan: Dedicated details image (Dates, MRP, Batch No)
  const handleDetailsImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setOcrStatusText('Processing label with OCR...');
    setOcrProgress(20);

    try {
      const { processedFile } = await processImageForOCR(file);
      const extractedData = await processImageWithOCR(processedFile, (pct, status) => {
        setOcrProgress(20 + Math.round(pct * 0.75));
        setOcrStatusText(status);
      });

      setLastOcrResult(extractedData);

      setFormData(prev => ({
        ...prev,
        name: prev.name || extractedData.name,
        price: extractedData.price || prev.price,
        mfgDate: extractedData.mfgDate || prev.mfgDate,
        expiryDate: extractedData.expiryDate || prev.expiryDate,
        batchNo: extractedData.batchNo || prev.batchNo,
        details: extractedData.details || prev.details,
        components: extractedData.components || prev.components
      }));
    } catch (error) {
      console.error('Details OCR read failed', error);
      alert('Could not extract details clearly from this label image.');
    } finally {
      setLoading(false);
      setOcrStatusText('');
      setOcrProgress(0);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setShowScanner(false);
    setLoading(true);
    setOcrStatusText(`Looking up barcode ${barcode}...`);
    try {
      const product = await lookupBarcode(barcode);
      if (product) {
        setFormData(prev => ({
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
      } else {
        setFormData(prev => ({ ...prev, barcode, name: prev.name || `Product ${barcode}` }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setOcrStatusText('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let parsedValue: string | number = value;
    if (type === 'number') {
      parsedValue = value === '' ? '' : Number(value);
    }
    setFormData(prev => ({ ...prev, [name]: parsedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a product name.');
      return;
    }

    try {
      // Save full readable quality image (front photo preferred)
      const finalImage = frontImagePreview || imagePreview || undefined;

      await db.items.add({
        ...formData,
        image: finalImage
      });
      onBack();
    } catch (error) {
      console.error('Error saving item', error);
      alert('Failed to save item.');
    }
  };

  const activePhoto = frontImagePreview || imagePreview;

  return (
    <div className="min-h-full bg-[#F8F9FE] flex flex-col pb-[120px] md:pb-12 selection:bg-indigo-300 relative w-full h-full overflow-y-auto">
      {/* Top Sticky Header */}
      <header className="bg-white/80 backdrop-blur-2xl px-6 md:px-10 pt-safe py-4 shadow-[0_4px_30px_rgb(0,0,0,0.02)] border-b border-white flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4 mt-2 sm:mt-6">
          <button
            onClick={onBack}
            aria-label="Go back"
            className="w-12 h-12 -ml-3 rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all md:hidden"
          >
            <FaArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#1a1b41] tracking-tight">Add Product</h2>
            <p className="text-xs font-bold text-slate-400">Scan front, batch no & expiry via OCR</p>
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
              title="Download OCR model for 100% offline scanning"
            >
              {downloadingOCR ? <FaSpinner className="animate-spin" size={12} /> : <FaCloudDownloadAlt size={14} />}
              <span>{downloadingOCR ? `Downloading ${ocrDownloadPct}%` : 'Download OCR'}</span>
            </button>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="hidden md:flex items-center gap-2 rounded-2xl px-6 py-3 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50"
          >
            <FaCheck size={16} /> Save Product
          </button>
          <button
            onClick={handleSubmit}
            aria-label="Save product"
            disabled={loading}
            className="md:hidden w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50"
          >
            <FaCheck size={16} />
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-6 md:px-10 py-6 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left Column: Image Capturing & OCR */}
        <div className="col-span-1 space-y-4 flex flex-col">
          {/* Scanner Mode Toggle */}
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-full">
            <button
              type="button"
              onClick={() => setScanMode('smart')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                scanMode === 'smart' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FaMagic /> Smart Scan (Auto)
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
                  <span>{ocrStatusText || 'Extracting details with OCR...'}</span>
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
                  OCR Extracted {lastOcrResult.extractedFieldsCount} Details
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
            </div>
          )}

          {scanMode === 'smart' ? (
            /* Smart Scan: Front of product in readable quality */
            <div className="relative group overflow-hidden bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center justify-center min-h-[320px] md:min-h-[420px] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleSmartScan}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />

              {activePhoto ? (
                <div className="w-full h-full absolute inset-0 z-0">
                  <img src={activePhoto} alt="Product" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-black/20"></div>

                  {/* Badge & Inspect button */}
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                    <span className="bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md">
                      ✓ Readable Quality
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setZoomedImage(activePhoto);
                    }}
                    className="absolute bottom-4 right-4 z-20 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 shadow-lg flex items-center gap-2 hover:bg-white"
                  >
                    <FaSearchPlus size={14} />
                    <span>Zoom Photo</span>
                  </button>

                  <div className="absolute bottom-4 left-4 z-20 text-white">
                    <span className="text-xs font-bold block drop-shadow-md">Front Photo Attached</span>
                    <span className="text-[10px] text-white/80 drop-shadow-sm">Tap anywhere to replace</span>
                  </div>
                </div>
              ) : (
                <div className="text-center z-0 flex flex-col items-center py-10 px-6">
                  <div className="w-20 h-20 bg-indigo-50 rounded-[28px] flex items-center justify-center mb-5 rotate-3 group-hover:rotate-6 transition-transform relative">
                    <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow-md animate-pulse">
                      OCR
                    </div>
                    <FaCamera className="text-3xl text-indigo-500" />
                  </div>
                  <p className="text-slate-800 font-extrabold text-xl tracking-tight mb-2">Front of Product / Label</p>
                  <p className="text-xs text-slate-500 font-medium max-w-[260px] leading-relaxed mb-4">
                    Snap the front of product or label. We preserve high readable quality and automatically fetch batch no, expiry & price via OCR.
                  </p>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-xl text-xs">
                    <FaCamera size={12} /> Tap to Capture or Upload
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Multi-Scan Options */
            <div className="flex flex-col gap-4">
              {/* Front of Product Image in Readable Quality */}
              <div className="relative h-44 group overflow-hidden bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center justify-center cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFrontImage}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {frontImagePreview ? (
                  <div className="w-full h-full relative">
                    <img src={frontImagePreview} className="w-full h-full object-cover" alt="Front of Product" />
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                      Front Photo (Readable Quality)
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setZoomedImage(frontImagePreview);
                      }}
                      className="absolute bottom-3 right-3 bg-white/90 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 shadow"
                    >
                      <FaSearchPlus size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="text-center flex flex-col items-center p-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 mb-2">
                      <FaCamera size={20} />
                    </div>
                    <p className="text-slate-800 font-bold text-sm">1. Front of Product Photo</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Captures full-color readable quality package face</p>
                  </div>
                )}
              </div>

              {/* Details Label OCR */}
              <div className="relative h-44 group overflow-hidden bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center justify-center cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleDetailsImage}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="text-center flex flex-col items-center p-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-2">
                    <FaMagic size={20} />
                  </div>
                  <p className="text-slate-800 font-bold text-sm">2. Scan Details Label (OCR)</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Fetches Batch No, Expiry, Mfg Date & MRP</p>
                </div>
              </div>

              {/* Live Barcode Scanner Button */}
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="h-16 bg-white border border-slate-200 rounded-[24px] shadow-sm flex items-center justify-center gap-3 font-bold text-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-95"
              >
                <FaBarcode size={22} className="text-indigo-500" />
                <span>3. Scan Barcode (Optional)</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Extracted Product Information Form */}
        <div className="space-y-6 col-span-1">
          <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-5">
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

            {/* Product Name */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Dolo 650 or Organic Milk"
                className="w-full bg-slate-50/70 rounded-2xl px-5 py-4 text-slate-800 font-bold text-lg focus:outline-none focus:bg-indigo-50/40 focus:ring-2 focus:ring-indigo-100 transition-all border border-slate-100"
                required
              />
            </div>

            {/* Type & Price */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">
                  Category
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full bg-slate-50/70 rounded-2xl px-5 py-4 text-slate-800 font-bold text-base focus:outline-none focus:bg-indigo-50/40 focus:ring-2 focus:ring-indigo-100 transition-all border border-slate-100"
                >
                  <option value="grocery">Grocery / Food</option>
                  <option value="medicine">Medicine / Pharmacy</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">
                  Price / MRP
                </label>
                <div className="flex items-center bg-slate-50/70 rounded-2xl px-5 py-4 focus-within:bg-indigo-50/40 focus-within:ring-2 focus-within:ring-indigo-100 transition-all border border-slate-100">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5 pl-1">
                  <label className="text-[10px] font-extrabold text-rose-600 uppercase tracking-widest">
                    Expiry Date *
                  </label>
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 pl-1">
                  Mfg Date
                </label>
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
            onClick={() => setZoomedImage(null)}
            className="absolute top-6 right-6 w-12 h-12 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center text-lg"
          >
            <FaTimes />
          </button>
          <div className="max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl border border-white/20">
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
