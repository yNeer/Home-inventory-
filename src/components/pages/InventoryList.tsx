import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, InventoryItem } from '../../db';
import {
  FaBoxOpen,
  FaSearch,
  FaLeaf,
  FaExclamationTriangle,
  FaTrashAlt,
  FaCheckCircle,
  FaFireAlt,
  FaTimes,
  FaBarcode,
  FaSearchPlus,
  FaEye
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductDetailModal } from '../modals/ProductDetailModal';

type TabType = 'All' | 'Fresh' | 'Near Expiry' | 'Expired' | 'Groceries' | 'Medicines';

export const InventoryList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);

  // Fetch all items
  const allItems = useLiveQuery(() => db.items.toArray(), []) || [];

  // Calculate today at midnight once
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Filter items based on active tab and search
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allItems.filter(item => {
      // Search filter across name, batchNo, barcode, details, components, price
      if (query) {
        const nameMatch = item.name.toLowerCase().includes(query);
        const batchMatch = item.batchNo ? item.batchNo.toLowerCase().includes(query) : false;
        const barcodeMatch = item.barcode ? item.barcode.toLowerCase().includes(query) : false;
        const detailsMatch = item.details ? item.details.toLowerCase().includes(query) : false;
        const compMatch = item.components ? item.components.toLowerCase().includes(query) : false;
        const descMatch = item.description ? item.description.toLowerCase().includes(query) : false;
        const typeMatch = item.type ? item.type.toLowerCase().includes(query) : false;

        if (!nameMatch && !batchMatch && !barcodeMatch && !detailsMatch && !compMatch && !descMatch && !typeMatch) {
          return false;
        }
      }

      // Date logic
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
        case 'Groceries':
          return item.type === 'grocery';
        case 'Medicines':
          return item.type === 'medicine';
        default:
          return true;
      }
    });
  }, [allItems, searchQuery, activeTab, today]);

  const handleDelete = async (id?: number) => {
    if (id) {
      if (window.confirm('Delete this item from inventory?')) {
        await db.items.delete(id);
        if (selectedProduct?.id === id) {
          setSelectedProduct(null);
        }
      }
    }
  };

  const getStatusColor = (item: InventoryItem, todayDate: Date) => {
    const expiry = item.expiryDate ? new Date(item.expiryDate) : null;
    if (!expiry) return 'bg-slate-100 text-slate-600 border-slate-200';

    const diffTime = expiry.getTime() - todayDate.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (days < 0) return 'bg-rose-50 text-rose-600 border-rose-100';
    if (days <= 7) return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  };

  const getStatusText = (item: InventoryItem, todayDate: Date) => {
    const expiry = item.expiryDate ? new Date(item.expiryDate) : null;
    if (!expiry) return 'No Expiry';

    const diffTime = expiry.getTime() - todayDate.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (days < 0) return `Expired (${Math.abs(days)}d)`;
    if (days === 0) return 'Expires Today';
    if (days === 1) return 'Expires Tomorrow';
    return `${days} Days Left`;
  };

  return (
    <div className="min-h-full px-6 md:px-10 lg:px-12 pt-safe pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-7xl mx-auto">
      <header className="mb-6 mt-6 sm:mt-8 relative z-10">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-emerald-500 tracking-widest uppercase mb-1 drop-shadow-sm">All Items</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1b41] tracking-tight leading-none drop-shadow-sm">
            Inventory.
          </h1>
        </div>
      </header>

      {/* Search & Tabs */}
      <div className="flex flex-col gap-4 mb-8 sticky top-0 bg-[#F8F9FE]/90 backdrop-blur-xl z-20 py-3 -mx-6 px-6 md:-mx-10 md:px-10 lg:-mx-12 lg:px-12">
        <div className="relative w-full shadow-xs">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <FaSearch className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, batch number, barcode, details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-12 py-4 bg-white border border-slate-100 rounded-2xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Tab Pills & Result Count */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar flex-1">
            {(['All', 'Fresh', 'Near Expiry', 'Expired', 'Groceries', 'Medicines'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap text-xs transition-all shadow-xs ${
                  activeTab === tab
                    ? 'bg-slate-800 text-white shadow-slate-300 scale-105'
                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                }`}
              >
                {tab === 'Fresh' && <FaLeaf className="inline mr-1.5 -mt-0.5 text-emerald-400" />}
                {tab === 'Near Expiry' && <FaExclamationTriangle className="inline mr-1.5 -mt-0.5 text-amber-500" />}
                {tab === 'Expired' && <FaTrashAlt className="inline mr-1.5 -mt-0.5 text-rose-500" />}
                {tab}
              </button>
            ))}
          </div>

          <span className="text-xs font-bold text-slate-400">
            Showing {filteredItems.length} of {allItems.length}
          </span>
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
              className="bg-white rounded-[32px] p-12 text-center border border-slate-100 shadow-xs flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                <FaBoxOpen size={36} />
              </div>
              <p className="text-xl font-bold text-slate-700">No products match</p>
              <p className="text-slate-400 mt-1 text-sm">Try another keyword or filter.</p>
            </motion.div>
          ) : (
            filteredItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setSelectedProduct(item)}
                className="bg-white rounded-[24px] p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100/90 relative overflow-hidden group hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4 sm:gap-5">
                  {/* Front of Product Thumbnail (Readable Quality) */}
                  {item.image ? (
                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-900 border border-slate-100 shrink-0 relative group/thumb">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity">
                        <FaSearchPlus size={14} />
                      </div>
                    </div>
                  ) : (
                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-indigo-50/60 border border-indigo-100/50 flex flex-col items-center justify-center text-indigo-400 shrink-0">
                      <FaBoxOpen size={24} />
                      <span className="text-[9px] font-bold mt-1 uppercase text-indigo-300">No Photo</span>
                    </div>
                  )}

                  {/* Item Details */}
                  <div className="flex-1 flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base sm:text-lg text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                        {item.name}
                      </h3>
                      {item.price && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shrink-0">
                          ₹{item.price}
                        </span>
                      )}
                    </div>

                    {/* Batch Number & Details Subtitle */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {item.batchNo && (
                        <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100">
                          Batch: {item.batchNo}
                        </span>
                      )}
                      {item.details && (
                        <span className="text-xs text-slate-500 font-medium truncate max-w-xs">
                          {item.details}
                        </span>
                      )}
                      {item.barcode && (
                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                          <FaBarcode size={10} /> {item.barcode}
                        </span>
                      )}
                    </div>

                    {/* Expiry Badge & Category */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusColor(item, today)}`}>
                        {getStatusText(item, today)}
                      </span>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {item.type}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setSelectedProduct(item)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Inspect Product & Photo"
                    >
                      <FaEye size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Product"
                    >
                      <FaTrashAlt size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Detailed Product & Front Photo Viewer Modal */}
      {selectedProduct && (
        <ProductDetailModal
          item={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};
