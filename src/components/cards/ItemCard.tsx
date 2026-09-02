import React, { useMemo, useState } from 'react';
import { format, isBefore, addDays, differenceInDays } from 'date-fns';
import {
  FaBox,
  FaPills,
  FaTrash,
  FaRegClock,
  FaSearchPlus,
  FaCheck,
  FaPlus,
  FaMinus,
  FaExclamationCircle,
  FaHistory,
  FaEdit
} from 'react-icons/fa';
import {
  InventoryItem,
  getItemStock,
  isItemLowQuantity,
  markItemUsedToday,
  undoItemUsedToday,
  adjustItemStock,
  getTodayDateString
} from '../../db';

interface ItemCardProps {
  item: InventoryItem;
  onDelete: (id: number) => void;
  onView?: (item: InventoryItem) => void;
  onEdit?: (item: InventoryItem) => void;
  onUsedToday?: (item: InventoryItem) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onDelete, onView, onEdit, onUsedToday }) => {
  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => getTodayDateString(), []);
  const [justUsed, setJustUsed] = useState(false);

  const getStatus = (expiryDate: string | undefined, now: Date) => {
    if (!expiryDate) return { color: 'gray', text: 'No Expiry', bg: 'bg-gray-100', textCol: 'text-gray-500', isExpired: false, isNear: false, days: null };
    const expiry = new Date(expiryDate);
    const days = differenceInDays(expiry, now);

    if (isBefore(expiry, now)) {
      const daysAgo = Math.abs(days);
      return {
        color: 'rose',
        text: daysAgo === 0 ? 'Expired Today' : `Expired (${daysAgo}d ago)`,
        bg: 'bg-rose-50',
        textCol: 'text-rose-600',
        isExpired: true,
        isNear: false,
        days
      };
    }
    if (isBefore(expiry, addDays(now, 7))) {
      return {
        color: 'orange',
        text: days <= 0 ? 'Expires Today' : days === 1 ? 'Expires Tomorrow' : `${days}d left`,
        bg: 'bg-amber-50',
        textCol: 'text-amber-700',
        isExpired: false,
        isNear: true,
        days
      };
    }
    return {
      color: 'emerald',
      text: 'Fresh',
      bg: 'bg-emerald-50',
      textCol: 'text-emerald-600',
      isExpired: false,
      isNear: false,
      days
    };
  };

  const status = getStatus(item.expiryDate, now);
  const isMedicine = item.type === 'medicine';
  const stock = getItemStock(item);
  const isLow = isItemLowQuantity(item);
  const isUsedToday = item.lastUsedDate === todayStr && (item.usedTodayCount || 0) > 0;

  const handleUseToday = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.id) return;
    await markItemUsedToday(item.id);
    setJustUsed(true);
    if (onUsedToday) onUsedToday(item);
    setTimeout(() => setJustUsed(false), 2000);
  };

  const handleUndoUsed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.id) return;
    await undoItemUsedToday(item.id);
  };

  const handleQuantityAdjust = async (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (!item.id) return;
    await adjustItemStock(item.id, delta);
  };

  return (
    <div
      onClick={() => onView && onView(item)}
      className={`relative overflow-hidden bg-white/95 backdrop-blur-xl rounded-[32px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full group ${
        status.isExpired
          ? 'border-rose-200 hover:shadow-rose-100/50'
          : isLow
          ? 'border-amber-200 hover:shadow-amber-100/50'
          : 'border-slate-100/80 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)]'
      } ${onView ? 'cursor-pointer' : ''}`}
    >
      {/* Glow effect */}
      <div
        className={`absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-2xl pointer-events-none ${
          status.isExpired
            ? 'bg-rose-500'
            : isMedicine
            ? 'bg-rose-400'
            : isLow
            ? 'bg-amber-400'
            : 'bg-indigo-400'
        }`}
      ></div>

      <div className="flex justify-between items-start mb-3 relative z-10 flex-none">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div
            className={`flex items-center justify-center w-[48px] h-[48px] rounded-[18px] shadow-xs shrink-0 ${
              status.isExpired
                ? 'bg-rose-100 text-rose-600 border border-rose-200'
                : isMedicine
                ? 'bg-gradient-to-br from-rose-100 to-rose-50 text-rose-500 border border-rose-200/50'
                : 'bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-500 border border-indigo-200/50'
            }`}
          >
            {isMedicine ? <FaPills size={20} /> : <FaBox size={20} />}
          </div>
          <div className="min-w-0 flex-1 pr-1">
            <h3 className="font-extrabold text-[17px] text-slate-800 capitalize leading-tight mb-1 font-sans tracking-tight truncate group-hover:text-indigo-600 transition-colors">
              {item.name}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                {item.type}
              </span>
              {item.price && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  ₹{item.price}
                </span>
              )}
              {item.batchNo && (
                <span className="text-[9px] font-mono font-bold text-indigo-600 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 truncate max-w-[120px]">
                  B: {item.batchNo}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95"
              aria-label="Edit item"
              title="Edit product details"
            >
              <FaEdit size={12} />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (item.id) onDelete(item.id);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95"
            aria-label="Delete item"
            title={status.isExpired ? 'Discard expired product' : 'Delete item'}
          >
            <FaTrash size={12} />
          </button>
        </div>
      </div>

      {/* Front of Product Image (SD Quality) */}
      {item.image && (
        <div className="mb-3 mt-1 rounded-[20px] overflow-hidden h-36 bg-slate-900 border border-slate-100 relative group/img">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-contain bg-slate-900/90"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-[9px] font-bold text-white flex items-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
            <FaSearchPlus size={10} /> Inspect
          </div>
          <div className="absolute bottom-2 left-2 bg-emerald-600/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-bold text-white shadow-xs">
            SD Photo
          </div>
        </div>
      )}

      {/* Details & Volume */}
      {item.details && (
        <p className="text-xs text-slate-600 font-semibold mb-2 line-clamp-1">
          {item.details}
        </p>
      )}

      {item.components && (
        <div className="mb-3 relative z-10 px-0.5">
          <p className="text-[11px] font-medium text-slate-400 leading-snug line-clamp-1" title={item.components}>
            {item.components}
          </p>
        </div>
      )}

      {/* Stock Quantity & Status Badges */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-1.5">
          {/* Stock badge */}
          {stock <= 0 ? (
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
              <FaExclamationCircle size={10} /> Out of Stock (0)
            </span>
          ) : isLow ? (
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
              <FaExclamationCircle size={10} /> Low: {stock} left
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              Qty: {stock}
            </span>
          )}

          {/* Quick Stepper */}
          <div
            className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200/70"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => handleQuantityAdjust(e, -1)}
              disabled={stock <= 0}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 active:scale-95 transition-all text-xs"
              title="Decrease quantity"
            >
              <FaMinus size={8} />
            </button>
            <span className="font-mono text-xs font-bold px-1.5 text-slate-700">{stock}</span>
            <button
              onClick={(e) => handleQuantityAdjust(e, 1)}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-800 hover:bg-white active:scale-95 transition-all text-xs"
              title="Add / Restock quantity"
            >
              <FaPlus size={8} />
            </button>
          </div>
        </div>

        {/* Used Today Badge */}
        {isUsedToday && (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full animate-in fade-in">
            <FaCheck size={9} className="text-emerald-500" />
            <span>Used Today {item.usedTodayCount && item.usedTodayCount > 1 ? `(${item.usedTodayCount}x)` : ''}</span>
          </span>
        )}
      </div>

      {/* Mfg & Expiry Dates Bar */}
      <div className="flex flex-col gap-2.5 mt-auto pt-1">
        <div className="flex gap-2 bg-slate-50 rounded-[20px] p-2.5 border border-slate-100 relative z-10">
          <div className="flex-1 min-w-0" title="Manufacturing Date (Mfg)">
            <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 whitespace-nowrap">
              <FaRegClock size={9} /> Mfg Date
            </span>
            <span className="font-semibold text-slate-700 text-[11px] block truncate">
              {item.mfgDate ? format(new Date(item.mfgDate), 'MMM dd, yyyy') : '—'}
            </span>
          </div>

          <div className="w-[1px] bg-slate-200 my-0.5 mx-1 shrink-0"></div>

          <div className="flex-1 pl-1 min-w-0" title="Expiry Date (Exp)">
            <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 whitespace-nowrap">
              <FaRegClock size={9} /> Exp Date
            </span>
            <span className={`font-bold text-[11px] block truncate ${status.textCol}`}>
              {item.expiryDate ? format(new Date(item.expiryDate), 'MMM dd, yyyy') : 'No Date'}
            </span>
          </div>
        </div>

        {/* Status + Actions Row */}
        <div className="flex items-center justify-between relative z-10 gap-2">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.bg} border border-slate-100 shrink-0`}>
            <div className={`w-2 h-2 rounded-full ${status.color === 'rose' ? 'bg-rose-500 animate-pulse' : status.color === 'orange' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
            <span className={`text-[10px] font-bold tracking-wide ${status.textCol}`}>{status.text}</span>
          </div>

          {/* Quick Action Button: Use Today / Undo / Discard */}
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {status.isExpired ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.id && window.confirm(`Discard expired ${item.name}?`)) {
                    onDelete(item.id);
                  }
                }}
                className="px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-extrabold flex items-center gap-1 active:scale-95 transition-all"
                title="Discard expired item"
              >
                <FaTrash size={9} /> Discard
              </button>
            ) : isUsedToday ? (
              <button
                onClick={handleUndoUsed}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                title="Undo used today"
              >
                <FaHistory size={9} /> Undo
              </button>
            ) : (
              <button
                onClick={handleUseToday}
                disabled={stock <= 0}
                className={`px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 active:scale-95 transition-all shadow-xs ${
                  justUsed
                    ? 'bg-emerald-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:pointer-events-none'
                }`}
                title="Mark this item as used/taken today"
              >
                {justUsed ? <FaCheck size={9} /> : <FaCheck size={9} />}
                <span>{justUsed ? 'Used!' : 'Use Today'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
