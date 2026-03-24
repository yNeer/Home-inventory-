import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { FaBoxOpen, FaPlus, FaSearch, FaBell, FaDownload, FaSpinner } from 'react-icons/fa';
import { ItemCard } from './cards/ItemCard';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { FaChevronRight } from 'react-icons/fa';
import { EditItemModal } from './EditItemModal';
import { InventoryItem } from '../db';
import { cancelLocalNotifications } from '../utils/notifications';

interface DashboardProps {
  onAddNew: () => void;
  onNotifications?: () => void;
  onViewInventory?: () => void;
  onViewMedicines?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onAddNew, onNotifications, onViewInventory, onViewMedicines }) => {
  const items = useLiveQuery(() => db.items.toArray(), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const { isInstallable, installPWA, isInstalled } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await cancelLocalNotifications(id);
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

        const renderSection = (title: string, data: typeof items, viewMoreHandler?: () => void) => {
          if (data.length === 0) return null;
          const displayItems = data.slice(0, 5);
          const hasMore = data.length > 5;

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
                  <div key={item.id} onClick={() => setEditingItem(item)} className="cursor-pointer">
                     <ItemCard item={item} onDelete={handleDelete} />
                  </div>
                ))}
              </div>
            </div>
          );
        };

        // Categorize items
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        const expiringItems = filteredItems.filter(item => {
          if (!item.expiryDate) return false;
          const expiry = new Date(item.expiryDate);
          return expiry <= thirtyDaysFromNow;
        }).sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());

        const medicineItems = filteredItems.filter(item => item.type === 'medicine');
        const groceryItems = filteredItems.filter(item => item.type === 'grocery');

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

      {editingItem && (
         <EditItemModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onUpdate={() => {}}
         />
      )}
    </div>
  );
};

export default Dashboard;
