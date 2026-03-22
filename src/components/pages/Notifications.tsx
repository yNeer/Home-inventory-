import React from 'react';
import { FaBell, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';

export const Notifications: React.FC = () => {
  return (
    <div className="min-h-full px-6 md:px-10 lg:px-12 pt-safe pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-7xl mx-auto">
      <header className="mb-10 mt-6 sm:mt-8 relative flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-rose-400 tracking-widest uppercase mb-1 drop-shadow-sm">Alerts</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1b41] tracking-tight leading-none drop-shadow-sm">
            Notifications.
          </h1>
        </div>
        <div className="w-12 h-12 md:w-16 md:h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shadow-sm border border-rose-100">
          <FaBell className="text-xl md:text-2xl animate-pulse" />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-rose-50 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-rose-100 relative overflow-hidden group hover:-translate-y-1 transition-transform cursor-pointer col-span-1">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-rose-500 shadow-sm shrink-0">
              <FaExclamationCircle size={24} />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="font-extrabold text-slate-800 text-lg mb-1 leading-tight group-hover:text-rose-600 transition-colors">Milk Expiring Soon</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Your organic milk is set to expire in 2 days. Consider consuming or freezing it.</p>
              <span className="text-xs font-bold text-rose-400 mt-3 inline-block uppercase tracking-widest">2 hours ago</span>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-indigo-100 relative overflow-hidden group hover:-translate-y-1 transition-transform cursor-pointer col-span-1">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
              <FaInfoCircle size={24} />
            </div>
            <div className="flex-1 pt-1">
              <h3 className="font-extrabold text-slate-800 text-lg mb-1 leading-tight group-hover:text-indigo-600 transition-colors">Monthly Restock Reminder</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Time to check your pantry for basic supplies. You're running low on pasta.</p>
              <span className="text-xs font-bold text-indigo-400 mt-3 inline-block uppercase tracking-widest">1 day ago</span>
            </div>
          </div>
        </div>

        <div className="text-center py-10 col-span-1 md:col-span-2 lg:col-span-3">
          <p className="text-sm text-slate-400 font-bold tracking-widest uppercase">You're all caught up!</p>
        </div>
      </div>
    </div>
  );
};
