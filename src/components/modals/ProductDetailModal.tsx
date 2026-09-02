import React, { useState, useMemo } from 'react';
import {
  InventoryItem,
  getItemStock,
  isItemLowQuantity,
  markItemUsedToday,
  undoItemUsedToday,
  adjustItemStock,
  getTodayDateString
} from '../../db';
import {
  FaTimes,
  FaRegCalendarAlt,
  FaBarcode,
  FaTrash,
  FaPills,
  FaBox,
  FaSearchPlus,
  FaCheck,
  FaCopy,
  FaPlus,
  FaMinus,
  FaExclamationCircle,
  FaHistory,
  FaEdit
} from 'react-icons/fa';
import { format, differenceInDays } from 'date-fns';

interface ProductDetailModalProps {
  item: InventoryItem | null;
  onClose: () => void;
  onDelete?: (id: number) => void;
  onEdit?: (item: InventoryItem) => void;
  onItemUpdated?: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ item, onClose, onDelete, onEdit, onItemUpdated }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [justLogged, setJustLogged] = useState(false);
  const todayStr = useMemo(() => getTodayDateString(), []);

  if (!item) return null;

  const isMedicine = item.type === 'medicine';
  const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
  const daysLeft = expiryDate ? differenceInDays(expiryDate, new Date()) : null;
  const stock = getItemStock(item);
  const isLow = isItemLowQuantity(item);
  const isUsedToday = item.lastUsedDate === todayStr && (item.usedTodayCount || 0) > 0;

  const copyText = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleUseToday = async () => {
    if (!item.id) return;
    await markItemUsedToday(item.id);
    setJustLogged(true);
    if (onItemUpdated) onItemUpdated();
    setTimeout(() => setJustLogged(false), 2000);
  };

  const handleUndoUsed = async () => {
    if (!item.id) return;
    await undoItemUsedToday(item.id);
    if (onItemUpdated) onItemUpdated();
  };

  const handleAdjustStock = async (delta: number) => {
    if (!item.id) return;
    await adjustItemStock(item.id, delta);
    if (onItemUpdated) onItemUpdated();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden my-6 relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${isMedicine ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
              {isMedicine ? <FaPills size={18} /> : <FaBox size={18} />}
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{item.type}</span>
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight leading-snug line-clamp-1">{item.name}</h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(item);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-all active:scale-95 border border-indigo-100"
                title="Edit this product"
              >
                <FaEdit size={12} />
                <span>Edit</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              aria-label="Close"
            >
              <FaTimes size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Front of Product Image (Readable Quality) */}
          {item.image ? (
            <div className="relative group rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner flex items-center justify-center">
              <img
                src={item.image}
                alt={item.name}
                className={`w-full transition-transform duration-300 object-contain max-h-72 cursor-zoom-in ${isZoomed ? 'scale-150 cursor-zoom-out' : ''}`}
                onClick={() => setIsZoomed(!isZoomed)}
              />
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 shadow-md flex items-center gap-1.5 hover:bg-white"
              >
                <FaSearchPlus size={12} />
                <span>{isZoomed ? 'Zoom Out' : 'Inspect Quality'}</span>
              </button>
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                Front Photo
              </div>
            </div>
          ) : (
            <div className="h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
              <FaBox size={24} className="mb-2 opacity-50" />
              <span className="text-xs font-semibold">No product photo uploaded</span>
            </div>
          )}

          {/* Expiry Status Badge */}
          {item.expiryDate && (
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${daysLeft !== null && daysLeft < 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : daysLeft !== null && daysLeft <= 7 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
              <div className="flex items-center gap-3">
                <FaRegCalendarAlt size={20} />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block">Expiry Date</span>
                  <span className="font-extrabold text-base">{format(new Date(item.expiryDate), 'MMM dd, yyyy')}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/80 backdrop-blur-sm shadow-sm uppercase tracking-wider">
                  {daysLeft !== null && daysLeft < 0 ? `Expired (${Math.abs(daysLeft)}d ago)` : daysLeft === 0 ? 'Expires Today' : `${daysLeft} days left`}
                </span>
              </div>
            </div>
          )}

          {/* Quantity & Used Today Interactive Controls */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Inventory Stock</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-extrabold text-slate-800 text-lg">{stock} in stock</span>
                  {stock <= 0 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <FaExclamationCircle size={9} /> Out of Stock
                    </span>
                  ) : isLow ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <FaExclamationCircle size={9} /> Low Quantity
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-200 shadow-xs">
                <button
                  onClick={() => handleAdjustStock(-1)}
                  disabled={stock <= 0}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 active:scale-95 transition-all"
                  title="Decrease stock"
                >
                  <FaMinus size={11} />
                </button>
                <span className="font-mono font-bold text-sm px-2 text-slate-800 min-w-[28px] text-center">{stock}</span>
                <button
                  onClick={() => handleAdjustStock(1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                  title="Increase / Restock"
                >
                  <FaPlus size={11} />
                </button>
              </div>
            </div>

            {/* Used Today Row */}
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Today's Consumption</span>
                <span className="text-xs font-bold text-slate-700">
                  {isUsedToday
                    ? `Used ${item.usedTodayCount}x today (logged ${item.lastUsedTime || 'today'})`
                    : 'Not consumed yet today'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isUsedToday && (
                  <button
                    onClick={handleUndoUsed}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1"
                  >
                    <FaHistory size={10} /> Undo
                  </button>
                )}
                <button
                  onClick={handleUseToday}
                  disabled={stock <= 0}
                  className={`text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shadow-xs ${
                    justLogged
                      ? 'bg-emerald-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:pointer-events-none'
                  }`}
                >
                  <FaCheck size={11} />
                  <span>{justLogged ? 'Logged!' : isUsedToday ? '+ Log Another Dose/Use' : 'Log Used Today'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Key Specifications Grid (Batch No, Mfg, Price, Barcode) */}
          <div className="grid grid-cols-2 gap-3">
            {item.batchNo && (
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Batch No.</span>
                  <button
                    onClick={() => copyText(item.batchNo!, 'batch')}
                    className="text-indigo-400 hover:text-indigo-600 text-xs"
                    title="Copy Batch Number"
                  >
                    {copiedField === 'batch' ? <FaCheck className="text-emerald-500" /> : <FaCopy />}
                  </button>
                </div>
                <div className="font-mono font-bold text-slate-800 text-base break-all">{item.batchNo}</div>
              </div>
            )}

            {item.price && (
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 block mb-1">Price / MRP</span>
                <div className="font-extrabold text-slate-800 text-base">₹{item.price}</div>
              </div>
            )}

            {item.mfgDate && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Manufacturing Date (Mfg)</span>
                <div className="font-bold text-slate-700 text-sm">{format(new Date(item.mfgDate), 'MMM dd, yyyy')}</div>
              </div>
            )}

            {item.purchaseDate && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Purchased</span>
                <div className="font-bold text-slate-700 text-sm">{format(new Date(item.purchaseDate), 'MMM dd, yyyy')}</div>
              </div>
            )}
          </div>

          {/* Details & Volume */}
          {item.details && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Volume / Quantity / Details</span>
              <p className="font-bold text-slate-800 text-sm">{item.details}</p>
            </div>
          )}

          {/* Ingredients / Composition */}
          {item.components && (
            <div className="bg-rose-50/40 border border-rose-100/60 rounded-2xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500 block mb-1">Active Ingredients / Composition</span>
              <p className="font-medium text-slate-700 text-xs leading-relaxed">{item.components}</p>
            </div>
          )}

          {/* Barcode */}
          {item.barcode && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaBarcode className="text-slate-400 text-xl" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Barcode</span>
                  <span className="font-mono text-sm font-bold text-slate-700">{item.barcode}</span>
                </div>
              </div>
              <button
                onClick={() => copyText(item.barcode!, 'barcode')}
                className="text-slate-400 hover:text-slate-700 text-xs p-2"
                title="Copy Barcode"
              >
                {copiedField === 'barcode' ? <FaCheck className="text-emerald-500" /> : <FaCopy />}
              </button>
            </div>
          )}

          {/* Description */}
          {item.description && (
            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Notes / Description</span>
              <p className="text-sm text-slate-600 font-medium">{item.description}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          {item.id && onDelete ? (
            <button
              onClick={() => {
                if (window.confirm(`Delete ${item.name}?`)) {
                  onDelete(item.id!);
                  onClose();
                }
              }}
              className="flex items-center gap-2 text-rose-600 hover:text-rose-700 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-rose-50 transition-colors"
            >
              <FaTrash size={14} /> Delete Product
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(item);
                }}
                className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors active:scale-95 text-sm flex items-center gap-1.5 border border-indigo-200"
              >
                <FaEdit size={13} /> Edit Item
              </button>
            )}

            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors active:scale-95 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
