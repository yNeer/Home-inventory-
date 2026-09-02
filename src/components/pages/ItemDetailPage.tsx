import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  InventoryItem,
  getItemStock,
  isItemLowQuantity,
  markItemUsedToday,
  undoItemUsedToday,
  adjustItemStock,
  getTodayDateString
} from '../../db';
import {
  FaArrowLeft,
  FaPills,
  FaBox,
  FaCalendarAlt,
  FaClock,
  FaBarcode,
  FaCopy,
  FaCheck,
  FaPlus,
  FaMinus,
  FaTrash,
  FaExclamationTriangle,
  FaSearchPlus,
  FaHistory,
  FaTag,
  FaLayerGroup,
  FaFlask,
  FaInfoCircle,
  FaShieldAlt,
  FaBoxes,
  FaEdit
} from 'react-icons/fa';
import { format, differenceInDays, isBefore } from 'date-fns';
import { EditProductModal } from '../modals/EditProductModal';

interface ItemDetailPageProps {
  itemId: number | null;
  fallbackItem?: InventoryItem | null;
  onBack: () => void;
  onItemDeleted?: () => void;
  onEdit?: (item: InventoryItem) => void;
}

export const ItemDetailPage: React.FC<ItemDetailPageProps> = ({
  itemId,
  fallbackItem,
  onBack,
  onItemDeleted,
  onEdit
}) => {
  // Live query ensures any database mutation (stock adjust, log used, etc.) updates instantly
  const liveItem = useLiveQuery(
    async () => {
      if (!itemId) return null;
      return await db.items.get(itemId);
    },
    [itemId]
  );

  const item: InventoryItem | null = liveItem || fallbackItem || null;

  const [isZoomed, setIsZoomed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [justLogged, setJustLogged] = useState(false);
  const todayStr = useMemo(() => getTodayDateString(), []);

  const copyText = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleUseToday = async () => {
    if (!item?.id) return;
    await markItemUsedToday(item.id);
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 2000);
  };

  const handleUndoUsed = async () => {
    if (!item?.id) return;
    await undoItemUsedToday(item.id);
  };

  const handleAdjustStock = async (delta: number) => {
    if (!item?.id) return;
    await adjustItemStock(item.id, delta);
  };

  const handleDelete = async () => {
    if (!item?.id) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!item?.id) return;
    setShowDeleteConfirm(false);
    await db.items.delete(item.id);
    if (onItemDeleted) {
      onItemDeleted();
    } else {
      onBack();
    }
  };

  if (!item) {
    return (
      <div className="min-h-full px-6 py-12 max-w-4xl mx-auto flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
          <FaBox size={24} />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Item Not Found</h2>
        <p className="text-sm text-slate-400 mb-6 max-w-sm">
          This product may have been deleted or the link is no longer valid.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <FaArrowLeft size={14} /> Back to Dashboard
        </button>
      </div>
    );
  }

  const isMedicine = item.type === 'medicine';
  const stock = getItemStock(item);
  const isLow = isItemLowQuantity(item);
  const isUsedToday = item.lastUsedDate === todayStr && (item.usedTodayCount || 0) > 0;

  // Expiration calculation
  const now = new Date();
  const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
  const isExpired = expiryDate ? isBefore(expiryDate, now) : false;
  const daysUntilExpiry = expiryDate ? differenceInDays(expiryDate, now) : null;

  return (
    <div className="min-h-full relative px-4 sm:px-6 md:px-10 lg:px-12 pt-6 pb-32 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-slate-700 font-extrabold text-sm shadow-xs hover:bg-slate-50 hover:text-indigo-600 active:scale-95 transition-all"
        >
          <FaArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (onEdit) {
                onEdit(item);
              } else {
                setIsEditModalOpen(true);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-xs shadow-xs hover:bg-indigo-100 active:scale-95 transition-all cursor-pointer"
            title="Edit Product Details"
          >
            <FaEdit size={12} />
            <span>Edit Item</span>
          </button>

          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-extrabold text-xs shadow-xs hover:bg-rose-100 active:scale-95 transition-all cursor-pointer"
            title="Delete Product"
          >
            <FaTrash size={12} />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Main Page Layout: Two Columns on Desktop, Single on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column: Product Photo & Quick Action Bar (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Product Image Card */}
          <div className="bg-white rounded-[32px] p-4 sm:p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            {item.image ? (
              <div className="relative group rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner flex items-center justify-center min-h-[260px] sm:min-h-[320px]">
                <img
                  src={item.image}
                  alt={item.name}
                  className={`w-full max-h-[380px] object-contain transition-transform duration-300 ${
                    isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
                  }`}
                  onClick={() => setIsZoomed(!isZoomed)}
                />
                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700 shadow-md flex items-center gap-1.5 hover:bg-white active:scale-95 transition-all"
                >
                  <FaSearchPlus size={12} />
                  <span>{isZoomed ? 'Zoom Out' : 'Inspect SD Photo'}</span>
                </button>
                <div className="absolute top-3 left-3 bg-emerald-600/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-extrabold text-white uppercase tracking-wider">
                  ✓ SD Front Photo
                </div>
              </div>
            ) : (
              <div className="h-64 sm:h-72 bg-gradient-to-br from-slate-50 to-indigo-50/30 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 ${isMedicine ? 'bg-rose-100 text-rose-500' : 'bg-indigo-100 text-indigo-500'}`}>
                  {isMedicine ? <FaPills size={28} /> : <FaBoxes size={28} />}
                </div>
                <span className="text-sm font-extrabold text-slate-600 mb-1">No Front Photo</span>
                <span className="text-xs text-slate-400 text-center max-w-xs">
                  Photo was not captured during scan. Details were saved manually.
                </span>
              </div>
            )}
          </div>

          {/* Quick Action Control Deck */}
          <div className="bg-white rounded-[32px] p-5 sm:p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              Quick Inventory Controls
            </h3>

            {/* Daily Usage Button */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">Daily Consumption</span>
                {isUsedToday && (
                  <button
                    onClick={handleUndoUsed}
                    className="text-xs font-extrabold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
                  >
                    <FaHistory size={10} /> Undo
                  </button>
                )}
              </div>

              <button
                onClick={handleUseToday}
                disabled={stock <= 0}
                className={`w-full py-3.5 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 ${
                  justLogged
                    ? 'bg-emerald-500 text-white shadow-emerald-200'
                    : stock <= 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                    : isUsedToday
                    ? 'bg-indigo-700 hover:bg-indigo-800 text-white shadow-indigo-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                }`}
              >
                <FaCheck size={14} />
                <span>
                  {justLogged
                    ? 'Consumption Logged!'
                    : isUsedToday
                    ? `+ Log Another Use (${item.usedTodayCount} used today)`
                    : isMedicine
                    ? 'Take Dose / Mark Used Today'
                    : 'Log Used Today'}
                </span>
              </button>
              {isUsedToday && (
                <p className="text-[11px] text-slate-400 font-medium text-center mt-2">
                  Last recorded at {item.lastUsedTime || 'today'}
                </p>
              )}
            </div>

            {/* Quantity Stepper Adjuster */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-700 block">Current Stock</span>
                <span className="text-[11px] text-slate-400">Add or remove units</span>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5">
                <button
                  onClick={() => handleAdjustStock(-1)}
                  disabled={stock <= 0}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30 active:scale-95 shadow-xs transition-all"
                  title="Decrease stock"
                >
                  <FaMinus size={11} />
                </button>
                <span className="font-mono font-extrabold text-base px-3 text-slate-800 min-w-[36px] text-center">
                  {stock}
                </span>
                <button
                  onClick={() => handleAdjustStock(1)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white text-slate-700 hover:bg-slate-100 active:scale-95 shadow-xs transition-all"
                  title="Restock +1"
                >
                  <FaPlus size={11} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Full Specifications & Intelligence (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Header Card with Product Title & Core Status */}
          <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border ${
                  isMedicine
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                {item.type}
              </span>

              {/* Status Badges */}
              {isExpired ? (
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                  <FaExclamationTriangle size={11} /> Expired ({Math.abs(daysUntilExpiry || 0)}d ago)
                </span>
              ) : daysUntilExpiry !== null && daysUntilExpiry <= 7 ? (
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                  <FaClock size={11} />
                  {daysUntilExpiry === 0 ? 'Expires Today' : daysUntilExpiry === 1 ? 'Expires Tomorrow' : `Expires in ${daysUntilExpiry} days`}
                </span>
              ) : (
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <FaShieldAlt size={11} /> Fresh
                </span>
              )}

              {stock <= 0 ? (
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  Out of Stock
                </span>
              ) : isLow ? (
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Low Stock ({stock} left)
                </span>
              ) : null}

              {isUsedToday && (
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                  <FaCheck size={10} /> Used Today ({item.usedTodayCount}x)
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1a1b41] tracking-tight leading-tight mb-2">
              {item.name}
            </h1>

            {item.details && (
              <p className="text-sm font-bold text-slate-500 mb-4">
                {item.details}
              </p>
            )}

            {/* Expiry Banner Notice */}
            {item.expiryDate && (
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between mt-4 ${
                  isExpired
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : daysUntilExpiry !== null && daysUntilExpiry <= 7
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
                    <FaCalendarAlt size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest block opacity-70">
                      Expiry Date
                    </span>
                    <span className="font-extrabold text-base sm:text-lg">
                      {format(new Date(item.expiryDate), 'MMMM dd, yyyy')}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm shadow-xs uppercase tracking-wider block">
                    {isExpired
                      ? `${Math.abs(daysUntilExpiry || 0)} days expired`
                      : daysUntilExpiry === 0
                      ? 'Expires today'
                      : `${daysUntilExpiry} days remaining`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Key Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Batch Number */}
            {item.batchNo && (
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 flex items-center gap-1.5">
                    <FaTag size={10} /> Batch Number
                  </span>
                  <button
                    onClick={() => copyText(item.batchNo!, 'batch')}
                    className="text-indigo-400 hover:text-indigo-600 text-xs p-1"
                    title="Copy Batch Number"
                  >
                    {copiedField === 'batch' ? <FaCheck className="text-emerald-500" /> : <FaCopy />}
                  </button>
                </div>
                <span className="font-mono font-extrabold text-slate-800 text-base break-all">
                  {item.batchNo}
                </span>
              </div>
            )}

            {/* Price / MRP */}
            {item.price && (
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 block mb-2">
                  Price / MRP
                </span>
                <span className="font-extrabold text-slate-800 text-2xl">
                  ₹{item.price}
                </span>
              </div>
            )}

            {/* Manufacturing Date */}
            {item.mfgDate && (
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-2">
                  Manufacturing Date (Mfg)
                </span>
                <span className="font-bold text-slate-700 text-base">
                  {format(new Date(item.mfgDate), 'MMM dd, yyyy')}
                </span>
              </div>
            )}

            {/* Purchase Date */}
            {item.purchaseDate && (
              <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-2">
                  Date Purchased
                </span>
                <span className="font-bold text-slate-700 text-base">
                  {format(new Date(item.purchaseDate), 'MMM dd, yyyy')}
                </span>
              </div>
            )}
          </div>

          {/* Barcode Section (with Copy) */}
          {item.barcode && (
            <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500">
                  <FaBarcode size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    Product Barcode
                  </span>
                  <span className="font-mono text-base font-extrabold text-slate-800">
                    {item.barcode}
                  </span>
                </div>
              </div>
              <button
                onClick={() => copyText(item.barcode!, 'barcode')}
                className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Copy Barcode"
              >
                {copiedField === 'barcode' ? <FaCheck className="text-emerald-500" /> : <FaCopy />}
                <span>{copiedField === 'barcode' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          {/* Active Ingredients & Medicine Routine Details */}
          {item.components && (
            <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
              <div className="flex items-center gap-2 mb-2">
                <FaFlask className="text-rose-500 text-sm" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600">
                  Active Ingredients / Composition
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                {item.components}
              </p>
            </div>
          )}

          {/* Medicine Timing & Dosage Routine */}
          {isMedicine && (item.medicineTiming || item.dailyDose) && (
            <div className="bg-rose-50/50 rounded-[24px] p-6 border border-rose-100">
              <div className="flex items-center gap-2 mb-3">
                <FaPills className="text-rose-600 text-sm" />
                <span className="text-xs font-extrabold uppercase tracking-widest text-rose-700">
                  Dosage & Schedule
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {item.medicineTiming && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Instructions
                    </span>
                    <span className="text-sm font-extrabold text-slate-800 capitalize">
                      {item.medicineTiming === 'after_food'
                        ? 'Take after food'
                        : item.medicineTiming === 'before_food'
                        ? 'Take before food'
                        : 'Take anytime'}
                    </span>
                  </div>
                )}
                {item.dailyDose && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Daily Dosage
                    </span>
                    <span className="text-sm font-extrabold text-slate-800">
                      {item.dailyDose} dose(s) per day
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description & Notes */}
          {item.description && (
            <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
              <div className="flex items-center gap-2 mb-2">
                <FaInfoCircle className="text-slate-400 text-sm" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Notes & Description
                </span>
              </div>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                {item.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-[28px] max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-xl mb-3">
              <FaTrash />
            </div>
            <h3 className="text-lg font-extrabold text-slate-800">Remove Item?</h3>
            <p className="text-xs text-slate-500 font-medium mt-1 mb-6">
              Are you sure you want to remove &quot;{item.name}&quot; from your inventory?
            </p>
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-200 transition-all"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      <EditProductModal
        item={item}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
};
