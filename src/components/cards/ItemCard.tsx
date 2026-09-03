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
  FaEdit,
  FaUtensils,
  FaSlidersH
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
  onEditDose?: (item: InventoryItem) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onDelete,
  onView,
  onEdit,
  onUsedToday,
  onEditDose
}) => {
  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => getTodayDateString(), []);
  const [justUsed, setJustUsed] = useState(false);

  const getStatus = (expiryDate: string | undefined, now: Date) => {
    if (!expiryDate)
      return {
        color: 'gray',
        text: 'No Expiry',
        bg: 'bg-slate-100',
        textCol: 'text-slate-500',
        isExpired: false,
        isNear: false,
        days: null
      };

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
    const amount = isMedicine && item.dailyDose ? item.dailyDose : 1;
    await markItemUsedToday(item.id, amount);
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
      className={`relative overflow-hidden bg-white rounded-[28px] p-5 shadow-2xs border transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full group ${
        status.isExpired
          ? 'border-rose-200 hover:border-rose-300'
          : isLow
          ? 'border-amber-200 hover:border-amber-300'
          : 'border-slate-100 hover:border-slate-200'
      } ${onView ? 'cursor-pointer' : ''}`}
    >
      {/* Top Accent Strip indicator */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${
          status.isExpired
            ? 'bg-rose-500'
            : isMedicine
            ? 'bg-rose-400'
            : isLow
            ? 'bg-amber-400'
            : 'bg-indigo-500'
        }`}
      />

      {/* Header Info */}
      <div className="flex justify-between items-start mb-3 relative z-10 flex-none pt-1">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div
            className={`flex items-center justify-center w-[46px] h-[46px] rounded-2xl shrink-0 ${
              status.isExpired
                ? 'bg-rose-100 text-rose-600 border border-rose-200'
                : isMedicine
                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
            }`}
          >
            {isMedicine ? <FaPills size={19} /> : <FaBox size={19} />}
          </div>

          <div className="min-w-0 flex-1 pr-1">
            <h3 className="font-extrabold text-[16px] text-slate-900 capitalize leading-tight mb-1 tracking-tight truncate group-hover:text-indigo-600 transition-colors">
              {item.name}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full ${
                  isMedicine ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700'
                }`}
              >
                {item.type}
              </span>

              {item.price && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  ₹{item.price}
                </span>
              )}

              {item.batchNo && (
                <span className="text-[9px] font-mono font-bold text-slate-500 px-2 py-0.5 rounded-full bg-slate-100 truncate max-w-[110px]">
                  B: {item.batchNo}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Action Top Icons */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
          {/* Quick Dose Editor Button for Medicines */}
          {isMedicine && onEditDose && (
            <button
              onClick={e => {
                e.stopPropagation();
                onEditDose(item);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all active:scale-95"
              title="Edit Dose Routine"
            >
              <FaSlidersH size={12} />
            </button>
          )}

          {onEdit && (
            <button
              onClick={e => {
                e.stopPropagation();
                onEdit(item);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95"
              aria-label="Edit item"
              title="Edit product details"
            >
              <FaEdit size={12} />
            </button>
          )}

          <button
            onClick={e => {
              e.stopPropagation();
              if (item.id) onDelete(item.id);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95"
            aria-label="Delete item"
            title={status.isExpired ? 'Discard expired product' : 'Delete item'}
          >
            <FaTrash size={12} />
          </button>
        </div>
      </div>

      {/* Front of Product Image */}
      {item.image && (
        <div className="mb-3 mt-0.5 rounded-2xl overflow-hidden h-32 bg-slate-900/95 border border-slate-100 relative group/img">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-contain"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-bold text-white flex items-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
            <FaSearchPlus size={10} /> View
          </div>
        </div>
      )}

      {/* Active Ingredients or Product Details */}
      {item.components && (
        <div className="mb-2.5 relative z-10">
          <p
            className="text-[11px] font-mono text-slate-500 font-medium leading-snug line-clamp-1"
            title={item.components}
          >
            {item.components}
          </p>
        </div>
      )}

      {item.details && !item.components && (
        <p className="text-xs text-slate-600 font-medium mb-2.5 line-clamp-1">{item.details}</p>
      )}

      {/* Medicine Dose & Routine Banner (2026 Modern Style) */}
      {isMedicine && (
        <div
          onClick={e => {
            if (onEditDose) {
              e.stopPropagation();
              onEditDose(item);
            }
          }}
          className={`mb-3 p-2.5 rounded-2xl bg-rose-50/60 border border-rose-100/80 flex items-center justify-between text-xs transition-colors ${
            onEditDose ? 'hover:bg-rose-50 cursor-pointer' : ''
          }`}
          title="Click to edit dose settings"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0 text-[10px]">
              <FaPills size={10} />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-rose-900 block truncate text-[11px]">
                {item.dailyDose ? `${item.dailyDose} ${item.doseUnit || 'dose'}` : '1 dose'}
                {item.doseFrequency ? ` • ${item.doseFrequency.split(' ')[0]}` : ''}
              </span>
              {item.medicineTiming && (
                <span className="text-[10px] text-rose-700 font-medium flex items-center gap-1">
                  <FaUtensils size={8} />
                  {item.medicineTiming.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>

          <span className="text-[10px] font-extrabold text-rose-600 hover:underline shrink-0 pl-1">
            Dose ⚙
          </span>
        </div>
      )}

      {/* Stock Quantity & Status Badges */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-1.5">
          {/* Stock badge */}
          {stock <= 0 ? (
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
              <FaExclamationCircle size={9} /> Out of Stock
            </span>
          ) : isLow ? (
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
              <FaExclamationCircle size={9} /> Low: {stock} left
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Stock: {stock}
            </span>
          )}

          {/* Quick Stepper */}
          <div
            className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200/70"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={e => handleQuantityAdjust(e, -1)}
              disabled={stock <= 0}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 active:scale-95 transition-all text-xs"
              title="Decrease quantity"
            >
              <FaMinus size={7} />
            </button>
            <span className="font-mono text-xs font-black px-1.5 text-slate-700">{stock}</span>
            <button
              onClick={e => handleQuantityAdjust(e, 1)}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-800 hover:bg-white active:scale-95 transition-all text-xs"
              title="Add / Restock quantity"
            >
              <FaPlus size={7} />
            </button>
          </div>
        </div>

        {/* Used Today Badge */}
        {isUsedToday && (
          <span className="inline-flex items-center gap-1 text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full animate-in fade-in">
            <FaCheck size={9} className="text-emerald-500" />
            <span>
              Taken {item.usedTodayCount && item.usedTodayCount > 1 ? `(${item.usedTodayCount}x)` : ''}
            </span>
          </span>
        )}
      </div>

      {/* Mfg & Expiry Dates Bar */}
      <div className="flex flex-col gap-2 mt-auto pt-1">
        <div className="flex gap-2 bg-slate-50 rounded-2xl p-2 border border-slate-100 relative z-10">
          <div className="flex-1 min-w-0" title="Manufacturing Date (Mfg)">
            <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 whitespace-nowrap">
              <FaRegClock size={8} /> Mfg
            </span>
            <span className="font-semibold text-slate-700 text-[11px] block truncate">
              {item.mfgDate ? format(new Date(item.mfgDate), 'MMM dd, yyyy') : '—'}
            </span>
          </div>

          <div className="w-[1px] bg-slate-200 my-0.5 mx-1 shrink-0"></div>

          <div className="flex-1 pl-1 min-w-0" title="Expiry Date (Exp)">
            <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 whitespace-nowrap">
              <FaRegClock size={8} /> Exp Date
            </span>
            <span className={`font-bold text-[11px] block truncate ${status.textCol}`}>
              {item.expiryDate ? format(new Date(item.expiryDate), 'MMM dd, yyyy') : 'No Date'}
            </span>
          </div>
        </div>

        {/* Status + Actions Row */}
        <div className="flex items-center justify-between relative z-10 gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.bg} border border-slate-100 shrink-0`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                status.color === 'rose'
                  ? 'bg-rose-500 animate-pulse'
                  : status.color === 'orange'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            />
            <span className={`text-[10px] font-bold tracking-wide ${status.textCol}`}>
              {status.text}
            </span>
          </div>

          {/* Quick Action Button: Use / Take Dose / Undo / Discard */}
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            {status.isExpired ? (
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (item.id && window.confirm(`Discard expired ${item.name}?`)) {
                    onDelete(item.id);
                  }
                }}
                className="px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-black flex items-center gap-1 active:scale-95 transition-all"
                title="Discard expired item"
              >
                <FaTrash size={9} /> Discard
              </button>
            ) : isUsedToday ? (
              <button
                onClick={handleUndoUsed}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                title="Undo consumption log"
              >
                <FaHistory size={9} /> Undo
              </button>
            ) : (
              <button
                onClick={handleUseToday}
                disabled={stock <= 0}
                className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 active:scale-95 transition-all shadow-xs ${
                  justUsed
                    ? 'bg-emerald-600 text-white'
                    : isMedicine
                    ? 'bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 disabled:pointer-events-none'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:pointer-events-none'
                }`}
                title={isMedicine ? 'Log dose taken today' : 'Mark item used today'}
              >
                <FaCheck size={9} />
                <span>
                  {justUsed
                    ? 'Logged!'
                    : isMedicine
                    ? `Take ${item.dailyDose ? `${item.dailyDose} ${item.doseUnit || 'dose'}` : 'Dose'}`
                    : 'Use Today'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
