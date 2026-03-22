import React from 'react';
import { FaHeartbeat, FaPills, FaCheckCircle } from 'react-icons/fa';

export const HealthPlan: React.FC = () => {
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

        {/* Progress Card */}
        <div className="col-span-1 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[32px] p-8 text-white shadow-lg shadow-emerald-200 relative overflow-hidden flex flex-col justify-center min-h-[200px] md:min-h-[300px]">
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

        {/* Today's Meds */}
        <div className="col-span-1 md:col-span-2">
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-6 tracking-tight px-1">Today's Schedule</h2>

          <div className="flex flex-col gap-4">
            {[
              { time: '08:00 AM', name: 'Vitamin C', type: 'Supplement', done: true },
              { time: '01:00 PM', name: 'Aspirin', type: 'Medicine', done: false },
              { time: '08:00 PM', name: 'Melatonin', type: 'Sleep Aid', done: false }
            ].map((med, idx) => (
              <div key={idx} className="bg-white rounded-[24px] p-5 flex items-center gap-4 md:gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:scale-[1.01] transition-transform cursor-pointer">
            <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center ${med.done ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50 text-indigo-500'}`}>
              {med.done ? <FaCheckCircle size={24} /> : <FaPills size={24} />}
            </div>
            <div className="flex-1">
              <h3 className={`font-bold text-lg ${med.done ? 'text-slate-400 line-through decoration-2' : 'text-slate-800'}`}>{med.name}</h3>
              <p className="text-sm font-medium text-slate-400">{med.type} • {med.time}</p>
            </div>
            <button className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 ${med.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-transparent'}`}>
              ✓
            </button>
          </div>
        ))}
          </div>
        </div>

      </div>
    </div>
  );
};
