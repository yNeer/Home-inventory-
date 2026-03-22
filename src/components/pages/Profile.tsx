import React from 'react';
import { FaUserCircle, FaCog, FaSignOutAlt, FaShieldAlt } from 'react-icons/fa';

export const Profile: React.FC = () => {
  return (
    <div className="min-h-full px-6 pt-safe pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-10 mt-6 sm:mt-8 relative">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-indigo-400 tracking-widest uppercase mb-1 drop-shadow-sm">Account</span>
          <h1 className="text-4xl font-extrabold text-[#1a1b41] tracking-tight leading-none drop-shadow-sm">
            Profile.
          </h1>
        </div>
      </header>

      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-4xl shadow-xl shadow-indigo-200 mb-4 border-4 border-white">
          <FaUserCircle />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">John Doe</h2>
        <p className="text-slate-400 font-medium">user@example.com</p>
      </div>

      <div className="bg-white rounded-[28px] p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col gap-1">
        <button className="flex items-center gap-4 w-full p-4 rounded-[20px] hover:bg-slate-50 transition-colors text-left active:bg-slate-100">
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
            <FaCog size={18} />
          </div>
          <span className="font-bold text-slate-700 flex-1">Settings</span>
        </button>
        <button className="flex items-center gap-4 w-full p-4 rounded-[20px] hover:bg-slate-50 transition-colors text-left active:bg-slate-100">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
            <FaShieldAlt size={18} />
          </div>
          <span className="font-bold text-slate-700 flex-1">Privacy & Security</span>
        </button>
        <button className="flex items-center gap-4 w-full p-4 rounded-[20px] hover:bg-slate-50 transition-colors text-left active:bg-slate-100">
          <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
            <FaSignOutAlt size={18} />
          </div>
          <span className="font-bold text-rose-600 flex-1">Sign Out</span>
        </button>
      </div>
    </div>
  );
};
