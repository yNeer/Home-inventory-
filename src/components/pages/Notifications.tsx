import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { FaBell, FaCheck, FaTimes, FaClock, FaPills } from 'react-icons/fa';

export const Notifications: React.FC = () => {
  // Fetch medicines that have a reminder set
  const medsWithReminders = useLiveQuery(
    () => db.items.where('type').equals('medicine').filter(item => item.reminderOption !== 'none' && item.reminderOption !== undefined).toArray(),
    []
  );

  const [dismissed, setDismissed] = useState<number[]>([]);

  const handleDismiss = (id: number) => {
    setDismissed(prev => [...prev, id]);
  };

  const handleRemindLater = (id: number, minutes: number) => {
    alert(`Reminder snoozed for ${minutes} minutes.`);
    handleDismiss(id);
  };

  const activeMeds = medsWithReminders?.filter(m => m.id && !dismissed.includes(m.id)) || [];

  return (
    <div className="min-h-full px-6 md:px-10 lg:px-12 pt-safe pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-7xl mx-auto">
      <header className="mb-10 mt-6 sm:mt-8 relative flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-rose-400 tracking-widest uppercase mb-1 drop-shadow-sm">Alerts</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1a1b41] tracking-tight leading-none drop-shadow-sm">
            Reminders.
          </h1>
        </div>
        <div className="w-12 h-12 md:w-16 md:h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shadow-sm border border-rose-100 relative">
          {activeMeds.length > 0 && <div className="absolute top-2 right-2 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-ping"></div>}
          <FaBell className="text-xl md:text-2xl" />
        </div>
      </header>

      {activeMeds.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
             <FaBell size={32} />
          </div>
          <p className="text-xl font-bold text-slate-800 mb-2">You're all caught up!</p>
          <p className="text-sm text-slate-400 font-medium max-w-[250px] leading-relaxed">No pending medicine reminders for right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight px-1">Due Now</h2>
          {activeMeds.map(med => (
            <div key={med.id} className="bg-white rounded-[32px] p-5 shadow-[0_12px_40px_rgb(0,0,0,0.06)] border border-slate-100 flex flex-col md:flex-row gap-5 transition-all">
               {/* Left: Image / Icon */}
               <div className="w-full md:w-32 h-32 md:h-auto rounded-[24px] overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  {med.image ? (
                     <img src={med.image} alt={med.name} className="w-full h-full object-cover" />
                  ) : (
                     <FaPills className="text-4xl text-slate-300" />
                  )}
               </div>

               {/* Right: Info & Actions */}
               <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">Reminder</span>
                      {med.medicineTiming === 'before_food' && <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">Before Food</span>}
                      {med.medicineTiming === 'after_food' && <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">After Food</span>}
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-800 leading-tight mb-1">{med.name}</h3>
                    {med.components && <p className="text-xs font-medium text-slate-500 line-clamp-1">{med.components}</p>}
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                     <button onClick={() => med.id && handleDismiss(med.id)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-200">
                        <FaCheck /> Done
                     </button>
                     <div className="flex gap-3 flex-1">
                       <button onClick={() => med.id && handleDismiss(med.id)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95">
                          <FaTimes /> Skip
                       </button>
                       <button onClick={() => med.id && handleRemindLater(med.id, 10)} className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95">
                          <FaClock /> +10m
                       </button>
                     </div>
                  </div>

                  {/* Before Food Specific Action */}
                  {med.medicineTiming === 'before_food' && (
                     <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><span className="text-sm">🍽️</span> Remind me to eat in...</p>
                        <div className="flex flex-wrap gap-2">
                          {[10, 15, 20, 25, 30, 45, 60].map(mins => (
                            <button
                              key={mins}
                              onClick={() => med.id && handleRemindLater(med.id, mins)}
                              className="px-3.5 py-2 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-xl text-xs font-bold text-slate-600 transition-colors shadow-sm"
                            >
                              {mins === 60 ? '1 Hour' : `${mins} Min`}
                            </button>
                          ))}
                          <button onClick={() => med.id && handleRemindLater(med.id, parseInt(window.prompt('Remind in how many minutes?', '45') || '0'))} className="px-4 py-2 bg-slate-50 border border-slate-100 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-500 transition-colors">Custom...</button>
                        </div>
                     </div>
                  )}

               </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
