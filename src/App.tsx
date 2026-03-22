import { useState } from 'react';
import Dashboard from './components/Dashboard';
import AddItem from './components/AddItem';
import { HealthPlan, Profile, Notifications } from './components';
import { FaHome, FaHeartbeat, FaUserCircle, FaPlus, FaBell } from 'react-icons/fa';
import './App.css';

type ViewState = 'dashboard' | 'health' | 'profile' | 'add' | 'notifications';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onAddNew={() => setCurrentView('add')} onNotifications={() => setCurrentView('notifications')} />;
      case 'health':
        return <HealthPlan />;
      case 'profile':
        return <Profile />;
      case 'notifications':
        return <Notifications />;
      case 'add':
        return <AddItem onBack={() => setCurrentView('dashboard')} />;
      default:
        return <Dashboard onAddNew={() => setCurrentView('add')} onNotifications={() => setCurrentView('notifications')} />;
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#F8F9FE] flex flex-col font-sans">
      <div className="flex-1 w-full max-w-2xl mx-auto h-full relative shadow-2xl bg-white/40 pb-20">

        {/* Main Content Area */}
        <div className="h-full overflow-y-auto overflow-x-hidden">
          {renderView()}
        </div>

        {/* Global Bottom Navigation Bar */}
        {currentView !== 'add' && (
          <nav className="fixed bottom-0 left-0 right-0 w-full max-w-2xl mx-auto bg-white/80 backdrop-blur-xl border-t border-slate-100 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] pb-safe z-50">
            <div className="flex items-center justify-around h-20 px-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${currentView === 'dashboard' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <FaHome size={24} className={currentView === 'dashboard' ? 'scale-110 drop-shadow-sm' : ''} />
                <span className="text-[10px] font-bold mt-1 tracking-wider uppercase">Home</span>
              </button>

              <button
                onClick={() => setCurrentView('health')}
                className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${currentView === 'health' ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <FaHeartbeat size={24} className={currentView === 'health' ? 'scale-110 drop-shadow-sm' : ''} />
                <span className="text-[10px] font-bold mt-1 tracking-wider uppercase">Plan</span>
              </button>

              {/* Center FAB-style Scan Button */}
              <div className="relative -top-6">
                <button
                  onClick={() => setCurrentView('add')}
                  className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center hover:bg-indigo-700 hover:scale-105 transition-all active:scale-95 border-[4px] border-white"
                  aria-label="Scan Medicine or Grocery"
                >
                  <FaPlus size={24} />
                </button>
              </div>

              <button
                onClick={() => setCurrentView('notifications')}
                className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${currentView === 'notifications' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <FaBell size={24} className={currentView === 'notifications' ? 'scale-110 drop-shadow-sm' : ''} />
                <span className="text-[10px] font-bold mt-1 tracking-wider uppercase">Alerts</span>
              </button>

              <button
                onClick={() => setCurrentView('profile')}
                className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${currentView === 'profile' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <FaUserCircle size={24} className={currentView === 'profile' ? 'scale-110 drop-shadow-sm' : ''} />
                <span className="text-[10px] font-bold mt-1 tracking-wider uppercase">Me</span>
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}

export default App;
