import React, { useState, useEffect } from 'react';
import { InventoryItem, updateMedicineDose, markItemUsedToday } from '../../db';
import {
  FaTimes,
  FaPills,
  FaCheck,
  FaUtensils,
  FaClock,
  FaPlus,
  FaMinus,
  FaSun,
  FaMoon,
  FaCloudSun
} from 'react-icons/fa';

interface MedicineDoseModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updatedItem: InventoryItem) => void;
}

const COMMON_UNITS = ['tablets', 'capsules', 'ml', 'drops', 'puffs', 'sachets', 'teaspoon', 'mg'];

const COMMON_FREQUENCIES = [
  { id: 'Once Daily (1-0-0)', label: 'Once Daily (Morning)' },
  { id: 'Twice Daily (1-0-1)', label: 'Twice Daily (Morning & Night)' },
  { id: 'Thrice Daily (1-1-1)', label: 'Thrice Daily (TDS)' },
  { id: 'Four Times Daily', label: '4x Daily (QID)' },
  { id: 'Before Bed (0-0-1)', label: 'Bedtime Only' },
  { id: 'As Needed (SOS)', label: 'As Needed / SOS' }
];

export const MedicineDoseModal: React.FC<MedicineDoseModalProps> = ({
  item,
  isOpen,
  onClose,
  onUpdated
}) => {
  const [dailyDose, setDailyDose] = useState<number>(1);
  const [doseUnit, setDoseUnit] = useState<string>('tablets');
  const [doseFrequency, setDoseFrequency] = useState<string>('Once Daily (1-0-0)');
  const [medicineTiming, setMedicineTiming] = useState<'before_food' | 'after_food' | 'any'>('after_food');
  const [doseInstructions, setDoseInstructions] = useState<string>('');
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['Morning']);
  const [isSaving, setIsSaving] = useState(false);
  const [loggedJustNow, setLoggedJustNow] = useState(false);

  useEffect(() => {
    if (item) {
      setDailyDose(item.dailyDose !== undefined ? item.dailyDose : 1);
      setDoseUnit(item.doseUnit || 'tablets');
      setDoseFrequency(item.doseFrequency || 'Once Daily (1-0-0)');
      setMedicineTiming(item.medicineTiming || 'after_food');
      setDoseInstructions(item.doseInstructions || '');
      setSelectedTimes(item.doseTimes && item.doseTimes.length > 0 ? item.doseTimes : ['Morning']);
      setLoggedJustNow(false);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const toggleTimeOfDay = (slot: string) => {
    setSelectedTimes(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  };

  const handleSave = async () => {
    if (!item.id) return;
    setIsSaving(true);
    try {
      const doseData = {
        dailyDose: Math.max(0, Number(dailyDose) || 0),
        doseUnit,
        doseFrequency,
        medicineTiming,
        doseInstructions: doseInstructions.trim(),
        doseTimes: selectedTimes
      };

      await updateMedicineDose(item.id, doseData);

      if (onUpdated) {
        onUpdated({ ...item, ...doseData });
      }
      onClose();
    } catch (err) {
      console.error('Failed to update medicine dose:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTakeDoseNow = async () => {
    if (!item.id) return;
    await markItemUsedToday(item.id, dailyDose || 1, `Dose taken: ${dailyDose} ${doseUnit} (${medicineTiming.replace('_', ' ')})`, doseUnit);
    setLoggedJustNow(true);
    setTimeout(() => {
      setLoggedJustNow(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      id="medicine-dose-modal-backdrop"
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="medicine-dose-modal-container"
        className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden relative max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with 2026 refined banner */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/80 via-white to-purple-50/60">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-200">
              <FaPills size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block">
                Dosage & Routine
              </span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-snug line-clamp-1">
                {item.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
            aria-label="Close"
          >
            <FaTimes size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Quick Active Ingredients Reminder if available */}
          {item.components && (
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-semibold">Active Composition:</span>
              <span className="font-bold text-slate-800 font-mono truncate max-w-[240px]" title={item.components}>
                {item.components}
              </span>
            </div>
          )}

          {/* Section 1: Dose Amount & Unit */}
          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2.5">
              1. Dose Quantity per Intake
            </label>
            <div className="flex items-center gap-3">
              {/* Stepper Input */}
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setDailyDose(prev => Math.max(0.5, Number((prev - 0.5).toFixed(1))))}
                  className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-all shadow-2xs"
                  title="Decrease dose"
                >
                  <FaMinus size={12} />
                </button>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={dailyDose}
                  onChange={e => setDailyDose(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-16 text-center font-black text-lg bg-transparent text-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setDailyDose(prev => Number((prev + 0.5).toFixed(1)))}
                  className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-all shadow-2xs"
                  title="Increase dose"
                >
                  <FaPlus size={12} />
                </button>
              </div>

              {/* Unit Selector */}
              <div className="flex-1">
                <select
                  value={doseUnit}
                  onChange={e => setDoseUnit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3.5 text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-300"
                >
                  {COMMON_UNITS.map(unit => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick unit pills */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {COMMON_UNITS.slice(0, 5).map(unit => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setDoseUnit(unit)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    doseUnit === unit
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Frequency Routine */}
          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2.5">
              2. Frequency / Daily Routine
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COMMON_FREQUENCIES.map(freq => {
                const isSelected = doseFrequency === freq.id;
                return (
                  <button
                    key={freq.id}
                    type="button"
                    onClick={() => setDoseFrequency(freq.id)}
                    className={`p-3 rounded-2xl text-left font-bold text-xs transition-all border flex items-center justify-between ${
                      isSelected
                        ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{freq.label}</span>
                    {isSelected && <FaCheck size={11} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Meal Timing */}
          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2.5">
              3. Food & Meal Timing
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMedicineTiming('before_food')}
                className={`py-3 px-2 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all border ${
                  medicineTiming === 'before_food'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <FaUtensils size={13} />
                <span>Before Food</span>
              </button>

              <button
                type="button"
                onClick={() => setMedicineTiming('after_food')}
                className={`py-3 px-2 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all border ${
                  medicineTiming === 'after_food'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <FaUtensils size={13} />
                <span>After Food</span>
              </button>

              <button
                type="button"
                onClick={() => setMedicineTiming('any')}
                className={`py-3 px-2 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all border ${
                  medicineTiming === 'any'
                    ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <FaClock size={13} />
                <span>Anytime</span>
              </button>
            </div>
          </div>

          {/* Section 4: Time Slots (Morning, Afternoon, Evening, Night) */}
          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2.5">
              4. Schedule Slots
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { slot: 'Morning', icon: <FaSun size={12} /> },
                { slot: 'Afternoon', icon: <FaCloudSun size={12} /> },
                { slot: 'Evening', icon: <FaSun size={12} /> },
                { slot: 'Night', icon: <FaMoon size={12} /> }
              ].map(({ slot, icon }) => {
                const isSelected = selectedTimes.includes(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleTimeOfDay(slot)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {icon}
                    <span>{slot}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: Doctor's Advice / Special Notes */}
          <div>
            <label
              htmlFor="dose-instructions-input"
              className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5"
            >
              5. Instructions & Precautions
            </label>
            <input
              id="dose-instructions-input"
              type="text"
              value={doseInstructions}
              onChange={e => setDoseInstructions(e.target.value)}
              placeholder="e.g. Swallow whole with lukewarm water. Complete 5-day course."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTakeDoseNow}
            disabled={loggedJustNow}
            className={`px-4 py-3 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs ${
              loggedJustNow
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
            }`}
          >
            <FaCheck size={12} />
            <span>{loggedJustNow ? 'Dose Logged!' : 'Take Dose Now'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-3 rounded-2xl text-xs font-black text-white bg-slate-900 hover:bg-slate-800 shadow-md flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              <FaCheck size={12} />
              <span>{isSaving ? 'Saving...' : 'Save Routine'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
