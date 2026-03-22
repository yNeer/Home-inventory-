import { useState } from 'react';
import Dashboard from './components/Dashboard';
import AddItem from './components/AddItem';
import { HealthPlan, Profile, Notifications, Medicines } from './components';
import { FaHome, FaHeartbeat, FaUserCircle, FaPlus, FaBell, FaPills, FaDownload } from 'react-icons/fa';
import { usePWAInstall } from './hooks/usePWAInstall';
import './App.css';

type ViewState = 'dashboard' | 'health' | 'profile' | 'add' | 'notifications' | 'medicines';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [addItemType, setAddItemType] = useState<'grocery' | 'medicine'>('grocery');
  const { isInstallable, installPWA } = usePWAInstall();

  const handleAddNew = (type: 'grocery' | 'medicine' = 'grocery') => {
    setAddItemType(type);
    setCurrentView('add');
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
        return <Dashboard onAddNew={() => handleAddNew('grocery')} onNotifications={() => setCurrentView('notifications')} />;
      case 'medicines':
        return <Medicines onAddNew={() => handleAddNew('medicine')} />;
      case 'health':
        return <HealthPlan />;
      case 'profile':
        return <Profile />;
      case 'notifications':
        return <Notifications />;
      case 'add':
        return <AddItem onBack={() => setCurrentView('dashboard')} initialType={addItemType} />;
      default:
        return <Dashboard onAddNew={() => handleAddNew('grocery')} onNotifications={() => setCurrentView('notifications')} />;
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#F8F9FE] flex flex-col md:flex-row font-sans overflow-hidden">

      {/* Desktop Sidebar Navigation */}
      {currentView !== 'add' && (
        <aside className="hidden md:flex flex-col w-64 bg-white/80 backdrop-blur-xl border-r border-slate-100 shadow-[8px_0_30px_rgb(0,0,0,0.02)] z-50 h-[100dvh]">
          <div className="p-8 pb-4">
             <h1 className="text-3xl font-extrabold text-[#1a1b41] tracking-tight leading-none drop-shadow-sm">Inventory.</h1>
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
            <button onClick={() => setCurrentView('health')} className={`flex items-center gap-4 w-full px-6 py-4 rounded-2xl font-bold transition-all ${currentView === 'health' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <FaHeartbeat size={20} className={currentView === 'health' ? 'drop-shadow-sm' : ''} />
              <span>Health Plan</span>
            </button>
            <button onClick={() => setCurrentView('profile')} className={`flex items-center gap-4 w-full px-6 py-4 rounded-2xl font-bold transition-all ${currentView === 'profile' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <FaUserCircle size={20} className={currentView === 'profile' ? 'drop-shadow-sm' : ''} />
              <span>Profile</span>
            </button>
          </div>

          <div className="p-6 flex flex-col gap-3">
            {isInstallable && (
              <button
                onClick={installPWA}
                className="w-full h-14 bg-white text-blue-600 border-2 border-blue-100 rounded-2xl shadow-sm flex items-center justify-center gap-2 font-bold hover:bg-blue-50 transition-colors active:scale-95"
              >
                <FaDownload size={16} />
                <span>Install App</span>
              </button>
            )}
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
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${currentView === 'dashboard' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <FaHome size={22} className={currentView === 'dashboard' ? 'scale-110 drop-shadow-sm' : ''} />
                <span className="text-[10px] font-bold mt-1 tracking-wider uppercase hidden sm:block">Home</span>
              </button>

              <button
                onClick={() => setCurrentView('medicines')}
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
                onClick={() => setCurrentView('health')}
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${currentView === 'health' ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <FaHeartbeat size={22} className={currentView === 'health' ? 'scale-110 drop-shadow-sm' : ''} />
                <span className="text-[10px] font-bold mt-1 tracking-wider uppercase hidden sm:block">Plan</span>
              </button>

              <button
                onClick={() => setCurrentView('profile')}
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all ${currentView === 'profile' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <FaUserCircle size={22} className={currentView === 'profile' ? 'scale-110 drop-shadow-sm' : ''} />
                <span className="text-[10px] font-bold mt-1 tracking-wider uppercase hidden sm:block">Me</span>
              </button>
            </div>
          </nav>
        )}
      </main>
    </div>
  );
}

export default App;
