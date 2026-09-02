import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  InventoryItem,
  getItemStock,
  isItemLowQuantity,
  getTodayDateString,
  markItemUsedToday
} from '../db';
import {
  FaBoxOpen,
  FaSearch,
  FaBell,
  FaDownload,
  FaSpinner,
  FaTimes,
  FaRegClock,
  FaExclamationTriangle,
  FaCheck,
  FaBoxes,
  FaTrash,
  FaChevronRight,
  FaPlus,
  FaPills,
  FaLightbulb,
  FaCompressAlt,
  FaExpandAlt,
  FaExternalLinkAlt
} from 'react-icons/fa';
import { ItemCard } from './cards/ItemCard';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ProductDetailModal } from './modals/ProductDetailModal';
import { EditProductModal } from './modals/EditProductModal';
import { InventorySuggestions } from './dashboard/InventorySuggestions';
import { CollapsibleCard } from './dashboard/CollapsibleCard';
import { differenceInDays, isBefore } from 'date-fns';

interface DashboardProps {
  onAddNew: () => void;
  onNotifications?: () => void;
  onViewInventory?: () => void;
  onViewMedicines?: () => void;
  onViewItem?: (item: InventoryItem) => void;
  onEdit?: (item: InventoryItem) => void;
}

type TabFilter = 'all' | 'used_today' | 'low_stock' | 'near_expiry' | 'expired' | 'medicines' | 'groceries';

const Dashboard: React.FC<DashboardProps> = ({
  onAddNew,
  onNotifications,
  onViewInventory,
  onViewMedicines,
  onViewItem,
  onEdit
}) => {
  const items = useLiveQuery(() => db.items.toArray(), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const { isInstallable, installPWA, isInstalled } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState<InventoryItem | null>(null);
  const [localEditingItem, setLocalEditingItem] = useState<InventoryItem | null>(null);

  // Collapsible section state persistence
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('dashboard_collapsed_sections');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    // Clean, decluttered defaults:
    // Urgent alerts & today's routine open; general catalog shelves collapsed by default to eliminate clutter
    return {
      used_today: false,
      suggestions: false,
      expired: false,
      low_stock: false,
      near_expiry: false,
      medicines: true,
      groceries: true
    };
  });

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('dashboard_collapsed_sections', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const next = {
      used_today: false,
      suggestions: false,
      expired: false,
      low_stock: false,
      near_expiry: false,
      medicines: false,
      groceries: false
    };
    setCollapsedSections(next);
    try {
      localStorage.setItem('dashboard_collapsed_sections', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleCollapseAll = () => {
    const next = {
      used_today: true,
      suggestions: true,
      expired: true,
      low_stock: true,
      near_expiry: true,
      medicines: true,
      groceries: true
    };
    setCollapsedSections(next);
    try {
      localStorage.setItem('dashboard_collapsed_sections', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const areAllCollapsed = useMemo(() => {
    return ['used_today', 'expired', 'low_stock', 'near_expiry', 'medicines', 'groceries'].every(
      k => collapsedSections[k]
    );
  }, [collapsedSections]);

  const handleViewProduct = (item: InventoryItem) => {
    if (onViewItem) {
      onViewItem(item);
    } else {
      setSelectedItemForModal(item);
    }
  };

  const handleEditProduct = (item: InventoryItem) => {
    if (onEdit) {
      onEdit(item);
    } else {
      setLocalEditingItem(item);
    }
  };

  const todayStr = useMemo(() => getTodayDateString(), []);

  // Categorize items
  const {
    filteredItems,
    usedTodayItems,
    lowStockItems,
    nearExpiryItems,
    expiredItems,
    medicineItems,
    groceryItems
  } = useMemo(() => {
    if (!items) {
      return {
        filteredItems: [],
        usedTodayItems: [],
        lowStockItems: [],
        nearExpiryItems: [],
        expiredItems: [],
        medicineItems: [],
        groceryItems: []
      };
    }

    const now = new Date();
    const query = searchQuery.trim().toLowerCase();

    // 1. Filtered by search if any
    const filtered = items.filter(item => {
      if (!query) return true;
      const nameMatch = item.name.toLowerCase().includes(query);
      const batchMatch = item.batchNo ? item.batchNo.toLowerCase().includes(query) : false;
      const barcodeMatch = item.barcode ? item.barcode.toLowerCase().includes(query) : false;
      const detailsMatch = item.details ? item.details.toLowerCase().includes(query) : false;
      const compMatch = item.components ? item.components.toLowerCase().includes(query) : false;
      const descMatch = item.description ? item.description.toLowerCase().includes(query) : false;
      const typeMatch = item.type ? item.type.toLowerCase().includes(query) : false;
      const expiryMatch = item.expiryDate ? item.expiryDate.toLowerCase().includes(query) : false;
      const priceMatch = item.price ? item.price.toLowerCase().includes(query) : false;

      return nameMatch || batchMatch || barcodeMatch || detailsMatch || compMatch || descMatch || typeMatch || expiryMatch || priceMatch;
    });

    // 2. Used Today items
    const usedToday = items
      .filter(item => item.lastUsedDate === todayStr && (item.usedTodayCount || 0) > 0)
      .sort((a, b) => (b.usedTodayCount || 0) - (a.usedTodayCount || 0));

    // 3. Low Quantity items (stock <= threshold or 0)
    const lowStock = items
      .filter(item => isItemLowQuantity(item))
      .sort((a, b) => getItemStock(a) - getItemStock(b));

    // 4. Expired items (expiry < now)
    const expired = items
      .filter(item => {
        if (!item.expiryDate) return false;
        return isBefore(new Date(item.expiryDate), now);
      })
      .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());

    // 5. Near Expiry items (0 to 7 days away)
    const nearExpiry = items
      .filter(item => {
        if (!item.expiryDate) return false;
        const diff = differenceInDays(new Date(item.expiryDate), now);
        return diff >= 0 && diff <= 7;
      })
      .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());

    // 6. Medicines & Groceries
    const medicines = items.filter(item => item.type === 'medicine');
    const groceries = items.filter(item => item.type === 'grocery');

    return {
      filteredItems: filtered,
      usedTodayItems: usedToday,
      lowStockItems: lowStock,
      nearExpiryItems: nearExpiry,
      expiredItems: expired,
      medicineItems: medicines,
      groceryItems: groceries
    };
  }, [items, searchQuery, todayStr]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await db.items.delete(id);
      if (selectedItemForModal?.id === id) {
        setSelectedItemForModal(null);
      }
    }
  };

  const handleDiscardAllExpired = async () => {
    if (expiredItems.length === 0) return;
    if (window.confirm(`Discard all ${expiredItems.length} expired products from inventory?`)) {
      const ids = expiredItems.map(i => i.id!).filter(Boolean);
      await db.items.bulkDelete(ids);
    }
  };

  const handleQuickLogUsed = async (item: InventoryItem) => {
    if (!item.id) return;
    await markItemUsedToday(item.id);
    setQuickLogOpen(false);
  };

  const handleTabSelect = (tab: TabFilter) => {
    setActiveTab(tab);
    // Automatically ensure the corresponding section is expanded when selected
    if (tab !== 'all') {
      setCollapsedSections(prev => ({
        ...prev,
        [tab]: false
      }));
    }
  };

  return (
    <div className="min-h-full relative px-4 sm:px-8 md:px-10 lg:px-12 pt-safe pb-32 w-full max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-center mb-5 mt-4 sm:mt-6 z-20 relative">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-indigo-500 tracking-wider uppercase mb-0.5">
            Dashboard
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-none">
            Inventory.
          </h1>
        </div>
        <div className="flex gap-2 sm:gap-3">
          {!isInstalled && isInstallable && (
            <button
              onClick={async () => {
                setIsInstalling(true);
                await installPWA();
                setIsInstalling(false);
              }}
              disabled={isInstalling}
              className="md:hidden w-11 h-11 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100 hover:bg-blue-100 transition-colors shadow-2xs"
              aria-label="Install App"
            >
              {isInstalling ? <FaSpinner className="animate-spin" size={16} /> : <FaDownload size={16} />}
            </button>
          )}
          <button
            onClick={onNotifications}
            aria-label="Notifications"
            className="md:hidden w-11 h-11 bg-white rounded-full flex items-center justify-center text-slate-500 shadow-2xs border border-slate-100 hover:text-indigo-600 transition-colors relative"
          >
            <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white z-10"></div>
            <FaBell size={18} />
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="relative mb-5">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <FaSearch className="text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search product name, batch, barcode, details..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white rounded-2xl py-3.5 pl-11 pr-11 text-slate-800 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] transition-all"
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

      {/* Streamlined KPI Status Bar (Moved & Condensed to remove clutter) */}
      {!searchQuery && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 mb-5">
          {/* Total Items */}
          <button
            onClick={() => handleTabSelect('all')}
            className={`rounded-2xl p-3.5 text-left transition-all border relative overflow-hidden flex flex-col justify-between ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-md border-slate-800 ring-2 ring-slate-400/30'
                : 'bg-white text-slate-800 shadow-[0_4px_16px_rgb(0,0,0,0.02)] border-slate-100 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${activeTab === 'all' ? 'text-slate-300' : 'text-slate-400'}`}>
                Total Stock
              </span>
              <FaBoxes className={activeTab === 'all' ? 'text-slate-300' : 'text-indigo-500'} size={13} />
            </div>
            <div className="text-2xl font-black tracking-tight">
              {items ? items.length : 0}
            </div>
          </button>

          {/* Used Today */}
          <button
            onClick={() => handleTabSelect('used_today')}
            className={`rounded-2xl p-3.5 text-left transition-all border relative overflow-hidden flex flex-col justify-between ${
              activeTab === 'used_today'
                ? 'bg-purple-700 text-white shadow-md border-purple-600 ring-2 ring-purple-300/40'
                : 'bg-white text-slate-800 shadow-[0_4px_16px_rgb(0,0,0,0.02)] border-slate-100 hover:border-purple-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${activeTab === 'used_today' ? 'text-purple-200' : 'text-purple-600'}`}>
                Used Today
              </span>
              <FaCheck className={activeTab === 'used_today' ? 'text-purple-200' : 'text-purple-500'} size={13} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black tracking-tight">{usedTodayItems.length}</span>
              <span className={`text-[10px] font-semibold ${activeTab === 'used_today' ? 'text-purple-200' : 'text-slate-400'}`}>
                logged
              </span>
            </div>
          </button>

          {/* Low Stock */}
          <button
            onClick={() => handleTabSelect('low_stock')}
            className={`rounded-2xl p-3.5 text-left transition-all border relative overflow-hidden flex flex-col justify-between ${
              activeTab === 'low_stock'
                ? 'bg-amber-600 text-white shadow-md border-amber-500 ring-2 ring-amber-300/40'
                : 'bg-white text-slate-800 shadow-[0_4px_16px_rgb(0,0,0,0.02)] border-slate-100 hover:border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${activeTab === 'low_stock' ? 'text-amber-100' : 'text-amber-600'}`}>
                Low Stock
              </span>
              <FaExclamationTriangle className={activeTab === 'low_stock' ? 'text-amber-200' : 'text-amber-500'} size={13} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black tracking-tight">{lowStockItems.length}</span>
              <span className={`text-[10px] font-semibold ${activeTab === 'low_stock' ? 'text-amber-100' : 'text-slate-400'}`}>
                reorder
              </span>
            </div>
          </button>

          {/* Near Expiry */}
          <button
            onClick={() => handleTabSelect('near_expiry')}
            className={`rounded-2xl p-3.5 text-left transition-all border relative overflow-hidden flex flex-col justify-between ${
              activeTab === 'near_expiry'
                ? 'bg-orange-600 text-white shadow-md border-orange-500 ring-2 ring-orange-300/40'
                : 'bg-white text-slate-800 shadow-[0_4px_16px_rgb(0,0,0,0.02)] border-slate-100 hover:border-orange-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${activeTab === 'near_expiry' ? 'text-orange-100' : 'text-orange-600'}`}>
                Near Expiry
              </span>
              <FaRegClock className={activeTab === 'near_expiry' ? 'text-orange-200' : 'text-orange-500'} size={13} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black tracking-tight">{nearExpiryItems.length}</span>
              <span className={`text-[10px] font-semibold ${activeTab === 'near_expiry' ? 'text-orange-100' : 'text-slate-400'}`}>
                ≤ 7 days
              </span>
            </div>
          </button>

          {/* Expired */}
          <button
            onClick={() => handleTabSelect('expired')}
            className={`rounded-2xl p-3.5 text-left transition-all border relative overflow-hidden flex flex-col justify-between col-span-2 sm:col-span-1 ${
              activeTab === 'expired'
                ? 'bg-rose-600 text-white shadow-md border-rose-500 ring-2 ring-rose-300/40'
                : 'bg-white text-slate-800 shadow-[0_4px_16px_rgb(0,0,0,0.02)] border-slate-100 hover:border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${activeTab === 'expired' ? 'text-rose-100' : 'text-rose-600'}`}>
                Expired
              </span>
              <FaTimes className={activeTab === 'expired' ? 'text-rose-200' : 'text-rose-500'} size={13} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black tracking-tight">{expiredItems.length}</span>
              <span className={`text-[10px] font-semibold ${activeTab === 'expired' ? 'text-rose-100' : 'text-slate-400'}`}>
                discard
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Filter Tabs & Master Collapse/Expand Controller */}
      {!searchQuery && items && items.length > 0 && (
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          {/* Scrollable Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-1 min-w-0">
            <button
              onClick={() => handleTabSelect('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Sections
            </button>
            <button
              onClick={() => handleTabSelect('used_today')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'used_today'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FaCheck size={9} className="text-purple-400" />
              <span>Used Today ({usedTodayItems.length})</span>
            </button>
            <button
              onClick={() => handleTabSelect('low_stock')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'low_stock'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FaExclamationTriangle size={9} className="text-amber-400" />
              <span>Low Stock ({lowStockItems.length})</span>
            </button>
            <button
              onClick={() => handleTabSelect('near_expiry')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'near_expiry'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FaRegClock size={9} className="text-orange-400" />
              <span>Near Expiry ({nearExpiryItems.length})</span>
            </button>
            <button
              onClick={() => handleTabSelect('expired')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'expired'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FaTimes size={9} className="text-rose-400" />
              <span>Expired ({expiredItems.length})</span>
            </button>
            <button
              onClick={() => handleTabSelect('medicines')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'medicines'
                  ? 'bg-purple-800 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FaPills size={9} />
              <span>Medicines ({medicineItems.length})</span>
            </button>
            <button
              onClick={() => handleTabSelect('groceries')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'groceries'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FaBoxes size={9} />
              <span>Groceries ({groceryItems.length})</span>
            </button>
          </div>

          {/* Master Expand/Collapse All Button */}
          {activeTab === 'all' && (
            <button
              onClick={areAllCollapsed ? handleExpandAll : handleCollapseAll}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs"
              title={areAllCollapsed ? 'Expand all sections' : 'Collapse all sections'}
            >
              {areAllCollapsed ? (
                <>
                  <FaExpandAlt size={10} className="text-indigo-600" />
                  <span>Expand All</span>
                </>
              ) : (
                <>
                  <FaCompressAlt size={10} className="text-slate-500" />
                  <span>Collapse All</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Main Content Sections */}
      {(() => {
        if (!items) return null;

        // Empty Inventory Placeholder
        if (items.length === 0) {
          return (
            <div className="text-center py-20 flex flex-col items-center justify-center mt-4">
              <div className="w-24 h-24 rounded-full bg-white shadow-md flex items-center justify-center mb-6 border border-slate-100 text-slate-300">
                <FaBoxOpen size={48} />
              </div>
              <p className="text-2xl font-bold text-slate-800 mb-2">Inventory is empty</p>
              <p className="text-sm text-slate-400 px-6 max-w-md leading-relaxed font-medium mb-6">
                Scan or add your first grocery or medicine product to track stock, expiry dates, and daily consumption.
              </p>
              <button
                onClick={onAddNew}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 flex items-center gap-2 active:scale-95 transition-all"
              >
                <FaPlus size={13} /> Add First Product
              </button>
            </div>
          );
        }

        // Active Search View
        if (searchQuery.trim()) {
          return (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                  <span>Search Results for "{searchQuery}"</span>
                  <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                    {filteredItems.length} found
                  </span>
                </h2>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  Clear search
                </button>
              </div>

              {filteredItems.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl p-8 border border-slate-100 shadow-2xs">
                  <div className="w-14 h-14 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FaSearch size={20} />
                  </div>
                  <p className="text-lg font-bold text-slate-800 mb-1">No products matched</p>
                  <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
                    Try searching by name, batch number, barcode, or category keywords.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredItems.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onDelete={handleDelete}
                      onView={handleViewProduct}
                      onEdit={handleEditProduct}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="flex flex-col">
            {/* 1. USED PRODUCTS TODAY (COLLAPSIBLE CARD) */}
            {(activeTab === 'all' || activeTab === 'used_today') && (
              <CollapsibleCard
                id="used_today"
                isOpen={!collapsedSections['used_today']}
                onToggle={() => toggleSection('used_today')}
                theme="purple"
                title="Used Products Today"
                subtitle={`Items and doses marked consumed today (${new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })})`}
                icon={<FaCheck />}
                iconBg="bg-purple-100 text-purple-700"
                badge={
                  usedTodayItems.length > 0
                    ? `${usedTodayItems.length} Logged Today`
                    : '0 Logged Today'
                }
                badgeColor={
                  usedTodayItems.length > 0
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }
                previewSummary={
                  usedTodayItems.length > 0
                    ? usedTodayItems.map(i => i.name).slice(0, 3).join(', ') + (usedTodayItems.length > 3 ? ` (+${usedTodayItems.length - 3} more)` : '')
                    : 'No consumption logged yet today'
                }
                headerActions={
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickLogOpen(!quickLogOpen);
                      }}
                      className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
                    >
                      <FaPlus size={10} />
                      <span>Log Product</span>
                    </button>

                    {/* Quick Dropdown Picker */}
                    {quickLogOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-10 z-30 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 max-h-64 overflow-y-auto animate-in fade-in"
                      >
                        <div className="p-2 border-b border-slate-100 mb-1 flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            Log item used today
                          </span>
                          <button
                            onClick={() => setQuickLogOpen(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <FaTimes size={10} />
                          </button>
                        </div>
                        {items.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 text-center">No products in inventory</div>
                        ) : (
                          items.map(item => (
                            <button
                              key={item.id}
                              onClick={() => handleQuickLogUsed(item)}
                              className="w-full text-left p-2 rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-between group"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <span className="font-bold text-xs text-slate-800 block truncate group-hover:text-purple-700">
                                  {item.name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Stock: {getItemStock(item)} left
                                </span>
                              </div>
                              <span className="text-[10px] font-extrabold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-lg shrink-0">
                                + Log
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                }
              >
                {usedTodayItems.length === 0 ? (
                  <div className="bg-purple-50/40 border border-purple-100 rounded-2xl p-5 text-center my-2">
                    <p className="text-sm font-bold text-purple-900 mb-1">No products consumed yet today</p>
                    <p className="text-xs text-purple-700/70 max-w-md mx-auto">
                      Click "Use Today" on any product card or use the "+ Log Product" button to track daily groceries or medicines.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 my-2">
                    {usedTodayItems.map(item => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onDelete={handleDelete}
                        onView={handleViewProduct}
                        onEdit={handleEditProduct}
                      />
                    ))}
                  </div>
                )}
              </CollapsibleCard>
            )}

            {/* 2. SMART INVENTORY INSIGHTS (COLLAPSIBLE CARD - RELOCATED) */}
            {(activeTab === 'all' || activeTab === 'low_stock' || activeTab === 'near_expiry' || activeTab === 'expired') && (
              <CollapsibleCard
                id="suggestions"
                isOpen={!collapsedSections['suggestions']}
                onToggle={() => toggleSection('suggestions')}
                theme="amber"
                title="Smart Inventory Insights"
                subtitle="Automated recommendations for restock, expiry prevention, and medicine routines"
                icon={<FaLightbulb />}
                iconBg="bg-amber-100 text-amber-600"
                badge="Action Feed"
                badgeColor="bg-amber-50 text-amber-800 border-amber-200"
                previewSummary="Personalized inventory tips and pending task notifications"
              >
                <div className="my-1">
                  <InventorySuggestions
                    items={items}
                    onViewItem={handleViewProduct}
                    onDeleteItem={handleDelete}
                    hideHeader={true}
                  />
                </div>
              </CollapsibleCard>
            )}

            {/* 3. EXPIRED PRODUCTS (COLLAPSIBLE CARD) */}
            {(activeTab === 'all' || activeTab === 'expired') && (expiredItems.length > 0 || activeTab === 'expired') && (
              <CollapsibleCard
                id="expired"
                isOpen={!collapsedSections['expired']}
                onToggle={() => toggleSection('expired')}
                theme="rose"
                title="Expired Products"
                subtitle="Items past expiration date. Discard them promptly to maintain a fresh, safe pantry."
                icon={<FaTimes />}
                iconBg="bg-rose-100 text-rose-600"
                count={expiredItems.length}
                badge={expiredItems.length > 0 ? `${expiredItems.length} Expired` : '0 Expired'}
                badgeColor={
                  expiredItems.length > 0
                    ? 'bg-rose-100 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }
                previewSummary={
                  expiredItems.length > 0
                    ? expiredItems.map(i => i.name).slice(0, 3).join(', ') + (expiredItems.length > 3 ? ` (+${expiredItems.length - 3} more)` : '')
                    : 'All inventory products are fresh and valid'
                }
                headerActions={
                  expiredItems.length > 0 ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDiscardAllExpired();
                      }}
                      className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
                    >
                      <FaTrash size={10} />
                      <span>Discard All ({expiredItems.length})</span>
                    </button>
                  ) : null
                }
              >
                {expiredItems.length === 0 ? (
                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-6 text-center my-2">
                    <p className="text-sm font-bold text-emerald-800 mb-1">No expired products!</p>
                    <p className="text-xs text-emerald-600">All products in inventory are safely within their expiry dates.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 my-2">
                    {expiredItems.map(item => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onDelete={handleDelete}
                        onView={handleViewProduct}
                        onEdit={handleEditProduct}
                      />
                    ))}
                  </div>
                )}
              </CollapsibleCard>
            )}

            {/* 4. LOW IN QUANTITY / RESTOCK NEEDED (COLLAPSIBLE CARD) */}
            {(activeTab === 'all' || activeTab === 'low_stock') && (lowStockItems.length > 0 || activeTab === 'low_stock') && (
              <CollapsibleCard
                id="low_stock"
                isOpen={!collapsedSections['low_stock']}
                onToggle={() => toggleSection('low_stock')}
                theme="amber"
                title="Low in Quantity / Restock Needed"
                subtitle="Items running low (≤ 2 units) or out of stock. Use the stepper on each card to restock."
                icon={<FaExclamationTriangle />}
                iconBg="bg-amber-100 text-amber-600"
                count={lowStockItems.length}
                badge={lowStockItems.length > 0 ? `${lowStockItems.length} Low Stock` : 'Stock Healthy'}
                badgeColor={
                  lowStockItems.length > 0
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }
                previewSummary={
                  lowStockItems.length > 0
                    ? lowStockItems.map(i => `${i.name} (${getItemStock(i)} left)`).slice(0, 3).join(', ') + (lowStockItems.length > 3 ? ` (+${lowStockItems.length - 3} more)` : '')
                    : 'All stock levels are comfortably above minimum'
                }
              >
                {lowStockItems.length === 0 ? (
                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-6 text-center my-2">
                    <p className="text-sm font-bold text-emerald-800 mb-1">Stock levels healthy!</p>
                    <p className="text-xs text-emerald-600">No items are currently running low on quantity.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 my-2">
                    {lowStockItems.map(item => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onDelete={handleDelete}
                        onView={handleViewProduct}
                        onEdit={handleEditProduct}
                      />
                    ))}
                  </div>
                )}
              </CollapsibleCard>
            )}

            {/* 5. NEAR EXPIRY (COLLAPSIBLE CARD) */}
            {(activeTab === 'all' || activeTab === 'near_expiry') && (nearExpiryItems.length > 0 || activeTab === 'near_expiry') && (
              <CollapsibleCard
                id="near_expiry"
                isOpen={!collapsedSections['near_expiry']}
                onToggle={() => toggleSection('near_expiry')}
                theme="orange"
                title="Near Expiry (Expiring ≤ 7 Days)"
                subtitle="Products nearing expiration date. Prioritize consuming these first to avoid food waste."
                icon={<FaRegClock />}
                iconBg="bg-orange-100 text-orange-600"
                count={nearExpiryItems.length}
                badge={nearExpiryItems.length > 0 ? `${nearExpiryItems.length} Expiring Soon` : 'None Soon'}
                badgeColor={
                  nearExpiryItems.length > 0
                    ? 'bg-orange-100 text-orange-800 border-orange-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }
                previewSummary={
                  nearExpiryItems.length > 0
                    ? nearExpiryItems.map(i => i.name).slice(0, 3).join(', ') + (nearExpiryItems.length > 3 ? ` (+${nearExpiryItems.length - 3} more)` : '')
                    : 'No products expiring within the next week'
                }
              >
                {nearExpiryItems.length === 0 ? (
                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-6 text-center my-2">
                    <p className="text-sm font-bold text-emerald-800 mb-1">No products expiring soon!</p>
                    <p className="text-xs text-emerald-600">All items have more than 7 days of shelf life remaining.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 my-2">
                    {nearExpiryItems.map(item => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onDelete={handleDelete}
                        onView={handleViewProduct}
                        onEdit={handleEditProduct}
                      />
                    ))}
                  </div>
                )}
              </CollapsibleCard>
            )}

            {/* 6. MEDICINES & PHARMACY (COLLAPSIBLE CARD - RELOCATED TO CLEAN ACCORDION) */}
            {(activeTab === 'all' || activeTab === 'medicines') && (
              <CollapsibleCard
                id="medicines"
                isOpen={!collapsedSections['medicines']}
                onToggle={() => toggleSection('medicines')}
                theme="purple"
                title="Medicines & Pharmacy"
                subtitle="Track daily doses, active ingredients, batch numbers, and food timing"
                icon={<FaPills />}
                iconBg="bg-purple-100 text-purple-700"
                count={medicineItems.length}
                badge={`${medicineItems.length} medicines`}
                badgeColor="bg-purple-50 text-purple-700 border-purple-200"
                previewSummary={
                  medicineItems.length > 0
                    ? medicineItems.map(i => i.name).slice(0, 4).join(', ') + (medicineItems.length > 4 ? ` (+${medicineItems.length - 4} more)` : '')
                    : 'No medicines added yet'
                }
                headerActions={
                  onViewMedicines ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewMedicines();
                      }}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors border border-purple-200"
                    >
                      <span>Full View</span>
                      <FaExternalLinkAlt size={9} />
                    </button>
                  ) : null
                }
              >
                {medicineItems.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center my-2">
                    <p className="text-sm font-bold text-slate-700 mb-1">No medicines in inventory</p>
                    <p className="text-xs text-slate-400">Add medicines with daily dosages, timing, and expiry dates.</p>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 my-2">
                      {(activeTab === 'all' ? medicineItems.slice(0, 4) : medicineItems).map(item => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onDelete={handleDelete}
                          onView={handleViewProduct}
                          onEdit={handleEditProduct}
                        />
                      ))}
                    </div>

                    {medicineItems.length > 4 && activeTab === 'all' && onViewMedicines && (
                      <div className="flex justify-center pt-3 mt-2 border-t border-slate-100">
                        <button
                          onClick={onViewMedicines}
                          className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors border border-purple-200"
                        >
                          <span>View all {medicineItems.length} medicines in dedicated pharmacy tab</span>
                          <FaChevronRight size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </CollapsibleCard>
            )}

            {/* 7. PANTRY & GROCERIES (COLLAPSIBLE CARD - RELOCATED TO CLEAN ACCORDION) */}
            {(activeTab === 'all' || activeTab === 'groceries') && (
              <CollapsibleCard
                id="groceries"
                isOpen={!collapsedSections['groceries']}
                onToggle={() => toggleSection('groceries')}
                theme="indigo"
                title="Pantry & Groceries"
                subtitle="Fresh foods, staples, household goods, and packaged supplies"
                icon={<FaBoxes />}
                iconBg="bg-indigo-100 text-indigo-700"
                count={groceryItems.length}
                badge={`${groceryItems.length} groceries`}
                badgeColor="bg-indigo-50 text-indigo-700 border-indigo-200"
                previewSummary={
                  groceryItems.length > 0
                    ? groceryItems.map(i => i.name).slice(0, 4).join(', ') + (groceryItems.length > 4 ? ` (+${groceryItems.length - 4} more)` : '')
                    : 'No groceries added yet'
                }
                headerActions={
                  onViewInventory ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewInventory();
                      }}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors border border-indigo-200"
                    >
                      <span>Full View</span>
                      <FaExternalLinkAlt size={9} />
                    </button>
                  ) : null
                }
              >
                {groceryItems.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center my-2">
                    <p className="text-sm font-bold text-slate-700 mb-1">No groceries in inventory</p>
                    <p className="text-xs text-slate-400">Scan or add pantry items to track food stock and expiry.</p>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 my-2">
                      {(activeTab === 'all' ? groceryItems.slice(0, 4) : groceryItems).map(item => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          onDelete={handleDelete}
                          onView={handleViewProduct}
                          onEdit={handleEditProduct}
                        />
                      ))}
                    </div>

                    {groceryItems.length > 4 && activeTab === 'all' && onViewInventory && (
                      <div className="flex justify-center pt-3 mt-2 border-t border-slate-100">
                        <button
                          onClick={onViewInventory}
                          className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors border border-indigo-200"
                        >
                          <span>View all {groceryItems.length} groceries in All Inventory list</span>
                          <FaChevronRight size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </CollapsibleCard>
            )}
          </div>
        );
      })()}

      {/* Product Detail Modal */}
      {selectedItemForModal && (
        <ProductDetailModal
          item={selectedItemForModal}
          onClose={() => setSelectedItemForModal(null)}
          onDelete={handleDelete}
          onEdit={handleEditProduct}
          onItemUpdated={() => {
            // LiveQuery automatically updates
          }}
        />
      )}

      {/* Edit Product Modal */}
      <EditProductModal
        item={localEditingItem}
        isOpen={!!localEditingItem}
        onClose={() => setLocalEditingItem(null)}
      />
    </div>
  );
};

export default Dashboard;
