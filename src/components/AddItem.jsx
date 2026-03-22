import React, { useState } from 'react';
import { db } from '../db';
import { processImageWithOCR } from '../utils/ocr';
import GlassContainer from './GlassContainer';
import { FaCamera, FaSpinner, FaArrowLeft, FaCheck } from 'react-icons/fa';

const AddItem = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'grocery',
    price: '',
    mfgDate: '',
    expiryDate: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    reminderOption: 'none'
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Please enter a product name.");
      return;
    }

    try {
      await db.items.add({
        ...formData,
        image: imagePreview
      });
      onBack();
    } catch (error) {
      console.error("Error saving item", error);
      alert("Failed to save item.");
    }
  };

  return (
    <GlassContainer className="max-w-2xl">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="text-gray-600 hover:text-indigo-600 mr-4 transition-colors p-2 rounded-full hover:bg-white/50">
          <FaArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Add New Item</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Image Upload Section */}
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-indigo-300/50 rounded-2xl bg-white/20 hover:bg-white/30 transition-colors cursor-pointer group relative overflow-hidden">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              required={!imagePreview}
            />
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="h-48 object-contain rounded-lg shadow-md z-0" />
            ) : (
              <div className="text-center z-0 flex flex-col items-center">
                <FaCamera className="text-4xl text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-gray-600 font-medium">Tap to scan product label</p>
                <p className="text-sm text-gray-500 mt-1">We'll try to auto-fill dates & price</p>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                 <FaSpinner className="animate-spin text-3xl text-indigo-600 mb-2" />
                 <span className="text-indigo-800 font-medium animate-pulse">Extracting details...</span>
              </div>
            )}
        </div>

        {/* Form Fields Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 ml-1">Product Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="glass-input"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 ml-1">Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="glass-input appearance-none cursor-pointer"
            >
              <option value="grocery">Grocery</option>
              <option value="medicine">Medicine</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 ml-1">Price (optional)</label>
            <input
              type="text"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="glass-input"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 ml-1">Purchase Date</label>
            <input
              type="date"
              name="purchaseDate"
              value={formData.purchaseDate}
              onChange={handleChange}
              className="glass-input"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 ml-1">Mfg Date</label>
            <input
              type="date"
              name="mfgDate"
              value={formData.mfgDate}
              onChange={handleChange}
              className="glass-input"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 ml-1">Expiry Date</label>
            <input
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
              className="glass-input"
            />
          </div>
        </div>

        {formData.type === 'medicine' && (
          <div className="space-y-1 bg-red-50/50 p-4 rounded-xl border border-red-100/50">
            <label className="text-sm font-semibold text-red-800 ml-1">Medicine Reminder</label>
            <select
              name="reminderOption"
              value={formData.reminderOption}
              onChange={handleChange}
              className="glass-input border-red-200 focus:ring-red-400"
            >
              <option value="none">No reminder</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <p className="text-xs text-red-600 mt-2 ml-1">Get notifications before this medicine expires or when it needs to be taken.</p>
          </div>
        )}

        <div className="pt-4 flex justify-end gap-3">
          <button type="button" onClick={onBack} className="glass-button-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="glass-button flex items-center gap-2">
            <FaCheck />
            <span>Save Item</span>
          </button>
        </div>

      </form>
    </GlassContainer>
  );
};

export default AddItem;
