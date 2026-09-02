import { useState } from 'react';
import Dashboard from './components/Dashboard';
import AddItem from './components/AddItem';
import { InventoryList, Profile, Notifications, Medicines, ItemDetailPage } from './components';
import { EditProductModal } from './components/modals/EditProductModal';
import { FaHome, FaBoxOpen, FaUserCircle, FaPlus, FaBell, FaPills, FaDownload } from 'react-icons/fa';
import { usePWAInstall } from './hooks/usePWAInstall';
import { AppLogo } from './components/ui/AppLogo';
import { InventoryItem } from './db';
import './App.css';

type ViewState = 'dashboard' | 'inventory' | 'profile' | 'add' | 'notifications' | 'medicines' | 'item-detail';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [previousView, setPreviousView] = useState<ViewState>('dashboard');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedItemFallback, setSelectedItemFallback] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [addItemType, setAddItemType] = useState<'grocery' | 'medicine'>('grocery');
  const { isInstallable, installPWA } = usePWAInstall();

  const handleAddNew = (type: 'grocery' | 'medicine' = 'grocery') => {
    setAddItemType(type);
    setPreviousView(currentView);
    setCurrentView('add');
  };

  const handleOpenItemDetail = (item: InventoryItem) => {
    setSelectedItemId(item.id || null);
    setSelectedItemFallback(item);
    setPreviousView(currentView);
    setCurrentView('item-detail');
  };

  // Read PWA Shortcut actions from URL
  useState(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const action = searchParams.get('action');
    if (action === 'scan_medicine') {
      setCurrentView('add');
      setAddItemType('medicine');
    } else if (action === 'view_medicines') {
      setCurrentView('medicines');
    }
    // Clean up URL so it doesn't stay in history
    if (action) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  });

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            onAddNew={() => handleAddNew('grocery')}
            onNotifications={() => setCurrentView('notifications')}
            onViewInventory={() => setCurrentView('inventory')}
            onViewMedicines={() => setCurrentView('medicines')}
            onViewItem={handleOpenItemDetail}
            onEdit={setEditingItem}
          />
        );
      case 'item-detail':
        return (
          <ItemDetailPage
            itemId={selectedItemId}
            fallbackItem={selectedItemFallback}
            onBack={() => setCurrentView(previousView === 'item-detail' ? 'dashboard' : previousView)}
            onItemDeleted={() => setCurrentView(previousView === 'item-detail' ? 'dashboard' : previousView)}
            onEdit={setEditingItem}
          />
        );
      case 'medicines':
        return (
          <Medicines
            onAddNew={() => handleAddNew('medicine')}
            onViewItem={handleOpenItemDetail}
            onEdit={setEditingItem}
          />
        );
      case 'inventory':
        return (
          <InventoryList
            onViewItem={handleOpenItemDetail}
            onEdit={setEditingItem}
          />
        );
      case 'profile':
        return <Profile />;
      case 'notifications':
        return <Notifications />;
      case 'add':
        return <AddItem onBack={() => setCurrentView(previousView === 'add' ? 'dashboard' : previousView)} initialType={addItemType} />;
      default:
        return (
          <Dashboard
            onAddNew={() => handleAddNew('grocery')}
            onNotifications={() => setCurrentView('notifications')}
            onViewInventory={() => setCurrentView('inventory')}
            onViewMedicines={() => setCurrentView('medicines')}
            onViewItem={handleOpenItemDetail}
            onEdit={setEditingItem}
          />
        );
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#F8F9FE] flex flex-col md:flex-row font-sans overflow-hidden">

      {/* Desktop Sidebar Navigation */}
      {currentView !== 'add' && (
        <aside className="hidden md:flex flex-col w-64 bg-white/80 backdrop-blur-xl border-r border-slate-100 shadow-[8px_0_30px_rgb(0,0,0,0.02)] z-50 h-[100dvh]">
          <div className="p-8 pb-4 flex items-center gap-3">
             <AppLogo className="w-10 h-10 drop-shadow-md" />
             <h1 className="text-3xl font-extrabold text-[#1a1b41] tracking-tight leading-none drop-shadow-sm">Invent.</h1>
          </div>

          <div className="flex-1 px-4 py-8 space-y-2">
            <button onClick={() => setCurrentView('dashboard')} className={`flex items-center gap-4 w-full px-6 py-4 rounded-2xl font-bold transition-all ${currentView === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <FaHome size={20} className={currentView === 'dashboard' ? 'drop-shadow-sm' : ''} />
              <span>Dashboard</span>
            </button>
            <button onClick={() => setCurrentView('medicines')} className={`flex items-center gap-4 w-full px-6 py-4 rounded-2xl font-bold transition-all ${currentView === 'medicines' ? 'bg-rose-50 text-rose-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <FaPills size={20} className={currentView === 'medicines' ? 'drop-shadow-sm' : ''} />
              <span>Medicines</span>
            </button>
            <button onClick={() => setCurrentView('inventory')} className={`flex items-center gap-4 w-full px-6 py-4 rounded-2xl font-bold transition-all ${currentView === 'inventory' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <FaBoxOpen size={20} className={currentView === 'inventory' ? 'drop-shadow-sm' : ''} />
              <span>Inventory</span>
            </button>
            <button onClick={() => setCurrentView('profile')} className={`flex items-center gap-4 w-full px-6 py-4 rounded-2xl font-bold transition-all ${currentView === 'profile' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <FaUserCircle size={20} className={currentView === 'profile' ? 'drop-shadow-sm' : ''} />
              <span>Profile</span>
            </button>
          </div>

          <div className="p-6 flex flex-col gap-3">
            <button
              onClick={async () => {
                if (isInstallable) {
                  await installPWA();
                } else {
                  setCurrentView('profile'); // Send them to profile where manual install instructions are shown.
                }
              }}
              className="w-full h-14 bg-white text-blue-600 border-2 border-blue-100 rounded-2xl shadow-sm flex items-center justify-center gap-2 font-bold hover:bg-blue-50 transition-colors active:scale-95"
            >
              <FaDownload size={16} />
              <span>Install App</span>
            </button>
            <button
              onClick={() => handleAddNew('grocery')}
              className="w-full h-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-3 font-bold hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95"
            >
              <FaPlus size={18} />
              <span>Scan Item</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full h-[100dvh] relative bg-transparent flex flex-col">
        <div className={`flex-1 overflow-y-auto overflow-x-hidden ${currentView !== 'add' ? 'pb-24 md:pb-0' : ''}`}>
          {renderView()}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        {currentView !== 'add' && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-white/80 backdrop-blur-xl border-t border-slate-100 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] pb-safe z-50">
            <div className="flex items-center justify-around h-20 px-2 sm:px-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                aria-label="Home"
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${currentView === 'dashboard' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <FaHome size={22} className={currentView === 'dashboard' ? 'scale-110 drop-shadow-sm' : ''} />
                <span className="text-[10px] font-bold mt-1 tracking-wider uppercase hidden sm:block">Home</span>
              </button>

              <button
                onClick={() => setCurrentView('medicines')}
                aria-label="Medicines"
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${currentView === 'medicines' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <FaPills size={22} className={currentView === 'medicines' ? 'scale-110 drop-shadow-sm' : ''} />
                <span className="text-[10px] font-bold mt-1 tracking-wider uppercase hidden sm:block">Meds</span>
              </button>

              {/* Center FAB-style Scan Button */}
              <div className="relative -top-6">
                <button
                  onClick={() => handleAddNew('grocery')}
                  className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center hover:bg-indigo-700 hover:scale-105 transition-all active:scale-95 border-[4px] border-white"
                  aria-label="Scan Medicine or Grocery"
                >
                  <FaPlus size={24} />
                </button>
              </div>

              <button
                onClick={() => setCurrentView('inventory')}
                aria-label="Inventory"
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${currentView === 'inventory' ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <FaBoxOpen size={22} className={currentView === 'inventory' ? 'scale-110 drop-shadow-sm' : ''} />
                <span className="text-[10px] font-bold mt-1 tracking-wider uppercase hidden sm:block">Items</span>
              </button>

              <button
                onClick={() => setCurrentView('profile')}
                aria-label="Profile"
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${currentView === 'profile' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <FaUserCircle size={22} className={currentView === 'profile' ? 'scale-110 drop-shadow-sm' : ''} />
                <span className="text-[10px] font-bold mt-1 tracking-wider uppercase hidden sm:block">Me</span>
              </button>
            </div>
          </nav>
        )}

        {/* Global Edit Product Modal */}
        <EditProductModal
          item={editingItem}
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
        />
      </main>
    </div>
  );
}

export default App;
