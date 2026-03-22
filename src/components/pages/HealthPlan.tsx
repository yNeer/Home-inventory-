import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { FaHeartbeat, FaPills, FaCheckCircle, FaDownload } from 'react-icons/fa';

export const HealthPlan: React.FC = () => {
  const { isInstallable, installPWA } = usePWAInstall();
  const [completedDoses, setCompletedDoses] = useState<number[]>([]);

  // Fetch medicines that have a daily dose set
  const medicines = useLiveQuery(
    () => db.items.where('type').equals('medicine').filter(m => !!m.dailyDose && !!m.totalQuantity).toArray(),
    []
  );

  const toggleDose = (id: number) => {
     setCompletedDoses(prev =>
       prev.includes(id) ? prev.filter(doseId => doseId !== id) : [...prev, id]
     );
  };
  return (
    <div className="min-h-full px-6 md:px-10 lg:px-12 pt-safe pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-7xl mx-auto">
      <header className="mb-10 mt-6 sm:mt-8 relative">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-emerald-400 tracking-widest uppercase mb-1 drop-shadow-sm">Wellness</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1b41] tracking-tight leading-none drop-shadow-sm">
            Health Plan.
          </h1>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        <div className="col-span-1 flex flex-col gap-6">
          {/* Progress Card */}
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[32px] p-8 text-white shadow-lg shadow-emerald-200 relative overflow-hidden flex flex-col justify-center min-h-[200px] md:min-h-[260px]">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="relative z-10 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                <FaHeartbeat size={40} className="text-white drop-shadow-md" />
              </div>
              <div>
                <div className="text-emerald-50 font-bold uppercase tracking-widest text-[10px] md:text-xs mb-2">Daily Streak</div>
                <div className="text-6xl font-extrabold tracking-tight">12 <span className="text-3xl text-emerald-200">Days</span></div>
              </div>
            </div>
          </div>

          {/* Install App Button Block */}
          {isInstallable && (
            <button
              onClick={installPWA}
              className="bg-white border-2 border-emerald-100 hover:border-emerald-200 hover:bg-emerald-50 text-emerald-600 rounded-[32px] p-6 flex flex-col items-center justify-center text-center transition-all shadow-sm group active:scale-95"
            >
              <FaDownload className="text-3xl mb-3 group-hover:scale-110 transition-transform" />
              <span className="font-extrabold text-lg">Install App</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Get Daily Reminders</span>
            </button>
          )}
        </div>

        {/* Today's Meds (Dynamic) */}
        <div className="col-span-1 md:col-span-2">
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-6 tracking-tight px-1">Today's Schedule</h2>

          {(!medicines || medicines.length === 0) ? (
             <div className="bg-white rounded-[32px] p-8 text-center border border-slate-100 shadow-sm flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                   <FaPills size={32} />
                </div>
                <p className="text-lg font-bold text-slate-700">No active prescriptions</p>
                <p className="text-sm text-slate-400 mt-2 max-w-xs leading-relaxed">Add a medicine with "Total Tablets" and "Daily Dose" to track your health plan.</p>
             </div>
          ) : (
            <div className="flex flex-col gap-4">
              {medicines.map((med) => {
                const isDone = med.id && completedDoses.includes(med.id);
                // Calculate supply
                const remainingDays = med.totalQuantity && med.dailyDose ? Math.floor(med.totalQuantity / med.dailyDose) : 0;
                let supplyColor = 'text-slate-400 bg-slate-100';
                if (remainingDays <= 3) supplyColor = 'text-rose-600 bg-rose-50 border border-rose-200';
                else if (remainingDays <= 7) supplyColor = 'text-orange-600 bg-orange-50 border border-orange-200';
                else supplyColor = 'text-emerald-600 bg-emerald-50 border border-emerald-200';

                return (
                  <div key={med.id} onClick={() => med.id && toggleDose(med.id)} className="bg-white rounded-[24px] p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
                      <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center shrink-0 transition-colors ${isDone ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100'}`}>
                        {isDone ? <FaCheckCircle size={24} /> : <FaPills size={24} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-lg truncate transition-colors ${isDone ? 'text-slate-400 line-through decoration-2' : 'text-slate-800'}`}>{med.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[11px] font-extrabold text-indigo-500 tracking-wider">Take {med.dailyDose}</span>
                           <span className="text-slate-300">•</span>
                           <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full ${supplyColor}`}>{remainingDays} Days Left</span>
                        </div>
                      </div>
                    </div>

                    <button className={`hidden sm:flex w-10 h-10 rounded-full border-2 items-center justify-center shrink-0 transition-all ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-transparent group-hover:border-indigo-300'}`}>
                      ✓
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
