import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  InventoryItem,
  getItemStock,
  isItemLowQuantity,
  getTodayDateString,
  markItemUsedToday
} from '../../db';
import {
  FaPills,
  FaSearch,
  FaPlus,
  FaTimes,
  FaUtensils,
  FaExclamationTriangle,
  FaRegClock,
  FaCheck,
  FaShieldAlt,
  FaBoxes
} from 'react-icons/fa';
import { ItemCard } from '../cards/ItemCard';
import { ProductDetailModal } from '../modals/ProductDetailModal';
import { MedicineDoseModal } from '../modals/MedicineDoseModal';
import { differenceInDays, isBefore } from 'date-fns';

type MedicineFilter = 'all' | 'before_food' | 'after_food' | 'low_stock' | 'near_expiry';

interface MedicinesProps {
  onAddNew: (type: 'medicine') => void;
  onViewItem?: (item: InventoryItem) => void;
  onEdit?: (item: InventoryItem) => void;
}

export const Medicines: React.FC<MedicinesProps> = ({ onAddNew, onViewItem, onEdit }) => {
  const items = useLiveQuery(() => db.items.where('type').equals('medicine').toArray(), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<MedicineFilter>('all');
  const [selectedMedicine, setSelectedMedicine] = useState<InventoryItem | null>(null);
  const [editingDoseItem, setEditingDoseItem] = useState<InventoryItem | null>(null);

  const todayStr = useMemo(() => getTodayDateString(), []);

  const handleView = (item: InventoryItem) => {
    if (onViewItem) {
      onViewItem(item);
    } else {
      setSelectedMedicine(item);
    }
  };

  const {
    filteredItems,
    takenTodayCount,
    lowStockCount,
    expiringSoonCount
  } = useMemo(() => {
    if (!items) {
      return {
        filteredItems: [],
        takenTodayCount: 0,
        lowStockCount: 0,
        expiringSoonCount: 0
      };
    }

    const now = new Date();
    const query = searchQuery.trim().toLowerCase();

    let takenToday = 0;
    let lowStock = 0;
    let expiringSoon = 0;

    items.forEach(item => {
      if (item.lastUsedDate === todayStr && (item.usedTodayCount || 0) > 0) {
        takenToday += (item.usedTodayCount || 1);
      }
      if (isItemLowQuantity(item)) {
        lowStock++;
      }
      if (item.expiryDate) {
        const diff = differenceInDays(new Date(item.expiryDate), now);
        if (diff <= 14) {
          expiringSoon++;
        }
      }
    });

    const result = items.filter(item => {
      // 1. Text search
      if (query) {
        const nameMatch = item.name.toLowerCase().includes(query);
        const batchMatch = item.batchNo ? item.batchNo.toLowerCase().includes(query) : false;
        const compMatch = item.components ? item.components.toLowerCase().includes(query) : false;
        const detailsMatch = item.details ? item.details.toLowerCase().includes(query) : false;
        const barcodeMatch = item.barcode ? item.barcode.toLowerCase().includes(query) : false;
        const timingMatch = item.medicineTiming ? item.medicineTiming.toLowerCase().includes(query) : false;

        if (!nameMatch && !batchMatch && !compMatch && !detailsMatch && !barcodeMatch && !timingMatch) {
          return false;
        }
      }

      // 2. Filter pill
      switch (activeFilter) {
        case 'before_food':
          return item.medicineTiming === 'before_food';
        case 'after_food':
          return item.medicineTiming === 'after_food';
        case 'low_stock':
          return isItemLowQuantity(item);
        case 'near_expiry':
          if (!item.expiryDate) return false;
          return differenceInDays(new Date(item.expiryDate), now) <= 14;
        case 'all':
        default:
          return true;
      }
    });

    return {
      filteredItems: result,
      takenTodayCount: takenToday,
      lowStockCount: lowStock,
      expiringSoonCount: expiringSoon
    };
  }, [items, searchQuery, activeFilter, todayStr]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this medicine?')) {
      await db.items.delete(id);
      if (selectedMedicine?.id === id) {
        setSelectedMedicine(null);
      }
    }
  };

  return (
    <div className="min-h-full relative px-6 md:px-10 lg:px-12 pt-safe pb-32 w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <header className="flex justify-between items-center mb-6 mt-6 sm:mt-8 z-20 relative">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-rose-400 tracking-widest uppercase mb-1 drop-shadow-sm">Pharmacy & Cabinet</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1b41] tracking-tight leading-none drop-shadow-sm">
            Medicines.
          </h1>
        </div>
        <button
          onClick={() => onAddNew('medicine')}
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-5 rounded-2xl shadow-md shadow-rose-200 transition-all active:scale-95 text-sm cursor-pointer"
        >
          <FaPlus size={12} /> Add Medicine
        </button>
      </header>

      {/* Metric Highlights Strip */}
      {items && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Total Medicines</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-800">{items.length}</span>
              <span className="text-xs text-slate-400 font-medium">in cabinet</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 block mb-1">Doses Taken Today</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-purple-700">{takenTodayCount}</span>
              <span className="text-xs text-slate-400 font-medium">logged</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 block mb-1">Refill Needed</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-amber-600">{lowStockCount}</span>
              <span className="text-xs text-slate-400 font-medium">low stock</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 block mb-1">Expiring Soon</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-rose-600">{expiringSoonCount}</span>
              <span className="text-xs text-slate-400 font-medium">within 14d</span>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <FaSearch className="text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search by generic salt (e.g. Paracetamol), brand name, batch no..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white rounded-2xl py-4 pl-12 pr-12 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-rose-400 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      {items && items.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Medicines ({items.length})
          </button>
          <button
            onClick={() => setActiveFilter('before_food')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'before_food'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FaUtensils size={10} /> Before Food
          </button>
          <button
            onClick={() => setActiveFilter('after_food')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'after_food'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FaUtensils size={10} /> After Food
          </button>
          <button
            onClick={() => setActiveFilter('low_stock')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'low_stock'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FaExclamationTriangle size={10} /> Refill Needed ({lowStockCount})
          </button>
          <button
            onClick={() => setActiveFilter('near_expiry')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'near_expiry'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FaRegClock size={10} /> Expiring Soon ({expiringSoonCount})
          </button>
        </div>
      )}

      {/* Content Area */}
      {(() => {
        if (!items) return null;

        if (items.length === 0) {
          return (
            <div className="text-center py-20 flex flex-col items-center justify-center mt-4 bg-white rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="w-[120px] h-[120px] rounded-full bg-rose-50 flex items-center justify-center mb-6">
                <FaPills className="text-5xl text-rose-400" />
              </div>
              <p className="text-2xl font-bold text-slate-800 mb-2">No medicines yet</p>
              <p className="text-sm text-slate-400 px-8 leading-relaxed font-medium mb-8 max-w-sm">
                Keep track of your medical cabinet. Add your medicines to manage batch numbers, daily dosage, active formulation, and expiry alerts.
              </p>
              <button
                onClick={() => onAddNew('medicine')}
                className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-rose-200 transition-all active:scale-95 cursor-pointer"
              >
                <FaPlus /> Add Medicine
              </button>
            </div>
          );
        }

        if (filteredItems.length === 0) {
          return (
            <div className="text-center py-20 bg-white rounded-[32px] p-8 border border-slate-100 shadow-2xs">
              <p className="text-xl font-bold text-slate-800 mb-2">No medicines match filter</p>
              <p className="text-sm text-slate-400 font-medium">
                {searchQuery ? `No results for "${searchQuery}"` : 'No medicines in this category.'}
              </p>
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center text-xs font-bold text-slate-400">
              <span>Showing {filteredItems.length} of {items.length} medicines</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onDelete={handleDelete}
                  onView={handleView}
                  onEdit={onEdit}
                  onEditDose={(med) => setEditingDoseItem(med)}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* Medicine Dose Editing Modal */}
      {editingDoseItem && (
        <MedicineDoseModal
          item={editingDoseItem}
          isOpen={!!editingDoseItem}
          onClose={() => setEditingDoseItem(null)}
          onUpdated={(updated) => {
            setEditingDoseItem(null);
            if (selectedMedicine?.id === updated.id) {
              setSelectedMedicine(updated);
            }
          }}
        />
      )}

      {/* Product Detail Modal */}
      {selectedMedicine && (
        <ProductDetailModal
          item={selectedMedicine}
          onClose={() => setSelectedMedicine(null)}
          onDelete={handleDelete}
          onEdit={onEdit}
        />
      )}
    </div>
  );
};
