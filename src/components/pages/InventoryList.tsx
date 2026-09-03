import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  InventoryItem,
  getItemStock,
  isItemLowQuantity,
  adjustItemStock
} from '../../db';
import {
  FaBoxOpen,
  FaSearch,
  FaLeaf,
  FaExclamationTriangle,
  FaTrashAlt,
  FaTimes,
  FaBarcode,
  FaSearchPlus,
  FaEye,
  FaEdit,
  FaThLarge,
  FaList,
  FaSortAmountDown,
  FaPlus,
  FaMinus,
  FaPills,
  FaBox
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductDetailModal } from '../modals/ProductDetailModal';
import { EditProductModal } from '../modals/EditProductModal';
import { MedicineDoseModal } from '../modals/MedicineDoseModal';
import { ItemCard } from '../cards/ItemCard';
import { format, differenceInDays, isBefore } from 'date-fns';

type TabType = 'All' | 'Fresh' | 'Low Stock' | 'Near Expiry' | 'Expired' | 'Groceries' | 'Medicines';
type SortOption = 'expiry_asc' | 'expiry_desc' | 'name_asc' | 'stock_asc' | 'price_desc' | 'id_desc';
type ViewMode = 'grid' | 'table';

interface InventoryListProps {
  onViewItem?: (item: InventoryItem) => void;
  onEdit?: (item: InventoryItem) => void;
}

export const InventoryList: React.FC<InventoryListProps> = ({ onViewItem, onEdit }) => {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [localEditItem, setLocalEditItem] = useState<InventoryItem | null>(null);
  const [editingDoseItem, setEditingDoseItem] = useState<InventoryItem | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortOption, setSortOption] = useState<SortOption>('expiry_asc');

  const handleView = (item: InventoryItem) => {
    if (onViewItem) {
      onViewItem(item);
    } else {
      setSelectedProduct(item);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    if (onEdit) {
      onEdit(item);
    } else {
      setLocalEditItem(item);
    }
  };

  // Fetch all items from Dexie
  const allItems = useLiveQuery(() => db.items.toArray(), []) || [];

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Filter & Sort items
  const filteredAndSortedItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // 1. Filter
    const filtered = allItems.filter(item => {
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

      const expiry = item.expiryDate ? new Date(item.expiryDate) : null;
      let daysUntilExpiry: number | null = null;
      if (expiry) {
        const diffTime = expiry.getTime() - today.getTime();
        daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      switch (activeTab) {
        case 'All':
          return true;
        case 'Fresh':
          return expiry === null || daysUntilExpiry! > 7;
        case 'Low Stock':
          return isItemLowQuantity(item);
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

    // 2. Sort
    return filtered.sort((a, b) => {
      if (sortOption === 'expiry_asc') {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      }
      if (sortOption === 'expiry_desc') {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime();
      }
      if (sortOption === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortOption === 'stock_asc') {
        return getItemStock(a) - getItemStock(b);
      }
      if (sortOption === 'price_desc') {
        const priceA = parseFloat(a.price?.replace(/[^0-9.]/g, '') || '0');
        const priceB = parseFloat(b.price?.replace(/[^0-9.]/g, '') || '0');
        return priceB - priceA;
      }
      if (sortOption === 'id_desc') {
        return (b.id || 0) - (a.id || 0);
      }
      return 0;
    });
  }, [allItems, searchQuery, activeTab, sortOption, today]);

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

  const handleAdjustStock = async (e: React.MouseEvent, id?: number, delta: number = 1) => {
    e.stopPropagation();
    if (!id) return;
    await adjustItemStock(id, delta);
  };

  const handleDiscardAllExpired = async () => {
    const expiredItems = allItems.filter(item => {
      if (!item.expiryDate) return false;
      return isBefore(new Date(item.expiryDate), today);
    });

    if (expiredItems.length === 0) return;
    if (window.confirm(`Discard all ${expiredItems.length} expired items from inventory?`)) {
      const ids = expiredItems.map(i => i.id!).filter(Boolean);
      await db.items.bulkDelete(ids);
    }
  };

  const expiredCount = useMemo(() => {
    return allItems.filter(item => item.expiryDate && isBefore(new Date(item.expiryDate), today)).length;
  }, [allItems, today]);

  return (
    <div className="min-h-full px-6 md:px-10 lg:px-12 pt-safe pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-6 mt-6 sm:mt-8 relative z-10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-emerald-500 tracking-widest uppercase mb-1 drop-shadow-sm">Catalog & Stock</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1b41] tracking-tight leading-none drop-shadow-sm">
            Inventory.
          </h1>
        </div>

        {expiredCount > 0 && (
          <button
            onClick={handleDiscardAllExpired}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs border border-rose-200 shadow-2xs transition-colors cursor-pointer"
            title="Clean up all expired stock"
          >
            <FaTrashAlt size={12} />
            <span>Discard All Expired ({expiredCount})</span>
          </button>
        )}
      </header>

      {/* Sticky Search, View Switcher & Filters */}
      <div className="flex flex-col gap-4 mb-6 sticky top-0 bg-[#F8F9FE]/95 backdrop-blur-xl z-20 py-3 -mx-6 px-6 md:-mx-10 md:px-10 lg:-mx-12 lg:px-12">
        {/* Search Bar + View Mode + Sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 shadow-2xs">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FaSearch className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, barcode, batch number, salt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200/80 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400 font-medium text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Sort Selector */}
            <div className="relative flex items-center bg-white border border-slate-200/80 rounded-2xl px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs">
              <FaSortAmountDown className="text-slate-400 mr-2 shrink-0" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer pr-2"
              >
                <option value="expiry_asc">Expiry (Soonest)</option>
                <option value="expiry_desc">Expiry (Furthest)</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="stock_asc">Stock (Low-High)</option>
                <option value="price_desc">Price (High-Low)</option>
                <option value="id_desc">Recently Added</option>
              </select>
            </div>

            {/* View Mode Switcher (Grid vs Table) */}
            <div className="flex items-center bg-white border border-slate-200/80 rounded-2xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Compact Table List View"
              >
                <FaList size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Bento Card Grid View"
              >
                <FaThLarge size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Pills & Result Count */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar flex-1">
            {(['All', 'Fresh', 'Low Stock', 'Near Expiry', 'Expired', 'Groceries', 'Medicines'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full font-bold whitespace-nowrap text-xs transition-all shadow-2xs cursor-pointer ${
                  activeTab === tab
                    ? 'bg-slate-900 text-white shadow-sm scale-102'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
                }`}
              >
                {tab === 'Fresh' && <FaLeaf className="inline mr-1.5 -mt-0.5 text-emerald-400" />}
                {tab === 'Low Stock' && <FaExclamationTriangle className="inline mr-1.5 -mt-0.5 text-amber-500" />}
                {tab === 'Near Expiry' && <FaExclamationTriangle className="inline mr-1.5 -mt-0.5 text-orange-500" />}
                {tab === 'Expired' && <FaTrashAlt className="inline mr-1.5 -mt-0.5 text-rose-500" />}
                {tab}
              </button>
            ))}
          </div>

          <span className="text-xs font-bold text-slate-400 shrink-0">
            Showing {filteredAndSortedItems.length} of {allItems.length}
          </span>
        </div>
      </div>

      {/* Content Rendering: Empty vs Table vs Grid */}
      {(() => {
        if (filteredAndSortedItems.length === 0) {
          return (
            <div className="bg-white rounded-[32px] p-12 text-center border border-slate-100 shadow-2xs flex flex-col items-center mt-4">
              <div className="w-18 h-18 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-3">
                <FaBoxOpen size={32} />
              </div>
              <p className="text-lg font-bold text-slate-700">No products match filter</p>
              <p className="text-slate-400 mt-1 text-xs max-w-xs">
                {searchQuery ? `No items found matching "${searchQuery}".` : 'Try changing your category or filter tab.'}
              </p>
            </div>
          );
        }

        // 1. Bento Card Grid View
        if (viewMode === 'grid') {
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onDelete={() => handleDelete(item.id)}
                  onView={handleView}
                  onEdit={handleEdit}
                  onEditDose={(med) => setEditingDoseItem(med)}
                />
              ))}
            </div>
          );
        }

        // 2. Compact List Table View (Industry standard tabular view)
        return (
          <div className="bg-white rounded-[28px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 pl-5 pr-3">Product</th>
                    <th className="py-3.5 px-3">Type</th>
                    <th className="py-3.5 px-3">Stock / Qty</th>
                    <th className="py-3.5 px-3">Expiry Date</th>
                    <th className="py-3.5 px-3">Batch / Code</th>
                    <th className="py-3.5 px-3">Price</th>
                    <th className="py-3.5 pl-3 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredAndSortedItems.map((item) => {
                    const stock = getItemStock(item);
                    const isLow = isItemLowQuantity(item);
                    const expiry = item.expiryDate ? new Date(item.expiryDate) : null;
                    const days = expiry ? differenceInDays(expiry, today) : null;
                    const isExpired = expiry ? isBefore(expiry, today) : false;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleView(item)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* Product Name & Thumbnail */}
                        <td className="py-3.5 pl-5 pr-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                              item.type === 'medicine' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'
                            }`}>
                              {item.type === 'medicine' ? <FaPills size={14} /> : <FaBox size={14} />}
                            </div>
                            <div className="min-w-0 max-w-[200px] sm:max-w-xs">
                              <span className="font-extrabold text-slate-800 block truncate group-hover:text-indigo-600 transition-colors">
                                {item.name}
                              </span>
                              {item.components ? (
                                <span className="text-[10.5px] text-slate-400 truncate block">
                                  {item.components}
                                </span>
                              ) : item.details ? (
                                <span className="text-[10.5px] text-slate-400 truncate block">
                                  {item.details}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {item.type}
                          </span>
                        </td>

                        {/* Stock & Quick Stepper */}
                        <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200/70">
                            <button
                              onClick={(e) => handleAdjustStock(e, item.id, -1)}
                              disabled={stock <= 0}
                              className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-800 hover:bg-white disabled:opacity-30 active:scale-95 transition-all"
                              title="Decrease stock"
                            >
                              <FaMinus size={8} />
                            </button>
                            <span className={`font-mono text-xs font-bold px-2 ${isLow ? 'text-amber-600' : 'text-slate-700'}`}>
                              {stock}
                            </span>
                            <button
                              onClick={(e) => handleAdjustStock(e, item.id, 1)}
                              className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-800 hover:bg-white active:scale-95 transition-all"
                              title="Add stock"
                            >
                              <FaPlus size={8} />
                            </button>
                          </div>
                        </td>

                        {/* Expiry Date & Relative Days */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {expiry ? (
                            <div className="flex flex-col">
                              <span className={`font-bold ${
                                isExpired ? 'text-rose-600' : days! <= 7 ? 'text-amber-600' : 'text-slate-700'
                              }`}>
                                {format(expiry, 'MMM dd, yyyy')}
                              </span>
                              <span className={`text-[10px] font-semibold ${
                                isExpired ? 'text-rose-500' : days! <= 7 ? 'text-amber-600' : 'text-slate-400'
                              }`}>
                                {isExpired
                                  ? `${Math.abs(days!)}d expired`
                                  : days === 0
                                  ? 'Expires Today'
                                  : days === 1
                                  ? 'Tomorrow'
                                  : `${days}d left`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No Date</span>
                          )}
                        </td>

                        {/* Batch Number & Barcode */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {item.batchNo ? (
                            <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {item.batchNo}
                            </span>
                          ) : item.barcode ? (
                            <span className="font-mono text-[11px] text-slate-500 flex items-center gap-1">
                              <FaBarcode size={10} /> {item.barcode}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-3 font-bold text-slate-700">
                          {item.price ? `₹${item.price}` : '—'}
                        </td>

                        {/* Actions: View, Edit, Delete */}
                        <td className="py-3.5 pl-3 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleView(item)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Inspect Product"
                            >
                              <FaEye size={12} />
                            </button>
                            <button
                              onClick={() => handleEdit(item)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Edit Details"
                            >
                              <FaEdit size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Item"
                            >
                              <FaTrashAlt size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          item={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      )}

      {/* Medicine Dose Editing Modal */}
      {editingDoseItem && (
        <MedicineDoseModal
          item={editingDoseItem}
          isOpen={!!editingDoseItem}
          onClose={() => setEditingDoseItem(null)}
          onUpdated={(updated) => {
            setEditingDoseItem(null);
            if (selectedProduct?.id === updated.id) {
              setSelectedProduct(updated);
            }
          }}
        />
      )}

      {/* Local Edit Modal (if not handled globally) */}
      <EditProductModal
        item={localEditItem}
        isOpen={!!localEditItem}
        onClose={() => setLocalEditItem(null)}
      />
    </div>
  );
};
