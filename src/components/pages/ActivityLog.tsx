import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  UsageLogEntry,
  InventoryItem,
  getItemStock,
  deleteLogEntry,
  clearAllLogs,
  markItemUsedToday,
  getTodayDateString
} from '../../db';
import { exportLogsToPDF, exportLogsToCSV } from '../../utils/pdfExport';
import {
  FaHistory,
  FaPills,
  FaBoxes,
  FaPlus,
  FaTrash,
  FaFilePdf,
  FaFileCsv,
  FaSearch,
  FaCheckCircle,
  FaCalendarAlt,
  FaUtensils,
  FaClock,
  FaTimes,
  FaUndo
} from 'react-icons/fa';

type LogFilter = 'all' | 'today' | 'medicines' | 'groceries';

export const ActivityLog: React.FC = () => {
  const logs = useLiveQuery(() => db.logs.reverse().toArray(), []);
  const allItems = useLiveQuery(() => db.items.toArray(), []);

  const [activeFilter, setActiveFilter] = useState<LogFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Manual Log Form State
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [manualAmount, setManualAmount] = useState<number>(1);
  const [manualNotes, setManualNotes] = useState<string>('');
  const [manualUnit, setManualUnit] = useState<string>('unit');
  const [notification, setNotification] = useState<string | null>(null);

  const todayStr = useMemo(() => getTodayDateString(), []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const { filteredLogs, todayCount, medicineCount, groceryCount } = useMemo(() => {
    if (!logs) {
      return { filteredLogs: [], todayCount: 0, medicineCount: 0, groceryCount: 0 };
    }

    let todayC = 0;
    let medC = 0;
    let grocC = 0;

    logs.forEach(l => {
      if (l.date === todayStr) todayC++;
      if (l.itemType === 'medicine') medC++;
      if (l.itemType === 'grocery') grocC++;
    });

    const query = searchQuery.trim().toLowerCase();

    const result = logs.filter(log => {
      // Filter tab
      if (activeFilter === 'today' && log.date !== todayStr) return false;
      if (activeFilter === 'medicines' && log.itemType !== 'medicine') return false;
      if (activeFilter === 'groceries' && log.itemType !== 'grocery') return false;

      // Text search
      if (query) {
        const nameMatch = log.itemName.toLowerCase().includes(query);
        const notesMatch = log.notes ? log.notes.toLowerCase().includes(query) : false;
        const dateMatch = log.date.includes(query);
        if (!nameMatch && !notesMatch && !dateMatch) return false;
      }

      return true;
    });

    return {
      filteredLogs: result,
      todayCount: todayC,
      medicineCount: medC,
      groceryCount: grocC
    };
  }, [logs, activeFilter, searchQuery, todayStr]);

  const handleDeleteLog = async (logId: number, restoreStock = false) => {
    if (window.confirm(restoreStock ? 'Delete this entry and restore 1 unit back to stock?' : 'Delete this log entry?')) {
      await deleteLogEntry(logId, restoreStock);
      showToast(restoreStock ? 'Log deleted & stock restored' : 'Log deleted');
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all activity history?')) {
      await clearAllLogs();
      showToast('Activity log cleared');
    }
  };

  const handleCreateManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      alert('Please select an item to log.');
      return;
    }

    const item = allItems?.find(i => i.id === Number(selectedItemId));
    if (!item || !item.id) return;

    await markItemUsedToday(item.id, manualAmount, manualNotes || undefined, manualUnit);
    showToast(`Logged consumption of ${item.name}`);
    setIsManualModalOpen(false);
    setSelectedItemId('');
    setManualNotes('');
  };

  return (
    <div className="min-h-full px-4 sm:px-8 md:px-10 lg:px-12 pt-safe pb-32 w-full max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-[140] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-3 border border-slate-700">
          <FaCheckCircle className="text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 mt-4 sm:mt-6">
        <div>
          <span className="text-xs font-black text-purple-500 uppercase tracking-widest block mb-1">
            Consumption & Adherence
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
            Activity Log.
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Real-time timeline of medicine doses taken and household grocery consumption.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl text-xs font-black text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-100 flex items-center gap-2 active:scale-95 transition-all"
          >
            <FaPlus size={12} />
            <span>Record Entry</span>
          </button>

          <button
            onClick={() => exportLogsToPDF({ logs: filteredLogs, includeImages: false })}
            className="px-3.5 py-2.5 rounded-2xl text-xs font-black text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
            title="Download activity log as PDF"
          >
            <FaFilePdf size={13} className="text-rose-600" />
            <span>Log PDF</span>
          </button>

          <button
            onClick={() => exportLogsToCSV(filteredLogs)}
            className="px-3.5 py-2.5 rounded-2xl text-xs font-black text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
            title="Export activity log as CSV"
          >
            <FaFileCsv size={13} className="text-emerald-600" />
            <span>CSV</span>
          </button>

          {logs && logs.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-2.5 rounded-2xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 transition-colors"
              title="Clear all history"
            >
              <FaTrash size={11} />
            </button>
          )}
        </div>
      </header>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 block mb-1">
            Logged Today
          </span>
          <div className="text-2xl font-black text-purple-800">{todayCount}</div>
          <span className="text-[10px] font-semibold text-slate-400">events recorded today</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block mb-1">
            Medicine Doses
          </span>
          <div className="text-2xl font-black text-rose-700">{medicineCount}</div>
          <span className="text-[10px] font-semibold text-slate-400">total doses tracked</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block mb-1">
            Grocery Consumptions
          </span>
          <div className="text-2xl font-black text-emerald-700">{groceryCount}</div>
          <span className="text-[10px] font-semibold text-slate-400">pantry items used</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Total Log Entries
          </span>
          <div className="text-2xl font-black text-slate-800">{logs ? logs.length : 0}</div>
          <span className="text-[10px] font-semibold text-slate-400">historical audit trail</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: `All Logs (${logs?.length || 0})` },
            { id: 'today', label: `Today's Events (${todayCount})` },
            { id: 'medicines', label: `Medicine Doses (${medicineCount})` },
            { id: 'groceries', label: `Groceries (${groceryCount})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as LogFilter)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all border ${
                activeFilter === tab.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <input
            type="text"
            placeholder="Search by product name or notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pl-8 pr-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-2xs"
          />
          <FaSearch size={11} className="absolute left-3 top-3.5 text-slate-400" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600"
            >
              <FaTimes size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Log Timeline List */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl p-8 border border-slate-100 shadow-2xs">
          <div className="w-16 h-16 bg-purple-50 text-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FaHistory size={26} />
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-1">No activity logged</h3>
          <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto mb-5">
            Click "Use Today" or "Take Dose" on your items or tap "Record Entry" to log daily consumption.
          </p>
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-100 active:scale-95 transition-all"
          >
            Record First Entry
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map(log => {
            const isMed = log.itemType === 'medicine';
            const isToday = log.date === todayStr;

            return (
              <div
                key={log.id}
                className={`bg-white rounded-2xl p-4 border transition-all hover:shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isToday ? 'border-purple-200 shadow-2xs' : 'border-slate-100'
                }`}
              >
                {/* Left: Icon & Description */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isMed ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'
                    }`}
                  >
                    {isMed ? <FaPills size={18} /> : <FaBoxes size={18} />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-black text-sm text-slate-900 truncate">{log.itemName}</h4>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isMed ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {log.itemType}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                          Today
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                        <FaClock size={9} />
                        {log.date} {log.time && `• ${log.time}`}
                      </span>

                      {log.notes && (
                        <span className="text-slate-600 font-semibold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          {log.notes}
                        </span>
                      )}

                      {log.doseTiming && (
                        <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold">
                          <FaUtensils size={8} /> {log.doseTiming.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Quantity & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span className="text-xs font-black text-purple-700 block">
                      -{log.amountUsed} {log.unit || 'dose'}
                    </span>
                    {log.remainingStock !== undefined && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {log.remainingStock} left in stock
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => log.id && handleDeleteLog(log.id, true)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      title="Undo: Delete log & restore stock"
                    >
                      <FaUndo size={12} />
                    </button>
                    <button
                      onClick={() => log.id && handleDeleteLog(log.id, false)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Delete log record"
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Consumption Modal */}
      {isManualModalOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsManualModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100 relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <FaHistory size={16} />
                </div>
                <h3 className="text-base font-black text-slate-900">Record Consumption</h3>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <FaTimes size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateManualLog} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1.5">
                  Select Product *
                </label>
                <select
                  value={selectedItemId}
                  onChange={e => {
                    const id = Number(e.target.value);
                    setSelectedItemId(id || '');
                    const selected = allItems?.find(i => i.id === id);
                    if (selected) {
                      setManualUnit(selected.type === 'medicine' ? (selected.doseUnit || 'dose') : 'unit');
                    }
                  }}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-3.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-300"
                >
                  <option value="">-- Choose item from inventory --</option>
                  {allItems?.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.type === 'medicine' ? '💊 ' : '📦 '} {item.name} (Stock: {getItemStock(item)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1.5">
                    Amount Used
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={manualAmount}
                    onChange={e => setManualAmount(parseFloat(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 text-sm font-black text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1.5">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={manualUnit}
                    onChange={e => setManualUnit(e.target.value)}
                    placeholder="dose / tablet / unit"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-1.5">
                  Notes / Time Taken
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={e => setManualNotes(e.target.value)}
                  placeholder="e.g. Post lunch dose or cooked for family"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 text-xs font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-100 active:scale-95 transition-all"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
