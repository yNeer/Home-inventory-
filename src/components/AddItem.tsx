import React, { useState } from 'react';
import { db, InventoryItem } from '../db';
import { processImageWithOCR } from '../utils/ocr';
import { FaCamera, FaSpinner, FaArrowLeft, FaCheck } from 'react-icons/fa';

interface AddItemProps {
  onBack: () => void;
}

const AddItem: React.FC<AddItemProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    type: 'grocery',
    price: '',
    mfgDate: '',
    expiryDate: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    reminderOption: 'none'
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setLoading(true);
    try {
      const extractedData = await processImageWithOCR(file);
      setFormData(prev => ({
        ...prev,
        price: extractedData.price || prev.price,
        mfgDate: extractedData.mfgDate || prev.mfgDate,
        expiryDate: extractedData.expiryDate || prev.expiryDate,
      }));
    } catch (error) {
      console.error("Failed to process image", error);
      alert("Could not extract details from image automatically. Please fill them in manually.");
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

        {/* Soft UI Image Upload Card */}
        <div className="relative group overflow-hidden bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center justify-center min-h-[220px] md:min-h-[400px] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all cursor-pointer col-span-1">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              required={!imagePreview}
            />
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full absolute inset-0 object-cover z-0" />
            ) : (
              <div className="text-center z-0 flex flex-col items-center py-10">
                <div className="w-20 h-20 bg-indigo-50 rounded-[28px] flex items-center justify-center mb-5 rotate-3 group-hover:rotate-6 transition-transform relative">
                   <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow-md animate-pulse">OCR</div>
                   <FaCamera className="text-3xl text-indigo-500" />
                </div>
                <p className="text-slate-800 font-extrabold text-xl tracking-tight">Scan Medicine / Grocery</p>
                <p className="text-[11px] text-slate-400 mt-2 font-bold uppercase tracking-widest max-w-[200px] leading-relaxed">Auto-fill expiry, price & dates from image</p>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center z-20">
                 <FaSpinner className="animate-spin text-4xl text-indigo-600 mb-4" />
                 <span className="text-indigo-800 font-extrabold tracking-widest text-[10px] uppercase animate-pulse">Analyzing Image</span>
              </div>
            )}
        </div>

        <div className="space-y-8 col-span-1">
          {/* Inputs section */}
          <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6">
          </div>

          <div className="bg-white rounded-[32px] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6">
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
          </div>

          {formData.type === 'medicine' && (
            <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-[32px] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-rose-100/50 space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-40 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <label className="text-[11px] font-extrabold text-rose-800 flex items-center gap-2 uppercase tracking-widest relative z-10">
               <span className="text-[14px]">🔔</span> Reminder
            </label>
            <select
              name="reminderOption"
              value={formData.reminderOption}
              onChange={handleChange}
              className="w-full bg-white/80 backdrop-blur-sm border border-rose-200/50 rounded-2xl px-5 py-4 text-rose-900 font-bold text-base focus:outline-none focus:ring-2 focus:ring-rose-200 shadow-sm appearance-none relative z-10"
            >
              <option value="none">Off</option>
              <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}
        </div>

      </form>
    </div>
  );
};

export default AddItem;
