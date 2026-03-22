import React from 'react';
import { FaBell, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';

export const Notifications: React.FC = () => {
  return (
    <div className="min-h-full px-6 pt-safe pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-10 mt-6 sm:mt-8 relative flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-rose-400 tracking-widest uppercase mb-1 drop-shadow-sm">Alerts</span>
          <h1 className="text-4xl font-extrabold text-[#1a1b41] tracking-tight leading-none drop-shadow-sm">
            Notifications.
          </h1>
        </div>
        <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shadow-sm border border-rose-100">
          <FaBell size={20} className="animate-pulse" />
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <div className="bg-rose-50 rounded-[28px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-rose-100 relative overflow-hidden group hover:scale-[1.01] transition-transform cursor-pointer">
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

        <div className="bg-indigo-50 rounded-[28px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-indigo-100 relative overflow-hidden group hover:scale-[1.01] transition-transform cursor-pointer">
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

        <div className="text-center py-10">
          <p className="text-sm text-slate-400 font-medium tracking-wide">You're all caught up!</p>
        </div>
      </div>
    </div>
  );
};
