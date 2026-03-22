import React, { useState } from 'react';
import { db, InventoryItem } from '../db';
import { processImageWithOCR } from '../utils/ocr';
import { lookupBarcode } from '../utils/productLookup';
import { extractBarcodeFromImage } from '../utils/barcodeExtractor';
import { processImageForOCR } from '../utils/imageProcessor';
import BarcodeScanner from './BarcodeScanner';
import { FaCamera, FaSpinner, FaArrowLeft, FaCheck, FaBarcode, FaMagic, FaImages } from 'react-icons/fa';

interface AddItemProps {
  onBack: () => void;
  initialType?: 'grocery' | 'medicine';
}

const AddItem: React.FC<AddItemProps> = ({ onBack, initialType = 'grocery' }) => {
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState<'smart' | 'multi'>('smart');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Multi-scan states
  const [frontImagePreview, setFrontImagePreview] = useState<string | null>(null);

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
    reminderOption: 'none',
    medicineTiming: 'any'
  });

  // Smart Scan: One image for everything (back of product usually)
  const handleSmartScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show initial blur preview immediately
    const previewReader = new FileReader();
    previewReader.onloadend = () => setImagePreview(previewReader.result as string);
    previewReader.readAsDataURL(file);

    setLoading(true);
    try {
      // 1. Process image for OCR (cleans, crops, gray-scales, contrasts)
      const { processedFile, dataUrl } = await processImageForOCR(file);
      setImagePreview(dataUrl); // Show the cleaned image to user

      // 2. Try to find barcode in the original image (barcode scanners prefer color/unaltered)
      const decodedBarcode = await extractBarcodeFromImage(file);
      let productName = formData.name;
      let barcodeVal = formData.barcode;

      if (decodedBarcode) {
         barcodeVal = decodedBarcode;
         const product = await lookupBarcode(decodedBarcode);
         if (product) productName = product.name;
      }

      // 3. OCR for dates, mrp, batch, ingredients on CLEANED image
      const extractedData = await processImageWithOCR(processedFile);

      setFormData(prev => ({
        ...prev,
        name: productName || extractedData.name || prev.name,
        barcode: barcodeVal || prev.barcode,
        price: extractedData.price || prev.price,
        mfgDate: extractedData.mfgDate || prev.mfgDate,
        expiryDate: extractedData.expiryDate || prev.expiryDate,
        batchNo: extractedData.batchNo || prev.batchNo,
        components: extractedData.components || prev.components
      }));
    } catch (error) {
      console.error("Smart Scan failed", error);
      alert("Failed to extract full details. Please check form manually.");
    } finally {
      setLoading(false);
    }
  };

  // Multi-Scan: Dedicated front image
  const handleFrontImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFrontImagePreview(reader.result as string);
      if (!imagePreview) setImagePreview(reader.result as string); // fallback main image
    };
    reader.readAsDataURL(file);
  };

  // Multi-Scan: Dedicated details image (Dates, MRP)
  const handleDetailsImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
       // Clean image offline first
       const { processedFile } = await processImageForOCR(file);
       const extractedData = await processImageWithOCR(processedFile);
       setFormData(prev => ({
         ...prev,
         price: extractedData.price || prev.price,
         mfgDate: extractedData.mfgDate || prev.mfgDate,
         expiryDate: extractedData.expiryDate || prev.expiryDate,
         batchNo: extractedData.batchNo || prev.batchNo,
         components: extractedData.components || prev.components
       }));
    } catch (error) {
       console.error("Details OCR failed", error);
    } finally {
       setLoading(false);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setShowScanner(false);
    setLoading(true);
    try {
      const product = await lookupBarcode(barcode);
      if (product) {
        setFormData(prev => ({
          ...prev,
          name: product.name,
          type: product.type
        }));
        if (product.image_url) {
           setImagePreview(product.image_url);
        }
      } else {
         setFormData(prev => ({ ...prev, name: barcode }));
         alert("Product not found in public database. Barcode copied to name.");
      }
    } catch (error) {
       console.error(error);
    } finally {
       setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Please enter a product name.");
      return;
    }

    try {
      await db.items.add({
        ...formData,
        image: imagePreview || undefined
      });
      onBack();
    } catch (error) {
      console.error("Error saving item", error);
      alert("Failed to save item.");
    }
  };

  return (
    <div className="min-h-full bg-[#F8F9FE] flex flex-col pb-[120px] md:pb-12 selection:bg-indigo-300 relative w-full h-full overflow-y-auto">
      {/* Dynamic Header */}
      <header className="bg-white/80 backdrop-blur-2xl px-6 md:px-10 pt-safe py-4 shadow-[0_4px_30px_rgb(0,0,0,0.02)] border-b border-white flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4 mt-2 sm:mt-6">
           <button onClick={onBack} className="w-12 h-12 -ml-3 rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 active:scale-95 transition-all md:hidden">
             <FaArrowLeft size={18} />
           </button>
           <h2 className="text-2xl md:text-3xl font-extrabold text-[#1a1b41] tracking-tight">Add Item</h2>
        </div>
        <button onClick={handleSubmit} disabled={loading} className="hidden md:flex items-center gap-2 mt-2 sm:mt-6 rounded-2xl px-6 py-3 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50">
           <FaCheck size={16} /> Save Item
        </button>
        <button onClick={handleSubmit} disabled={loading} className="md:hidden w-12 h-12 mt-2 sm:mt-6 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50">
           <FaCheck size={16} />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="px-6 md:px-10 py-8 md:py-12 flex-1 mt-2 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

        {/* Scanning Options */}
        <div className="col-span-1 space-y-4 flex flex-col">

          {/* Scanner Mode Toggle */}
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-full">
            <button
              type="button"
              onClick={() => setScanMode('smart')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${scanMode === 'smart' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
               <FaMagic /> Smart Scan
            </button>
            <button
              type="button"
              onClick={() => setScanMode('multi')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${scanMode === 'multi' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
               <FaImages /> Multi-Scan
            </button>
          </div>

          {scanMode === 'smart' ? (
             /* Smart Scan Main Image Upload Card */
            <div className="relative flex-1 group overflow-hidden bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center justify-center min-h-[300px] md:min-h-[400px] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleSmartScan}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full absolute inset-0 object-cover z-0" />
                ) : (
                  <div className="text-center z-0 flex flex-col items-center py-10 px-4">
                    <div className="w-20 h-20 bg-indigo-50 rounded-[28px] flex items-center justify-center mb-5 rotate-3 group-hover:rotate-6 transition-transform relative">
                       <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow-md animate-pulse">AI</div>
                       <FaCamera className="text-3xl text-indigo-500" />
                    </div>
                    <p className="text-slate-800 font-extrabold text-xl tracking-tight mb-2">Back of Product</p>
                    <p className="text-[11px] text-slate-500 font-bold max-w-[220px] leading-relaxed">Take one clear photo of the back. We'll find the barcode, expiry, batch, and ingredients automatically.</p>
                  </div>
                )}

                {loading && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center z-20">
                     <FaSpinner className="animate-spin text-4xl text-indigo-600 mb-4" />
                     <span className="text-indigo-800 font-extrabold tracking-widest text-[10px] uppercase animate-pulse">Running AI Scanners</span>
                  </div>
                )}
            </div>
          ) : (
            /* Multi-Scan Options */
            <div className="flex-1 flex flex-col gap-4">
               {/* Front Image */}
               <div className="relative h-40 group overflow-hidden bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center justify-center cursor-pointer">
                  <input type="file" accept="image/*" capture="environment" onChange={handleFrontImage} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  {frontImagePreview ? (
                    <img src={frontImagePreview} className="w-full h-full object-cover" alt="Front" />
                  ) : (
                    <div className="text-center flex flex-col items-center">
                      <FaCamera className="text-slate-400 mb-2 text-xl" />
                      <p className="text-slate-600 font-bold text-sm">Product Front Image</p>
                    </div>
                  )}
               </div>

               {/* Details Image */}
               <div className="relative h-40 group overflow-hidden bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center justify-center cursor-pointer">
                  <input type="file" accept="image/*" capture="environment" onChange={handleDetailsImage} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="text-center flex flex-col items-center z-0 px-4">
                    <FaMagic className="text-indigo-400 mb-2 text-xl" />
                    <p className="text-slate-600 font-bold text-sm">Scan Details Label (OCR)</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Get Expiry, MRP, Batch</p>
                  </div>
                  {loading && <div className="absolute inset-0 bg-white/80 backdrop-blur flex items-center justify-center z-20"><FaSpinner className="animate-spin text-indigo-500 text-2xl" /></div>}
               </div>

               {/* Live Barcode Scanner */}
               <button
                 type="button"
                 onClick={() => setShowScanner(true)}
                 className="h-16 bg-white border border-slate-200 rounded-[24px] shadow-sm flex items-center justify-center gap-3 font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
               >
                 <FaBarcode size={22} />
                 <span>Live Barcode Scanner</span>
               </button>
            </div>
          )}

        </div>

        <div className="space-y-8 col-span-1">

          <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6">

            {/* Barcode hidden field but displayed if filled */}
            {formData.barcode && (
               <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Barcode</span>
                  <span className="font-mono text-sm font-bold text-slate-700">{formData.barcode}</span>
               </div>
            )}

            <div className="relative">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">Product Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-slate-50/50 rounded-2xl px-5 py-4 text-slate-800 font-bold text-lg focus:outline-none focus:bg-indigo-50/30 focus:ring-2 focus:ring-indigo-100 transition-all border border-slate-100"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="relative">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">Type</label>
               <select
                 name="type"
                 value={formData.type}
                 onChange={handleChange}
                 className="w-full bg-slate-50/50 rounded-2xl px-5 py-4 text-slate-800 font-bold text-base focus:outline-none focus:bg-indigo-50/30 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none border border-slate-100"
               >
                 <option value="grocery">Grocery</option>
                 <option value="medicine">Medicine</option>
               </select>
             </div>

             <div className="relative">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">Price</label>
               <div className="flex items-center bg-slate-50/50 rounded-2xl px-5 py-4 focus-within:bg-indigo-50/30 focus-within:ring-2 focus-within:ring-indigo-100 transition-all border border-slate-100">
                  <span className="text-slate-400 font-extrabold text-base mr-2">₹</span>
                  <input
                    type="text"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full bg-transparent text-slate-800 font-bold text-base focus:outline-none"
                  />
               </div>
             </div>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6">
          <div className="relative">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">Purchase Date</label>
            <input
              type="date"
              name="purchaseDate"
              value={formData.purchaseDate}
              onChange={handleChange}
              className="w-full bg-slate-50/50 rounded-2xl px-5 py-4 text-slate-800 font-bold text-base focus:outline-none focus:bg-indigo-50/30 focus:ring-2 focus:ring-indigo-100 transition-all border border-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="relative">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">Mfg Date</label>
               <input
                 type="date"
                 name="mfgDate"
                 value={formData.mfgDate}
                 onChange={handleChange}
                 className="w-full bg-slate-50/50 rounded-2xl px-5 py-4 text-slate-800 font-bold text-[13px] sm:text-base focus:outline-none focus:bg-indigo-50/30 focus:ring-2 focus:ring-indigo-100 transition-all border border-slate-100"
               />
             </div>

             <div className="relative">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">Expiry</label>
               <input
                 type="date"
                 name="expiryDate"
                 value={formData.expiryDate}
                 onChange={handleChange}
                 className="w-full bg-slate-50/50 rounded-2xl px-5 py-4 text-slate-800 font-bold text-[13px] sm:text-base focus:outline-none focus:bg-indigo-50/30 focus:ring-2 focus:ring-indigo-100 transition-all border border-slate-100"
               />
               </div>
            </div>

            <div className="relative">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">Batch No</label>
               <input
                 type="text"
                 name="batchNo"
                 value={formData.batchNo || ''}
                 onChange={handleChange}
                 placeholder="e.g. ABC1234"
                 className="w-full bg-slate-50/50 rounded-2xl px-5 py-4 text-slate-800 font-bold text-base focus:outline-none focus:bg-indigo-50/30 focus:ring-2 focus:ring-indigo-100 transition-all border border-slate-100"
               />
            </div>

          </div>

          {formData.type === 'medicine' && (
            <div className="space-y-8">
              <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-4">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 pl-1">Composition / Ingredients</label>
                 <textarea
                   name="components"
                   value={formData.components || ''}
                   onChange={handleChange as any}
                   rows={3}
                   placeholder="e.g. Paracetamol 500mg"
                   className="w-full bg-slate-50/50 rounded-2xl px-5 py-4 text-slate-700 font-medium text-sm focus:outline-none focus:bg-indigo-50/30 focus:ring-2 focus:ring-indigo-100 transition-all border border-slate-100 resize-none"
                 />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-[32px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-rose-100/50 relative overflow-hidden col-span-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-40 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                    <label className="text-[10px] font-extrabold text-rose-800 flex items-center gap-2 uppercase tracking-widest relative z-10 mb-3">
                       <span className="text-[14px]">🔔</span> Remind
                    </label>
                    <select
                      name="reminderOption"
                      value={formData.reminderOption}
                      onChange={handleChange}
                      className="w-full bg-white/80 backdrop-blur-sm border border-rose-200/50 rounded-2xl px-4 py-3 text-rose-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 shadow-sm appearance-none relative z-10"
                    >
                      <option value="none">Off</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                 </div>

                 <div className="bg-indigo-50/50 rounded-[32px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-indigo-100/50 relative overflow-hidden col-span-1">
                    <label className="text-[10px] font-extrabold text-indigo-800 flex items-center gap-2 uppercase tracking-widest relative z-10 mb-3">
                       <span className="text-[14px]">🍽️</span> Timing
                    </label>
                    <select
                      name="medicineTiming"
                      value={formData.medicineTiming}
                      onChange={handleChange}
                      className="w-full bg-white/80 backdrop-blur-sm border border-indigo-200/50 rounded-2xl px-4 py-3 text-indigo-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 shadow-sm appearance-none relative z-10"
                    >
                      <option value="any">Anytime</option>
                      <option value="before_food">Before Food</option>
                      <option value="after_food">After Food</option>
                    </select>
                 </div>
              </div>
            </div>
          )}
        </div>

      </form>

      {showScanner && (
        <BarcodeScanner
          onResult={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default AddItem;
