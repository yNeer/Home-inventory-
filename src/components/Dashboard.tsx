import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { FaBoxOpen, FaPlus, FaSearch, FaBell } from 'react-icons/fa';
import { ItemCard } from './cards/ItemCard';

interface DashboardProps {
  onAddNew: () => void;
  onNotifications?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onAddNew, onNotifications }) => {
  const items = useLiveQuery(() => db.items.toArray(), []);
  const [searchQuery, setSearchQuery] = useState('');

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await db.items.delete(id);
    }
  };

  return (
    <div className="min-h-full relative px-6 md:px-10 lg:px-12 pt-safe pb-32 w-full max-w-7xl mx-auto">
      {/* Dynamic Header */}
      <header className="flex justify-between items-center mb-8 mt-6 sm:mt-8 z-20 relative">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-indigo-400 tracking-widest uppercase mb-1 drop-shadow-sm">Dashboard</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1b41] tracking-tight leading-none drop-shadow-sm">
            Inventory.
          </h1>
        </div>
        <button
          onClick={onNotifications}
          className="md:hidden w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:text-indigo-500 transition-colors relative"
        >
          <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white z-10"></div>
          <FaBell size={20} />
        </button>
      </header>

      {/* Search Bar */}
      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <FaSearch className="text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search inventory..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white rounded-2xl py-4 pl-12 pr-4 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
         <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-[28px] p-5 md:p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden col-span-1 md:col-span-2">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="relative z-10 flex flex-col justify-between h-full">
               <div className="text-indigo-100 font-bold uppercase tracking-widest text-[10px] md:text-xs mb-2">Total Items</div>
               <div className="text-4xl md:text-5xl font-extrabold tracking-tight">{items ? items.length : 0}</div>
            </div>
         </div>
         <div className="bg-white rounded-[28px] p-5 md:p-6 text-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden col-span-1">
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-rose-100 opacity-50 rounded-full blur-2xl -mr-5 -mb-5"></div>
            <div className="relative z-10 flex flex-col justify-between h-full">
               <div className="text-rose-400 font-bold uppercase tracking-widest text-[10px] md:text-xs mb-2">Expiring</div>
               <div className="text-4xl md:text-5xl font-extrabold tracking-tight">0</div>
            </div>
         </div>
         <div className="hidden md:flex bg-white rounded-[28px] p-5 md:p-6 text-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden col-span-1">
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-emerald-100 opacity-50 rounded-full blur-2xl -mr-5 -mb-5"></div>
            <div className="relative z-10 flex flex-col justify-between h-full">
               <div className="text-emerald-500 font-bold uppercase tracking-widest text-[10px] md:text-xs mb-2">Safe</div>
               <div className="text-4xl md:text-5xl font-extrabold tracking-tight">{items ? items.length : 0}</div>
            </div>
         </div>
      </div>

      {/* Content Area */}
      {(() => {
        if (!items) return null;

        const filteredItems = items.filter(item =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.type.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (items.length === 0) {
          return (
            <div className="text-center py-20 flex flex-col items-center justify-center mt-4">
              <div className="w-[120px] h-[120px] rounded-full bg-white/60 shadow-[0_12px_40px_rgb(0,0,0,0.03)] flex items-center justify-center mb-8 backdrop-blur-xl border border-white">
                <FaBoxOpen className="text-6xl text-slate-300/60" />
              </div>
              <p className="text-2xl font-bold text-slate-800 mb-2">It's empty here</p>
              <p className="text-sm text-slate-400 px-8 leading-relaxed font-medium">Tap the plus button below to scan and track your first item.</p>
            </div>
          );
        }

        if (filteredItems.length === 0) {
          return (
            <div className="text-center py-20">
              <p className="text-xl font-bold text-slate-800 mb-2">No results found</p>
              <p className="text-sm text-slate-400 font-medium">Try a different search term.</p>
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-end mb-2">
               <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">My Items</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map(item => (
                <ItemCard key={item.id} item={item} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Floating Action Button */}
      <button
        onClick={onAddNew}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center hover:bg-indigo-700 hover:scale-105 transition-all active:scale-95 z-50 border-[3px] border-white"
        aria-label="Add new item"
      >
        <FaPlus size={24} />
      </button>
    </div>
  );
};

export default Dashboard;
