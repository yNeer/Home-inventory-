import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { FaPills, FaSearch, FaPlus } from 'react-icons/fa';
import { ItemCard } from '../cards/ItemCard';

interface MedicinesProps {
  onAddNew: (type: 'medicine') => void;
}

export const Medicines: React.FC<MedicinesProps> = ({ onAddNew }) => {
  const items = useLiveQuery(() => db.items.where('type').equals('medicine').toArray(), []);
  const [searchQuery, setSearchQuery] = useState('');

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this medicine?')) {
      await db.items.delete(id);
    }
  };

  return (
    <div className="min-h-full relative px-6 md:px-10 lg:px-12 pt-safe pb-32 w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center mb-8 mt-6 sm:mt-8 z-20 relative">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-rose-400 tracking-widest uppercase mb-1 drop-shadow-sm">Pharmacy</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1b41] tracking-tight leading-none drop-shadow-sm">
            Medicines.
          </h1>
        </div>
      </header>

      {/* Search Bar */}
      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <FaSearch className="text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search medicines, batch no, components..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white rounded-2xl py-4 pl-12 pr-4 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all"
        />
      </div>

      {/* Content Area */}
      {(() => {
        if (!items) return null;

        const filteredItems = items.filter(item =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.batchNo && item.batchNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (item.components && item.components.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        if (items.length === 0) {
          return (
            <div className="text-center py-20 flex flex-col items-center justify-center mt-4 bg-white rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="w-[120px] h-[120px] rounded-full bg-rose-50 flex items-center justify-center mb-6">
                <FaPills className="text-5xl text-rose-400" />
              </div>
              <p className="text-2xl font-bold text-slate-800 mb-2">No medicines yet</p>
              <p className="text-sm text-slate-400 px-8 leading-relaxed font-medium mb-8 max-w-sm">Keep track of your medical cabinet. Add your first medicine to manage expiry and batches.</p>
              <button
                onClick={() => onAddNew('medicine')}
                className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-rose-200 transition-all active:scale-95"
              >
                <FaPlus /> Add Medicine
              </button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map(item => (
                <ItemCard key={item.id} item={item} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Mobile Floating Action Button (if not empty state) */}
      {items && items.length > 0 && (
         <button
           onClick={() => onAddNew('medicine')}
           className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-tr from-rose-400 to-rose-500 text-white rounded-full shadow-lg shadow-rose-200 flex items-center justify-center hover:scale-105 transition-all active:scale-95 z-40 border-2 border-white"
           aria-label="Add new medicine"
         >
           <FaPlus size={20} />
         </button>
      )}

    </div>
  );
};