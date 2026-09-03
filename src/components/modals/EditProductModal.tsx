import React, { useState, useEffect } from 'react';
import { db, InventoryItem } from '../../db';
import {
  FaTimes,
  FaPills,
  FaBox,
  FaCheck,
  FaCalendarAlt,
  FaBarcode,
  FaTag,
  FaFlask,
  FaClock,
  FaLayerGroup,
  FaExclamationTriangle,
  FaTrash
} from 'react-icons/fa';
import { differenceInDays } from 'date-fns';

interface EditProductModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onItemUpdated?: (updatedItem: InventoryItem) => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  item,
  isOpen,
  onClose,
  onItemUpdated
}) => {
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        type: item.type || 'grocery',
        price: item.price || '',
        quantity: item.quantity !== undefined ? item.quantity : item.totalQuantity || 1,
        lowQuantityThreshold: item.lowQuantityThreshold !== undefined ? item.lowQuantityThreshold : 2,
        mfgDate: item.mfgDate || '',
        expiryDate: item.expiryDate || '',
        batchNo: item.batchNo || '',
        barcode: item.barcode || '',
        components: item.components || '',
        medicineTiming: item.medicineTiming || 'any',
        dailyDose: item.dailyDose !== undefined ? item.dailyDose : 1,
        doseUnit: item.doseUnit || 'tablets',
        doseFrequency: item.doseFrequency || 'Once Daily (1-0-0)',
        doseInstructions: item.doseInstructions || '',
        details: item.details || '',
        description: item.description || '',
        reminderOption: item.reminderOption || 'none',
        image: item.image || ''
      });
      setErrorMsg(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.id) return;
    if (!formData.name?.trim()) {
      setErrorMsg('Product name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const updatedFields: Partial<InventoryItem> = {
        name: formData.name.trim(),
        type: formData.type || 'grocery',
        price: formData.price ? formData.price.trim() : '',
        quantity: Number(formData.quantity) >= 0 ? Number(formData.quantity) : 0,
        lowQuantityThreshold: Number(formData.lowQuantityThreshold) >= 0 ? Number(formData.lowQuantityThreshold) : 2,
        mfgDate: formData.mfgDate || '',
        expiryDate: formData.expiryDate || '',
        batchNo: formData.batchNo ? formData.batchNo.trim() : '',
        barcode: formData.barcode ? formData.barcode.trim() : '',
        components: formData.components ? formData.components.trim() : '',
        details: formData.details ? formData.details.trim() : '',
        description: formData.description ? formData.description.trim() : '',
        reminderOption: formData.reminderOption || 'none',
        image: formData.image || ''
      };

      if (formData.type === 'medicine') {
        updatedFields.medicineTiming = formData.medicineTiming || 'any';
        updatedFields.dailyDose = Number(formData.dailyDose) >= 0 ? Number(formData.dailyDose) : 1;
        updatedFields.doseUnit = formData.doseUnit || 'tablets';
        updatedFields.doseFrequency = formData.doseFrequency || 'Once Daily (1-0-0)';
        updatedFields.doseInstructions = formData.doseInstructions ? formData.doseInstructions.trim() : '';
      }

      await db.items.update(item.id, updatedFields);
      const updatedItem: InventoryItem = { ...item, ...updatedFields };

      if (onItemUpdated) {
        onItemUpdated(updatedItem);
      }
      onClose();
    } catch (err: unknown) {
      console.error('Failed to update product item:', err);
      setErrorMsg('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const daysToExpiry = formData.expiryDate
    ? differenceInDays(new Date(formData.expiryDate), new Date())
    : null;

  return (
    <div
      id="edit-product-modal-backdrop"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="edit-product-modal-container"
        className="bg-white rounded-[32px] w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden my-6 relative max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                formData.type === 'medicine' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'
              }`}
            >
              {formData.type === 'medicine' ? <FaPills size={18} /> : <FaBox size={18} />}
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Edit Product
              </span>
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight leading-snug line-clamp-1">
                {formData.name || 'Untitled Item'}
              </h2>
            </div>
          </div>

          <button
            id="edit-modal-close-btn"
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 active:scale-95 transition-all"
            aria-label="Close modal"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
              <FaExclamationTriangle className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product Type Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'grocery' }))}
                className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                  formData.type === 'grocery'
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <FaBox size={14} /> Grocery / Household
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'medicine' }))}
                className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                  formData.type === 'medicine'
                    ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <FaPills size={14} /> Medicine / Pharmacy
              </button>
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label
              htmlFor="edit-product-name"
              className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5"
            >
              Product Name *
            </label>
            <input
              id="edit-product-name"
              type="text"
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              placeholder="e.g. Dolo 650 or Organic Milk"
              required
              className="w-full bg-slate-50 rounded-2xl px-4 py-3.5 text-slate-800 font-bold text-base focus:outline-none focus:bg-indigo-50/50 focus:ring-2 focus:ring-indigo-300 border border-slate-200 transition-all"
            />
          </div>

          {/* Price, Stock & Low Threshold */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="edit-product-price"
                className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5"
              >
                Price (₹)
              </label>
              <input
                id="edit-product-price"
                type="text"
                name="price"
                value={formData.price || ''}
                onChange={handleChange}
                placeholder="₹ 150"
                className="w-full bg-slate-50 rounded-2xl px-3 py-3 text-slate-800 font-semibold text-sm focus:outline-none focus:bg-indigo-50/50 focus:ring-2 focus:ring-indigo-300 border border-slate-200 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="edit-product-qty"
                className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5"
              >
                Stock Qty
              </label>
              <input
                id="edit-product-qty"
                type="number"
                name="quantity"
                min="0"
                value={formData.quantity !== undefined ? formData.quantity : ''}
                onChange={handleChange}
                className="w-full bg-slate-50 rounded-2xl px-3 py-3 text-slate-800 font-bold text-sm focus:outline-none focus:bg-indigo-50/50 focus:ring-2 focus:ring-indigo-300 border border-slate-200 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="edit-product-threshold"
                className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5"
                title="Alert when stock falls to or below this amount"
              >
                Low Alert ≤
              </label>
              <input
                id="edit-product-threshold"
                type="number"
                name="lowQuantityThreshold"
                min="0"
                value={formData.lowQuantityThreshold !== undefined ? formData.lowQuantityThreshold : ''}
                onChange={handleChange}
                className="w-full bg-slate-50 rounded-2xl px-3 py-3 text-slate-800 font-semibold text-sm focus:outline-none focus:bg-indigo-50/50 focus:ring-2 focus:ring-indigo-300 border border-slate-200 transition-all"
              />
            </div>
          </div>

          {/* Dates: Mfg & Expiry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="edit-product-mfg"
                className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5"
              >
                Mfg Date
              </label>
              <input
                id="edit-product-mfg"
                type="date"
                name="mfgDate"
                value={formData.mfgDate || ''}
                onChange={handleChange}
                className="w-full bg-slate-50 rounded-2xl px-3 py-3 text-slate-800 font-medium text-sm focus:outline-none focus:bg-indigo-50/50 focus:ring-2 focus:ring-indigo-300 border border-slate-200 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="edit-product-exp"
                className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between"
              >
                <span>Expiry Date</span>
                {daysToExpiry !== null && (
                  <span
                    className={`text-[10px] font-extrabold normal-case px-2 py-0.5 rounded-full ${
                      daysToExpiry < 0
                        ? 'bg-rose-100 text-rose-700'
                        : daysToExpiry <= 7
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {daysToExpiry < 0
                      ? `${Math.abs(daysToExpiry)}d expired`
                      : daysToExpiry === 0
                      ? 'Today'
                      : `${daysToExpiry}d left`}
                  </span>
                )}
              </label>
              <input
                id="edit-product-exp"
                type="date"
                name="expiryDate"
                value={formData.expiryDate || ''}
                onChange={handleChange}
                className="w-full bg-slate-50 rounded-2xl px-3 py-3 text-slate-800 font-bold text-sm focus:outline-none focus:bg-indigo-50/50 focus:ring-2 focus:ring-indigo-300 border border-slate-200 transition-all"
              />
            </div>
          </div>

          {/* Batch Number & Barcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="edit-product-batch"
                className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5"
              >
                Batch Number
              </label>
              <input
                id="edit-product-batch"
                type="text"
                name="batchNo"
                value={formData.batchNo || ''}
                onChange={handleChange}
                placeholder="e.g. BATCH-9921"
                className="w-full bg-slate-50 rounded-2xl px-3 py-3 text-slate-800 font-mono text-sm focus:outline-none focus:bg-indigo-50/50 focus:ring-2 focus:ring-indigo-300 border border-slate-200 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="edit-product-barcode"
                className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5"
              >
                Barcode / EAN
              </label>
              <input
                id="edit-product-barcode"
                type="text"
                name="barcode"
                value={formData.barcode || ''}
                onChange={handleChange}
                placeholder="e.g. 8901234567890"
                className="w-full bg-slate-50 rounded-2xl px-3 py-3 text-slate-800 font-mono text-sm focus:outline-none focus:bg-indigo-50/50 focus:ring-2 focus:ring-indigo-300 border border-slate-200 transition-all"
              />
            </div>
          </div>

          {/* Medicine Specific Settings */}
          {formData.type === 'medicine' && (
            <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                <FaPills size={13} />
                <span>Medication Schedule & Formulation</span>
              </div>

              <div>
                <label
                  htmlFor="edit-product-components"
                  className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1"
                >
                  Active Ingredients / Salt
                </label>
                <input
                  id="edit-product-components"
                  type="text"
                  name="components"
                  value={formData.components || ''}
                  onChange={handleChange}
                  placeholder="e.g. Paracetamol IP 650mg"
                  className="w-full bg-white rounded-xl px-3 py-2.5 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-300 border border-rose-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="edit-daily-dose"
                    className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1"
                  >
                    Dose Amount
                  </label>
                  <input
                    id="edit-daily-dose"
                    type="number"
                    name="dailyDose"
                    min="0"
                    step="0.5"
                    value={formData.dailyDose !== undefined ? formData.dailyDose : 1}
                    onChange={handleChange}
                    className="w-full bg-white rounded-xl px-3 py-2.5 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-300 border border-rose-200"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-dose-unit"
                    className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1"
                  >
                    Dose Unit
                  </label>
                  <select
                    id="edit-dose-unit"
                    name="doseUnit"
                    value={formData.doseUnit || 'tablets'}
                    onChange={handleChange}
                    className="w-full bg-white rounded-xl px-3 py-2.5 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-300 border border-rose-200"
                  >
                    {['tablets', 'capsules', 'ml', 'drops', 'puffs', 'sachets', 'teaspoon', 'mg'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="edit-medicine-timing"
                    className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1"
                  >
                    Meal Timing
                  </label>
                  <select
                    id="edit-medicine-timing"
                    name="medicineTiming"
                    value={formData.medicineTiming || 'any'}
                    onChange={handleChange}
                    className="w-full bg-white rounded-xl px-3 py-2.5 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-300 border border-rose-200"
                  >
                    <option value="any">Anytime</option>
                    <option value="before_food">Before Food</option>
                    <option value="after_food">After Food</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-dose-frequency"
                    className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1"
                  >
                    Routine / Frequency
                  </label>
                  <select
                    id="edit-dose-frequency"
                    name="doseFrequency"
                    value={formData.doseFrequency || 'Once Daily (1-0-0)'}
                    onChange={handleChange}
                    className="w-full bg-white rounded-xl px-3 py-2.5 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-300 border border-rose-200"
                  >
                    <option value="Once Daily (1-0-0)">Once Daily (1-0-0)</option>
                    <option value="Twice Daily (1-0-1)">Twice Daily (1-0-1)</option>
                    <option value="Thrice Daily (1-1-1)">Thrice Daily (1-1-1)</option>
                    <option value="Four Times Daily">Four Times Daily</option>
                    <option value="Before Bed (0-0-1)">Before Bed (0-0-1)</option>
                    <option value="As Needed (SOS)">As Needed (SOS)</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-dose-instructions"
                  className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1"
                >
                  Doctor's Instructions & Notes
                </label>
                <input
                  id="edit-dose-instructions"
                  type="text"
                  name="doseInstructions"
                  value={formData.doseInstructions || ''}
                  onChange={handleChange}
                  placeholder="e.g. Take with warm water after dinner"
                  className="w-full bg-white rounded-xl px-3 py-2.5 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-300 border border-rose-200"
                />
              </div>
            </div>
          )}

          {/* Details / Package Notes */}
          <div>
            <label
              htmlFor="edit-product-details"
              className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5"
            >
              Packaging Details & Storage Notes
            </label>
            <textarea
              id="edit-product-details"
              name="details"
              rows={2}
              value={formData.details || ''}
              onChange={handleChange}
              placeholder="e.g. Store in a cool dry place away from direct sunlight."
              className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-slate-800 text-xs font-medium focus:outline-none focus:bg-indigo-50/50 focus:ring-2 focus:ring-indigo-300 border border-slate-200 transition-all resize-none"
            />
          </div>

          {/* Photo Management */}
          {formData.image && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={formData.image}
                  alt="Current item photo"
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">Attached Photo</p>
                  <p className="text-[10px] text-slate-400">Stored in local offline database</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                className="px-3 py-1.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Remove photo"
              >
                <FaTrash size={10} /> Remove Photo
              </button>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-3 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 rounded-2xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <FaCheck size={12} />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
