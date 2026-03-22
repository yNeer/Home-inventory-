import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { FaBoxOpen, FaSearch, FaBell } from 'react-icons/fa';
import { ItemCard } from './cards/ItemCard';

const Dashboard: React.FC = () => {
  const items = useLiveQuery(() => db.items.toArray(), []);

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await db.items.delete(id);
    }
  };

  return (
    <div className="h-full relative px-6 pt-safe pb-32 bg-[#F8F9FE] selection:bg-indigo-300">
      {/* Dynamic Header */}
      <header className="flex justify-between items-center mb-10 mt-6 sm:mt-8 z-20 relative">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-indigo-400 tracking-widest uppercase mb-1 drop-shadow-sm">Dashboard</span>
          <h1 className="text-4xl font-extrabold text-[#1a1b41] tracking-tight leading-none drop-shadow-sm">
            Inventory.
          </h1>
        </div>
        <div className="flex gap-4">
           <button className="relative w-12 h-12 rounded-[20px] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:scale-105 transition-all active:scale-95 border border-slate-100">
             <FaSearch size={18} />
           </button>
           <button className="relative w-12 h-12 rounded-[20px] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:scale-105 transition-all active:scale-95 border border-slate-100">
             <FaBell size={18} />
             <div className="absolute top-[12px] right-[14px] w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></div>
           </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
         <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-[28px] p-5 text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="relative z-10">
               <div className="text-indigo-100 font-bold uppercase tracking-widest text-[10px] mb-2">Total Items</div>
               <div className="text-4xl font-extrabold tracking-tight">{items ? items.length : 0}</div>
            </div>
         </div>
         <div className="bg-white rounded-[28px] p-5 text-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-rose-100 opacity-50 rounded-full blur-2xl -mr-5 -mb-5"></div>
            <div className="relative z-10">
               <div className="text-rose-400 font-bold uppercase tracking-widest text-[10px] mb-2">Expiring</div>
               <div className="text-4xl font-extrabold tracking-tight">0</div>
            </div>
         </div>
      </div>

      {/* Content Area */}
      {!items || items.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center justify-center mt-4">
          <div className="w-[120px] h-[120px] rounded-full bg-white/60 shadow-[0_12px_40px_rgb(0,0,0,0.03)] flex items-center justify-center mb-8 backdrop-blur-xl border border-white">
             <FaBoxOpen className="text-6xl text-slate-300/60" />
          </div>
          <p className="text-2xl font-bold text-slate-800 mb-2">It's empty here</p>
          <p className="text-sm text-slate-400 px-8 leading-relaxed font-medium">Tap the plus button below to scan and track your first item.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-end mb-2">
             <h2 className="text-lg font-bold text-slate-800 tracking-tight">Recent Items</h2>
             <button className="text-indigo-500 font-bold text-xs uppercase tracking-wider hover:text-indigo-600 transition-colors">View All</button>
          </div>
          {items.map(item => (
            <ItemCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
