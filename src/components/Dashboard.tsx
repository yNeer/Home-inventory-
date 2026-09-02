import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, InventoryItem } from '../db';
import { FaBoxOpen, FaSearch, FaBell, FaDownload, FaSpinner, FaTimes, FaSearchPlus } from 'react-icons/fa';
import { ItemCard } from './cards/ItemCard';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { FaChevronRight } from 'react-icons/fa';
import { ProductDetailModal } from './modals/ProductDetailModal';

interface DashboardProps {
  onAddNew: () => void;
  onNotifications?: () => void;
  onViewInventory?: () => void;
  onViewMedicines?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onAddNew, onNotifications, onViewInventory, onViewMedicines }) => {
  const items = useLiveQuery(() => db.items.toArray(), []);
  const [searchQuery, setSearchQuery] = useState('');
  const { isInstallable, installPWA, isInstalled } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState<InventoryItem | null>(null);

  // Memoize filtered and categorized items
  const { filteredItems, expiringItems, medicineItems, groceryItems } = useMemo(() => {
    if (!items) return { filteredItems: [], expiringItems: [], medicineItems: [], groceryItems: [] };

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    const thirtyDaysFromNowTime = thirtyDaysFromNow.getTime();

    const query = searchQuery.trim().toLowerCase();

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

    const itemsWithTimestamp = filtered.map(item => ({
      ...item,
      expiryTimestamp: item.expiryDate ? new Date(item.expiryDate).getTime() : null
    }));

    const expiring = itemsWithTimestamp
      .filter(item => item.expiryTimestamp !== null && item.expiryTimestamp <= thirtyDaysFromNowTime)
      .sort((a, b) => (a.expiryTimestamp as number) - (b.expiryTimestamp as number));

    const medicines = filtered.filter(item => item.type === 'medicine');
    const groceries = filtered.filter(item => item.type === 'grocery');

    return {
      filteredItems: filtered,
      expiringItems: expiring,
      medicineItems: medicines,
      groceryItems: groceries
    };
  }, [items, searchQuery]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await db.items.delete(id);
      if (selectedItemForModal?.id === id) {
        setSelectedItemForModal(null);
      }
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
        <div className="flex gap-3">
          {!isInstalled && isInstallable && (
            <button
              onClick={async () => {
                setIsInstalling(true);
                await installPWA();
                setIsInstalling(false);
              }}
              disabled={isInstalling}
              className="md:hidden w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-blue-100 hover:bg-blue-100 transition-colors relative"
              aria-label="Install App"
            >
              {isInstalling ? <FaSpinner className="animate-spin" size={18} /> : <FaDownload size={18} />}
            </button>
          )}
          <button
            onClick={onNotifications}
            aria-label="Notifications"
            className="md:hidden w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-400 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:text-indigo-500 transition-colors relative"
          >
            <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white z-10"></div>
            <FaBell size={20} />
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <FaSearch className="text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search by product name, batch no, barcode, details..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white rounded-2xl py-4 pl-12 pr-12 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 transition-all"
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

      {/* Summary Cards (Only show if not searching or when search is empty) */}
      {!searchQuery && (
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
              <div className="text-4xl md:text-5xl font-extrabold tracking-tight">{expiringItems.length}</div>
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
      )}

      {/* Content Area */}
      {(() => {
        if (!items) return null;

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

        // Active Search View
        if (searchQuery.trim()) {
          return (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                  <span>Search Results for "{searchQuery}"</span>
                  <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full">
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
                <div className="text-center py-16 bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaSearch size={24} />
                  </div>
                  <p className="text-xl font-bold text-slate-800 mb-2">No products matched</p>
                  <p className="text-sm text-slate-400 font-medium max-w-sm mx-auto">
                    Try searching by batch number, category, barcode, or medicine name.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredItems.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onDelete={handleDelete}
                      onView={(itm) => setSelectedItemForModal(itm)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        }

        // Default Categorized View
        const renderSection = (title: string, data: any[], viewMoreHandler?: () => void) => {
          if (data.length === 0) return null;
          const displayItems = data.slice(0, 4);
          const hasMore = data.length > 4;

          return (
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>
                {hasMore && viewMoreHandler && (
                  <button
                    onClick={viewMoreHandler}
                    className="text-sm font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-full transition-colors"
                  >
                    View All <FaChevronRight size={10} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayItems.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onDelete={handleDelete}
                    onView={(itm) => setSelectedItemForModal(itm)}
                  />
                ))}
              </div>
            </div>
          );
        };

        return (
          <div className="flex flex-col gap-2">
            {renderSection("Near Expiry", expiringItems, onViewInventory)}
            {renderSection("Medicines", medicineItems, onViewMedicines)}
            {renderSection("Groceries", groceryItems, onViewInventory)}

            {expiringItems.length === 0 && medicineItems.length === 0 && groceryItems.length === 0 && (
              <div className="text-center py-10">
                <p className="text-slate-500 font-medium">No items match your criteria.</p>
              </div>
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
        />
      )}
    </div>
  );
};

export default Dashboard;
