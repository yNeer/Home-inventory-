import { useState } from 'react';
import Dashboard from './components/Dashboard';
import AddItem from './components/AddItem';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  return (
    <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
      {currentView === 'dashboard' ? (
        <Dashboard onAddNew={() => setCurrentView('add')} />
      ) : (
        <AddItem onBack={() => setCurrentView('dashboard')} />
      )}
    </div>
  );
}

export default App;
