import React, { useState } from 'react';
import { InventoryItem, db } from '../db';
import { FaTimes, FaCheck, FaTrash, FaSpinner } from 'react-icons/fa';
import { scheduleLocalNotification, cancelLocalNotifications } from '../utils/notifications';

interface EditItemModalProps {
  item: InventoryItem;
  onClose: () => void;
  onUpdate: () => void;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({ item, onClose, onUpdate }) => {
  const [formData, setFormData] = useState<InventoryItem>(item);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let parsedValue: string | number | undefined = value;
    if (type === 'number') {
      parsedValue = value === '' ? undefined : Number(value);
    }
    setFormData(prev => ({ ...prev, [name]: parsedValue }));
  };

  const handleSave = async () => {
    if (!formData.name) return alert("Name is required");
    setLoading(true);
    try {
      await db.items.update(item.id!, formData);

      // Cancel old notifications first
      await cancelLocalNotifications(item.id!);

      // Re-schedule notification if recurring is set
      if (formData.type === 'medicine' && formData.reminderOption !== 'none') {
          // Calculate when the next notification should fire based on times array
          const now = new Date();
          let nextMs = 0;
          if (formData.reminderTimes && formData.reminderTimes.length > 0) {
              const timeParts = formData.reminderTimes[0].split(':');
              const target = new Date();
              target.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
              if (target.getTime() < now.getTime()) {
                  target.setDate(target.getDate() + 1); // tomorrow
              }
              nextMs = target.getTime() - now.getTime();
          }

          if (nextMs > 0) {
              scheduleLocalNotification(
                 `Time for ${formData.name}`,
                 `It's time for your ${formData.doseAmount || 'medicine'}.`,
                 Math.floor(nextMs / 60000), // delay in minutes
                 formData.image || undefined,
                 { times: formData.reminderTimes || [], days: formData.reminderDays || [], type: formData.reminderOption || 'daily' },
                 item.id
              );
          }
      }

      onUpdate();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to update item.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this item?")) {
       setLoading(true);
       try {
         await cancelLocalNotifications(item.id!);
         await db.items.delete(item.id!);
         onUpdate();
         onClose();
       } catch (e) {
         alert("Failed to delete.");
       } finally {
         setLoading(false);
       }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose}></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-md z-10 sticky top-0">
          <h3 className="text-xl font-extrabold text-slate-800 tracking-tight flex-1">Edit Item</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <FaTimes />
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

           {/* Image Preview (Optional) */}
           {formData.image && (
              <div className="w-full h-32 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                 <img src={formData.image} alt={formData.name} className="w-full h-full object-cover" />
              </div>
           )}

           <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 block">Product Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all outline-none" />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 block">Type</label>
                 <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-200 outline-none">
                    <option value="grocery">Grocery</option>
                    <option value="medicine">Medicine</option>
                 </select>
              </div>
              <div>
                 <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 block">Price</label>
                 <input type="text" name="price" value={formData.price} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all outline-none" />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 block">Mfg Date</label>
                 <input type="date" name="mfgDate" value={formData.mfgDate} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-200 outline-none" />
              </div>
              <div>
                 <label className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest mb-1 block">Expiry Date</label>
                 <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className="w-full bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-rose-800 font-bold focus:ring-2 focus:ring-rose-200 outline-none" />
              </div>
           </div>

           {formData.type === 'medicine' && (
             <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/50 space-y-4">
                <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-widest">Reminders</h4>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1 block">Frequency</label>
                      <select name="reminderOption" value={formData.reminderOption} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-bold outline-none">
                         <option value="none">Off</option>
                         <option value="daily">Daily</option>
                         <option value="weekly">Weekly</option>
                         <option value="custom_days">Custom Days</option>
                         <option value="monthly">Monthly</option>
                      </select>
                   </div>
                   <div>
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1 block">Timing</label>
                      <select name="medicineTiming" value={formData.medicineTiming} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-bold outline-none">
                         <option value="any">Anytime</option>
                         <option value="before_food">Before Food</option>
                         <option value="after_food">After Food</option>
                      </select>
                   </div>
                </div>

                {formData.reminderOption !== 'none' && (
                  <>
                     {formData.reminderOption === 'custom_days' && (
                        <div>
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2 block">Days of Week</label>
                          <div className="flex gap-1 sm:gap-2 justify-between">
                            {['S','M','T','W','T','F','S'].map((day, idx) => {
                              const isSelected = formData.reminderDays?.includes(idx);
                              return (
                                <button
                                  type="button"
                                  key={idx}
                                  onClick={() => {
                                    const days = formData.reminderDays || [];
                                    if (isSelected) setFormData(p => ({...p, reminderDays: days.filter(d => d !== idx)}));
                                    else setFormData(p => ({...p, reminderDays: [...days, idx]}));
                                  }}
                                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${isSelected ? 'bg-indigo-500 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                     )}

                     <div>
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1 block">Dose Amount</label>
                        <input type="text" name="doseAmount" value={formData.doseAmount} onChange={handleChange} placeholder="e.g. 1 Tablet" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-bold outline-none" />
                     </div>
                     <div>
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1 block">Times</label>
                        {formData.reminderTimes?.map((time, idx) => (
                           <div key={idx} className="flex gap-2 mb-2">
                             <input
                               type="time"
                               value={time}
                               onChange={(e) => {
                                 const newTimes = [...(formData.reminderTimes || [])];
                                 newTimes[idx] = e.target.value;
                                 setFormData(p => ({...p, reminderTimes: newTimes}));
                               }}
                               className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-800 font-bold outline-none"
                             />
                             <button onClick={() => {
                                const newTimes = [...(formData.reminderTimes || [])];
                                newTimes.splice(idx, 1);
                                setFormData(p => ({...p, reminderTimes: newTimes}));
                             }} className="w-10 bg-slate-100 text-slate-500 rounded-xl font-bold">-</button>
                           </div>
                        ))}
                        <button onClick={() => setFormData(p => ({...p, reminderTimes: [...(p.reminderTimes || []), '08:00']}))} className="text-xs font-bold text-indigo-600 mt-1">+ Add Time</button>
                     </div>
                  </>
                )}

             </div>
           )}

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/80 flex gap-4 pb-safe">
           <button onClick={handleDelete} disabled={loading} className="w-14 h-14 shrink-0 bg-white border border-rose-200 text-rose-500 rounded-2xl flex items-center justify-center shadow-sm hover:bg-rose-50 transition-colors">
              {loading ? <FaSpinner className="animate-spin" /> : <FaTrash />}
           </button>
           <button onClick={handleSave} disabled={loading} className="flex-1 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-indigo-200 hover:-translate-y-0.5 transition-all">
              {loading ? <FaSpinner className="animate-spin" /> : <FaCheck />} Save Changes
           </button>
        </div>

      </div>
    </div>
  );
};