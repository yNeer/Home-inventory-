import { useState } from 'react';
import Dashboard from './components/Dashboard';
import AddItem from './components/AddItem';
import { BottomNavigation } from './components/layout/BottomNavigation';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'add'>('dashboard');

  return (
    <div className="h-[100dvh] w-full bg-[#1a1b41] flex items-center justify-center font-sans sm:p-4 md:p-8">
      {/* Mobile Device Container (Phone Shell for Desktop Preview) */}
      <div className="w-full h-full sm:max-w-[428px] sm:max-h-[926px] bg-[#F8F9FE] sm:rounded-[55px] shadow-[0_30px_100px_rgb(0,0,0,0.5)] flex flex-col relative overflow-hidden ring-[14px] ring-[#1a1b41] sm:border-[8px] sm:border-black/10">

        <div className="flex-1 overflow-y-auto no-scrollbar relative w-full h-full">
          {currentView === 'dashboard' ? (
            <Dashboard />
          ) : (
            <AddItem onBack={() => setCurrentView('dashboard')} />
          )}
        </div>

        <BottomNavigation currentView={currentView} onNavigate={setCurrentView} />

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-slate-300 rounded-full z-[100]"></div>
      </div>
    </div>
  );
}

export default App;
