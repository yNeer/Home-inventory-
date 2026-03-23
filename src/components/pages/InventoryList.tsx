import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { FaBoxOpen, FaSearch, FaLeaf, FaExclamationTriangle, FaTrashAlt, FaCheckCircle, FaFireAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

type TabType = 'All' | 'Fresh' | 'Near Expiry' | 'Expired';

export const InventoryList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all items
  const allItems = useLiveQuery(() => db.items.toArray(), []) || [];

  // Filter items based on active tab and search
  const filteredItems = allItems.filter(item => {
    // Search filter
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Date logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = item.expiryDate ? new Date(item.expiryDate) : null;
    let daysUntilExpiry = null;
    if (expiry) {
        const diffTime = expiry.getTime() - today.getTime();
        daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    switch (activeTab) {
      case 'All':
        return true;
      case 'Fresh':
        return expiry === null || daysUntilExpiry! > 7;
      case 'Near Expiry':
        return expiry !== null && daysUntilExpiry! >= 0 && daysUntilExpiry! <= 7;
      case 'Expired':
        return expiry !== null && daysUntilExpiry! < 0;
      default:
        return true;
    }
  });

  const handleDelete = async (id?: number) => {
    if (id) {
        await db.items.delete(id);
    }
  };

  const getStatusColor = (item: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = item.expiryDate ? new Date(item.expiryDate) : null;

    if (!expiry) return 'bg-emerald-50 text-emerald-600 border-emerald-100';

    const diffTime = expiry.getTime() - today.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (days < 0) return 'bg-rose-50 text-rose-600 border-rose-100';
    if (days <= 7) return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  };

  const getStatusText = (item: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = item.expiryDate ? new Date(item.expiryDate) : null;

    if (!expiry) return 'No Expiry';

    const diffTime = expiry.getTime() - today.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (days < 0) return 'Expired';
    if (days === 0) return 'Expires Today';
    if (days === 1) return 'Expires Tomorrow';
    return `${days} Days Left`;
  };

  return (
    <div className="min-h-full px-6 md:px-10 lg:px-12 pt-safe pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-7xl mx-auto">
      <header className="mb-8 mt-6 sm:mt-8 relative z-10">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-emerald-500 tracking-widest uppercase mb-1 drop-shadow-sm">All Items</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1b41] tracking-tight leading-none drop-shadow-sm">
            Inventory.
          </h1>
        </div>
      </header>

      {/* Search & Tabs */}
      <div className="flex flex-col gap-6 mb-8 sticky top-0 bg-[#F8F9FE]/90 backdrop-blur-xl z-20 py-4 -mx-6 px-6 md:-mx-10 md:px-10 lg:-mx-12 lg:px-12">
        <div className="relative w-full shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaSearch className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-300 font-medium"
          />
        </div>

        <div className="flex overflow-x-auto gap-2 pb-2 -mb-2 no-scrollbar">
          {(['All', 'Fresh', 'Near Expiry', 'Expired'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-full font-bold whitespace-nowrap transition-all shadow-sm ${
                activeTab === tab
                  ? 'bg-slate-800 text-white shadow-slate-300 scale-105'
                  : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
              }`}
            >
              {tab === 'Fresh' && <FaLeaf className="inline mr-2 -mt-1" />}
              {tab === 'Near Expiry' && <FaExclamationTriangle className="inline mr-2 -mt-1 text-amber-500" />}
              {tab === 'Expired' && <FaTrashAlt className="inline mr-2 -mt-1 text-rose-500" />}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory List */}
      <div className="flex flex-col gap-4">
        <AnimatePresence>
          {filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-[32px] p-12 text-center border border-slate-100 shadow-sm flex flex-col items-center"
            >
               <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
                  <FaBoxOpen size={40} />
               </div>
               <p className="text-xl font-bold text-slate-700">No items found</p>
               <p className="text-slate-400 mt-2">Try adjusting your filters or search query.</p>
            </motion.div>
          ) : (
            filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_e, info) => {
                  if (info.offset.x < -100 || info.offset.x > 100) {
                     handleDelete(item.id);
                  }
                }}
                className="bg-white rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group cursor-grab active:cursor-grabbing"
              >
                {/* Background hint for swipe to delete */}
                <div className="absolute inset-y-0 right-0 w-32 bg-rose-500 flex items-center justify-end pr-8 opacity-0 group-active:opacity-100 transition-opacity -z-10 rounded-r-[24px]">
                   <FaTrashAlt className="text-white text-xl" />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:items-center bg-white z-10 relative">
                  {/* Item Info */}
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    <h3 className="font-bold text-lg text-slate-800 truncate pr-4">{item.name}</h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border ${getStatusColor(item)}`}>
                        {getStatusText(item)}
                      </span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                        {item.type}
                      </span>
                      {item.price && (
                         <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                            ₹{item.price}
                         </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl font-bold transition-colors active:scale-95 border border-emerald-100/50"
                      title="Used Completely"
                    >
                      <FaCheckCircle />
                      <span className="text-xs uppercase tracking-wider hidden sm:block">Used</span>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold transition-colors active:scale-95 border border-rose-100/50"
                      title="Destroyed / Thrown Away"
                    >
                      <FaFireAlt />
                      <span className="text-xs uppercase tracking-wider hidden sm:block">Destroy</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
