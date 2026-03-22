import React from 'react';
import { FaHome, FaHeart, FaPlus, FaCalendarAlt, FaUser } from 'react-icons/fa';

interface BottomNavigationProps {
  currentView: 'dashboard' | 'add';
  onNavigate: (view: 'dashboard' | 'add') => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentView, onNavigate }) => {
  return (
    <div className="absolute bottom-0 w-full h-[88px] bg-white/90 backdrop-blur-2xl border-t border-gray-100 flex justify-around items-start pt-3 px-6 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-40 rounded-t-[32px]">
      <button
        onClick={() => onNavigate('dashboard')}
        className={`flex flex-col items-center justify-center transition-all duration-300 ${currentView === 'dashboard' ? 'text-indigo-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <div className={`p-2 rounded-2xl ${currentView === 'dashboard' ? 'bg-indigo-50' : ''}`}>
           <FaHome className="text-[22px]" />
        </div>
        <span className="text-[10px] font-semibold mt-1 tracking-wide">Home</span>
      </button>

      <button className="flex flex-col items-center justify-center transition-all duration-300 text-gray-400 hover:text-gray-600">
        <div className="p-2 rounded-2xl">
           <FaCalendarAlt className="text-[22px]" />
        </div>
        <span className="text-[10px] font-semibold mt-1 tracking-wide">Plan</span>
      </button>

      <div className="relative -mt-8 flex justify-center w-16">
        <button
           onClick={() => onNavigate('add')}
           className="absolute flex items-center justify-center w-[60px] h-[60px] bg-gradient-to-tr from-indigo-500 to-purple-500 text-white rounded-[24px] shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 active:scale-95 border-2 border-white"
        >
          <FaPlus className="text-2xl" />
        </button>
      </div>

      <button className="flex flex-col items-center justify-center transition-all duration-300 text-gray-400 hover:text-gray-600">
        <div className="p-2 rounded-2xl">
           <FaHeart className="text-[22px]" />
        </div>
        <span className="text-[10px] font-semibold mt-1 tracking-wide">Health</span>
      </button>

      <button className="flex flex-col items-center justify-center transition-all duration-300 text-gray-400 hover:text-gray-600">
        <div className="p-2 rounded-2xl">
           <FaUser className="text-[22px]" />
        </div>
        <span className="text-[10px] font-semibold mt-1 tracking-wide">Profile</span>
      </button>
    </div>
  );
};
