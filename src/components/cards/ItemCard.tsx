import React, { useMemo } from 'react';
import { format, isBefore, addDays } from 'date-fns';
import { FaBox, FaPills, FaTrash, FaExclamationCircle, FaRegClock } from 'react-icons/fa';
import { InventoryItem } from '../../db';

interface ItemCardProps {
  item: InventoryItem;
  onDelete: (id: number) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onDelete }) => {
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
    <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-[32px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full">
      {/* Glow effect */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-2xl pointer-events-none ${isMedicine ? 'bg-rose-400' : 'bg-indigo-400'}`}></div>

      <div className="flex justify-between items-start mb-4 relative z-10 flex-none">
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center w-[52px] h-[52px] rounded-[20px] shadow-sm backdrop-blur-md shrink-0 ${isMedicine ? 'bg-gradient-to-br from-rose-100 to-rose-50 text-rose-500 border border-rose-200/50' : 'bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-500 border border-indigo-200/50'}`}>
            {isMedicine ? <FaPills size={24} /> : <FaBox size={24} />}
          </div>
          <div className="min-w-0 pr-2">
            <h3 className="font-[700] text-[19px] text-slate-800 capitalize leading-tight mb-1 font-sans tracking-tight truncate">{item.name}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-500`}>{item.type}</span>
              {item.price && <span className="text-[10px] font-bold text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">₹{item.price}</span>}
              {item.batchNo && <span className="text-[9px] font-mono font-bold text-indigo-600 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100">B: {item.batchNo}</span>}
            </div>
            {item.details && <p className="text-xs text-slate-500 mt-2 font-medium line-clamp-1">{item.details}</p>}
            {item.description && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-snug">{item.description}</p>}
          </div>
        </div>

        <button
          onClick={() => item.id && onDelete(item.id)}
          className="w-10 h-10 flex items-center justify-center rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95"
          aria-label="Delete item"
        >
          <FaTrash size={14} />
        </button>
      </div>

      {item.image && (
        <div className="mb-5 mt-2 rounded-[24px] overflow-hidden h-36 bg-slate-50 border border-slate-100/50 relative">
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>
      )}

      {item.components && (
         <div className="mb-4 relative z-10 px-1 flex-1">
           <p className="text-[11px] font-medium text-slate-500 leading-snug line-clamp-2" title={item.components}>
             {item.components}
           </p>
         </div>
      )}

      <div className="flex flex-col gap-3 mt-auto">
        <div className="flex gap-3 bg-slate-50/50 rounded-[24px] p-3.5 border border-slate-100/50 relative z-10">
          <div className="flex-1">
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 whitespace-nowrap">
               <FaRegClock size={9} /> Mfg
            </span>
            <span className="font-semibold text-slate-700 text-[12px] md:text-[13px] block truncate">{item.mfgDate ? format(new Date(item.mfgDate), 'MMM dd, yyyy') : 'Unknown'}</span>
          </div>

          <div className="w-[1px] bg-slate-200 my-1 mx-1 shrink-0"></div>

          <div className="flex-1 pl-1 min-w-0">
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 whitespace-nowrap">
               <FaRegClock size={9} /> Exp
            </span>
            <span className={`font-bold text-[12px] md:text-[13px] block truncate ${status.textCol}`}>
              {item.expiryDate ? format(new Date(item.expiryDate), 'MMM dd, yyyy') : 'Unknown'}
            </span>
          </div>
        </div>

        <div className="pt-1 flex items-center justify-between relative z-10">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${status.bg} border border-${status.color}-100/50`}>
           <div className={`w-2 h-2 rounded-full bg-${status.color}-500 ${status.text === 'Expired' ? 'animate-pulse' : ''}`}></div>
           <span className={`text-[11px] font-bold tracking-wide ${status.textCol}`}>{status.text}</span>
        </div>

          {item.reminderOption && item.reminderOption !== 'none' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/80 border border-slate-200/50">
              <span className="text-[12px]">🔔</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{item.reminderOption}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
