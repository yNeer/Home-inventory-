import React, { useMemo } from 'react';
import { format, isBefore, addDays } from 'date-fns';
import { FaBox, FaPills, FaTrash, FaRegClock, FaSearchPlus } from 'react-icons/fa';
import { InventoryItem } from '../../db';

interface ItemCardProps {
  item: InventoryItem;
  onDelete: (id: number) => void;
  onView?: (item: InventoryItem) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onDelete, onView }) => {
  const now = useMemo(() => new Date(), []);

  const getStatus = (expiryDate: string | undefined, now: Date) => {
    if (!expiryDate) return { color: 'gray', text: 'No Expiry', bg: 'bg-gray-100', textCol: 'text-gray-500' };
    const expiry = new Date(expiryDate);

    if (isBefore(expiry, now)) return { color: 'rose', text: 'Expired', bg: 'bg-rose-50', textCol: 'text-rose-600' };
    if (isBefore(expiry, addDays(now, 7))) return { color: 'orange', text: 'Expiring Soon', bg: 'bg-orange-50', textCol: 'text-orange-600' };
    return { color: 'emerald', text: 'Fresh', bg: 'bg-emerald-50', textCol: 'text-emerald-600' };
  };

  const status = getStatus(item.expiryDate, now);
  const isMedicine = item.type === 'medicine';

  return (
    <div
      onClick={() => onView && onView(item)}
      className={`relative overflow-hidden bg-white/90 backdrop-blur-xl rounded-[32px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/80 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full group ${
        onView ? 'cursor-pointer' : ''
      }`}
    >
      {/* Glow effect */}
      <div
        className={`absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-2xl pointer-events-none ${
          isMedicine ? 'bg-rose-400' : 'bg-indigo-400'
        }`}
      ></div>

      <div className="flex justify-between items-start mb-3 relative z-10 flex-none">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div
            className={`flex items-center justify-center w-[48px] h-[48px] rounded-[18px] shadow-xs shrink-0 ${
              isMedicine
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

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (item.id) onDelete(item.id);
          }}
          className="w-9 h-9 flex items-center justify-center rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95 shrink-0"
          aria-label="Delete item"
          title="Delete item"
        >
          <FaTrash size={13} />
        </button>
      </div>

      {/* Front of Product Image (Readable Quality) */}
      {item.image && (
        <div className="mb-3 mt-1 rounded-[20px] overflow-hidden h-36 bg-slate-900 border border-slate-100 relative group/img">
          <img src={item.image} alt={item.name} className="w-full h-full object-contain bg-slate-900/90" />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-[9px] font-bold text-white flex items-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
            <FaSearchPlus size={10} /> Inspect
          </div>
          <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-bold text-white/90">
            Front Photo
          </div>
        </div>
      )}

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

      <div className="flex flex-col gap-2.5 mt-auto pt-1">
        <div className="flex gap-2 bg-slate-50 rounded-[20px] p-2.5 border border-slate-100 relative z-10">
          <div className="flex-1 min-w-0">
            <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 whitespace-nowrap">
              <FaRegClock size={9} /> Mfg
            </span>
            <span className="font-semibold text-slate-700 text-[11px] block truncate">
              {item.mfgDate ? format(new Date(item.mfgDate), 'MMM dd, yyyy') : '—'}
            </span>
          </div>

          <div className="w-[1px] bg-slate-200 my-0.5 mx-1 shrink-0"></div>

          <div className="flex-1 pl-1 min-w-0">
            <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 whitespace-nowrap">
              <FaRegClock size={9} /> Exp
            </span>
            <span className={`font-bold text-[11px] block truncate ${status.textCol}`}>
              {item.expiryDate ? format(new Date(item.expiryDate), 'MMM dd, yyyy') : 'No Date'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between relative z-10">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.bg} border border-slate-100`}>
            <div className={`w-2 h-2 rounded-full ${status.color === 'rose' ? 'bg-rose-500 animate-pulse' : status.color === 'orange' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
            <span className={`text-[10px] font-bold tracking-wide ${status.textCol}`}>{status.text}</span>
          </div>

          <span className="text-[11px] font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
            View details &rarr;
          </span>
        </div>
      </div>
    </div>
  );
};
