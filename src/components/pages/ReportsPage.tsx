import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, InventoryItem, getItemStock, UsageLogEntry } from '../../db';
import {
  exportInventoryToPDF,
  exportLogsToPDF,
  exportInventoryToCSV,
  exportLogsToCSV,
  exportDatabaseJSON
} from '../../utils/pdfExport';
import {
  FaFilePdf,
  FaFileCsv,
  FaImage,
  FaPrint,
  FaBoxes,
  FaPills,
  FaExclamationTriangle,
  FaRegClock,
  FaTimes,
  FaCheck,
  FaDownload,
  FaDatabase,
  FaHistory,
  FaSearch
} from 'react-icons/fa';
import { format, differenceInDays } from 'date-fns';

type ReportScope = 'all' | 'medicines' | 'groceries' | 'low_stock' | 'expiring' | 'expired' | 'logs';

export const ReportsPage: React.FC = () => {
  const items = useLiveQuery(() => db.items.toArray(), []);
  const logs = useLiveQuery(() => db.logs.reverse().toArray(), []);

  const [reportScope, setReportScope] = useState<ReportScope>('all');
  const [includeImages, setIncludeImages] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Compute metrics and filtered list
  const {
    filteredItems,
    filteredLogs,
    totalValuation,
    lowStockCount,
    expiringSoonCount,
    expiredCount
  } = useMemo(() => {
    if (!items) {
      return {
        filteredItems: [],
        filteredLogs: [],
        totalValuation: 0,
        lowStockCount: 0,
        expiringSoonCount: 0,
        expiredCount: 0
      };
    }

    const now = new Date();
    let totalVal = 0;
    let lowCount = 0;
    let expSoon = 0;
    let expCount = 0;

    items.forEach(item => {
      const stock = getItemStock(item);
      const priceNum = parseFloat(item.price || '0');
      if (!isNaN(priceNum)) {
        totalVal += priceNum * stock;
      }
      if (stock <= (item.lowQuantityThreshold ?? 2)) {
        lowCount++;
      }
      if (item.expiryDate) {
        const diff = differenceInDays(new Date(item.expiryDate), now);
        if (diff < 0) {
          expCount++;
        } else if (diff <= 14) {
          expSoon++;
        }
      }
    });

    // Filter items based on selected scope & search
    const query = searchFilter.trim().toLowerCase();

    let itemsForScope = items;
    switch (reportScope) {
      case 'medicines':
        itemsForScope = items.filter(i => i.type === 'medicine');
        break;
      case 'groceries':
        itemsForScope = items.filter(i => i.type === 'grocery');
        break;
      case 'low_stock':
        itemsForScope = items.filter(i => getItemStock(i) <= (i.lowQuantityThreshold ?? 2));
        break;
      case 'expiring':
        itemsForScope = items.filter(i => {
          if (!i.expiryDate) return false;
          const diff = differenceInDays(new Date(i.expiryDate), now);
          return diff >= 0 && diff <= 14;
        });
        break;
      case 'expired':
        itemsForScope = items.filter(i => {
          if (!i.expiryDate) return false;
          return new Date(i.expiryDate) < now;
        });
        break;
      case 'logs':
        itemsForScope = [];
        break;
      case 'all':
      default:
        itemsForScope = items;
        break;
    }

    if (query) {
      itemsForScope = itemsForScope.filter(i =>
        i.name.toLowerCase().includes(query) ||
        (i.batchNo && i.batchNo.toLowerCase().includes(query)) ||
        (i.components && i.components.toLowerCase().includes(query)) ||
        (i.details && i.details.toLowerCase().includes(query))
      );
    }

    // Filter logs if on logs scope
    let logsForScope: UsageLogEntry[] = logs || [];
    if (reportScope === 'logs' && query) {
      logsForScope = logsForScope.filter(l =>
        l.itemName.toLowerCase().includes(query) ||
        (l.notes && l.notes.toLowerCase().includes(query)) ||
        (l.date && l.date.includes(query))
      );
    }

    return {
      filteredItems: itemsForScope,
      filteredLogs: logsForScope,
      totalValuation: totalVal,
      lowStockCount: lowCount,
      expiringSoonCount: expSoon,
      expiredCount: expCount
    };
  }, [items, logs, reportScope, searchFilter]);

  const showNotification = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 4000);
  };

  // Export to PDF Handler
  const handleExportPDF = async (withImg: boolean) => {
    setIsExporting(true);
    try {
      if (reportScope === 'logs') {
        await exportLogsToPDF({
          logs: filteredLogs,
          includeImages: withImg,
          title: 'Inventory & Dose Activity Log Report'
        });
        showNotification('Activity Log PDF generated successfully!');
      } else {
        const titleMap: Record<ReportScope, string> = {
          all: 'Complete Home Inventory & Medicine Report',
          medicines: 'Pharmacy & Medicine Dosage Catalog',
          groceries: 'Grocery & Household Pantry Audit',
          low_stock: 'Low Stock & Restock Shopping List',
          expiring: 'Near-Expiry Attention Report',
          expired: 'Expired Products Disposal List',
          logs: 'Activity Log'
        };

        await exportInventoryToPDF({
          items: filteredItems,
          includeImages: withImg,
          title: titleMap[reportScope],
          reportType: reportScope === 'logs' ? 'all' : reportScope
        });
        showNotification(`PDF Report (${withImg ? 'with images' : 'compact without images'}) generated!`);
      }
    } catch (err) {
      console.error('PDF export failed:', err);
      showNotification('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (reportScope === 'logs') {
      exportLogsToCSV(filteredLogs);
      showNotification('Activity Log CSV exported!');
    } else {
      exportInventoryToCSV(filteredItems);
      showNotification('Inventory CSV exported!');
    }
  };

  const handleExportBackup = () => {
    if (!items) return;
    exportDatabaseJSON(items, logs || []);
    showNotification('Full JSON backup downloaded!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-full px-4 sm:px-8 md:px-10 lg:px-12 pt-safe pb-32 w-full max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Toast Notice */}
      {exportNotice && (
        <div className="fixed top-6 right-6 z-[140] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-3 border border-slate-700">
          <FaCheck className="text-emerald-400" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 mt-4 sm:mt-6">
        <div>
          <span className="text-xs font-black text-indigo-500 uppercase tracking-widest block mb-1">
            Reports & Audits
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
            Export Center.
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Generate executive PDF reports with or without product photos, spreadsheets, and data backups.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export PDF (With Photos) */}
          <button
            onClick={() => handleExportPDF(true)}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-2xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            title="Generate visual PDF report with product images"
          >
            <FaFilePdf size={13} />
            <span>PDF (With Images)</span>
          </button>

          {/* Export PDF (Without Photos) */}
          <button
            onClick={() => handleExportPDF(false)}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-2xl text-xs font-black text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            title="Generate high-density compact PDF report without images"
          >
            <FaFilePdf size={13} className="text-rose-600" />
            <span>PDF (No Images)</span>
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
            title="Export as CSV spreadsheet"
          >
            <FaFileCsv size={13} className="text-emerald-600" />
            <span>CSV</span>
          </button>

          {/* JSON Backup */}
          <button
            onClick={handleExportBackup}
            className="px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
            title="Download complete JSON backup of items and logs"
          >
            <FaDatabase size={12} className="text-purple-600" />
            <span>Backup</span>
          </button>

          {/* Browser Print */}
          <button
            onClick={handlePrint}
            className="hidden sm:flex px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs items-center gap-1.5 active:scale-95 transition-all"
            title="Print report preview"
          >
            <FaPrint size={12} />
            <span>Print</span>
          </button>
        </div>
      </header>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Total Inventory
          </span>
          <div className="text-2xl font-black text-slate-900">{items ? items.length : 0}</div>
          <span className="text-[10px] font-semibold text-slate-400">tracked products</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block mb-1">
            Estimated Value
          </span>
          <div className="text-2xl font-black text-emerald-700">₹{totalValuation.toFixed(0)}</div>
          <span className="text-[10px] font-semibold text-slate-400">on shelf</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block mb-1">
            Low Stock Alerts
          </span>
          <div className="text-2xl font-black text-amber-600">{lowStockCount}</div>
          <span className="text-[10px] font-semibold text-slate-400">reorder needed</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 block mb-1">
            Near Expiry (≤14d)
          </span>
          <div className="text-2xl font-black text-orange-600">{expiringSoonCount}</div>
          <span className="text-[10px] font-semibold text-slate-400">consume soon</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block mb-1">
            Expired
          </span>
          <div className="text-2xl font-black text-rose-600">{expiredCount}</div>
          <span className="text-[10px] font-semibold text-slate-400">requires disposal</span>
        </div>
      </div>

      {/* Scope Selector Tabs & Customizer */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm mb-6 space-y-4">
        {/* Scope Tabs */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
            Select Report Scope & Category
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'all', label: 'All Products', icon: <FaBoxes size={11} /> },
              { id: 'medicines', label: 'Medicines & Doses', icon: <FaPills size={11} /> },
              { id: 'groceries', label: 'Groceries Pantry', icon: <FaBoxes size={11} /> },
              { id: 'low_stock', label: 'Low Stock Restock List', icon: <FaExclamationTriangle size={11} /> },
              { id: 'expiring', label: 'Expiring Soon (14d)', icon: <FaRegClock size={11} /> },
              { id: 'expired', label: 'Expired Disposal List', icon: <FaTimes size={11} /> },
              { id: 'logs', label: 'Consumption & Dose Logs', icon: <FaHistory size={11} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setReportScope(tab.id as ReportScope)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 border ${
                  reportScope === tab.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Options Row: Image Toggle & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Image Mode Switch */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-700">Report Presentation:</span>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
              <button
                onClick={() => setIncludeImages(true)}
                className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                  includeImages
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FaImage size={11} />
                <span>With Images</span>
              </button>
              <button
                onClick={() => setIncludeImages(false)}
                className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                  !includeImages
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>No Images (Compact Table)</span>
              </button>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative sm:w-72">
            <input
              type="text"
              placeholder="Search in this report..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-8 pr-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <FaSearch size={11} className="absolute left-2.5 top-3 text-slate-400" />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <FaTimes size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Report Preview Container (Styled like a modern document) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Document Header Bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold">
              <FaFilePdf size={16} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Live Report Preview
              </span>
              <h3 className="text-sm font-black text-slate-800">
                {reportScope === 'logs'
                  ? `Activity & Consumption Log (${filteredLogs.length} events)`
                  : `${reportScope.toUpperCase()} Report (${filteredItems.length} records)`}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportPDF(includeImages)}
              disabled={isExporting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <FaDownload size={11} />
              <span>{isExporting ? 'Generating...' : 'Download PDF Now'}</span>
            </button>
          </div>
        </div>

        {/* Document Body */}
        <div className="p-6">
          {reportScope === 'logs' ? (
            /* Activity Logs Table */
            filteredLogs.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <FaHistory size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-sm text-slate-600">No activity logged yet</p>
                <p className="text-xs">Use products or mark doses taken to see activity events here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3">Date & Time</th>
                      <th className="py-3 px-3">Product Name</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Amount Used</th>
                      <th className="py-3 px-3">Timing / Notes</th>
                      <th className="py-3 px-3 text-right">Remaining Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                          {log.date} {log.time}
                        </td>
                        <td className="py-3 px-3 font-black text-slate-900">{log.itemName}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                              log.itemType === 'medicine'
                                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}
                          >
                            {log.itemType}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-purple-700">
                          {log.amountUsed} {log.unit || 'unit'}
                        </td>
                        <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                          {log.notes || (log.doseTiming ? `Timing: ${log.doseTiming.replace('_', ' ')}` : '—')}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {log.remainingStock !== undefined ? log.remainingStock : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FaBoxes size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-sm text-slate-600">No products match this report filter</p>
              <p className="text-xs">Adjust the category tabs above or clear your search term.</p>
            </div>
          ) : includeImages ? (
            /* Option A: Preview With Images (Visual Catalog Cards) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => {
                const stock = getItemStock(item);
                const isLow = stock <= (item.lowQuantityThreshold ?? 2);
                const isExp = item.expiryDate ? new Date(item.expiryDate) < new Date() : false;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl p-4 border bg-white flex flex-col justify-between shadow-2xs ${
                      isExp ? 'border-rose-200' : isLow ? 'border-amber-200' : 'border-slate-100'
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Image */}
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 font-bold text-xs">
                          {item.type === 'medicine' ? <FaPills size={20} className="text-rose-400" /> : <FaBoxes size={20} className="text-indigo-400" />}
                        </div>
                      )}

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {item.type}
                          </span>
                          {item.price && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              ₹{item.price}
                            </span>
                          )}
                        </div>
                        <h4 className="font-black text-sm text-slate-900 truncate">{item.name}</h4>
                        {item.components && (
                          <p className="text-[10px] font-mono text-slate-500 truncate">{item.components}</p>
                        )}
                        {item.type === 'medicine' && item.dailyDose && (
                          <p className="text-[10px] font-bold text-rose-600 mt-0.5">
                            Dose: {item.dailyDose} {item.doseUnit || 'tab'}/day • {item.medicineTiming?.replace('_', ' ') || 'anytime'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Stock Qty:</span>
                        <span className={`font-black ${isLow ? 'text-amber-600' : 'text-slate-800'}`}>
                          {stock} units
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Expiry Date:</span>
                        <span className={`font-bold ${isExp ? 'text-rose-600' : 'text-slate-700'}`}>
                          {item.expiryDate ? format(new Date(item.expiryDate), 'MMM dd, yyyy') : 'No Date'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Option B: Preview Without Images (Compact High-Density Table) */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Item Name</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Stock</th>
                    <th className="py-3 px-3">Dose / Details</th>
                    <th className="py-3 px-3">Batch / Barcode</th>
                    <th className="py-3 px-3">Expiry Date</th>
                    <th className="py-3 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredItems.map(item => {
                    const stock = getItemStock(item);
                    const isLow = stock <= (item.lowQuantityThreshold ?? 2);
                    const isExp = item.expiryDate ? new Date(item.expiryDate) < new Date() : false;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-black text-slate-900">
                          <div>{item.name}</div>
                          {item.components && (
                            <span className="text-[10px] font-mono text-slate-400 font-normal">
                              {item.components}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                              item.type === 'medicine'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {item.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`font-black ${
                              stock === 0
                                ? 'text-rose-600'
                                : isLow
                                ? 'text-amber-600'
                                : 'text-slate-800'
                            }`}
                          >
                            {stock}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {item.type === 'medicine'
                            ? [
                                item.dailyDose ? `${item.dailyDose} ${item.doseUnit || 'tab'}/day` : '',
                                item.medicineTiming ? item.medicineTiming.replace('_', ' ') : ''
                              ].filter(Boolean).join(' • ') || '—'
                            : item.details || item.description || (item.price ? `₹${item.price}` : '—')}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">
                          {item.batchNo ? `B: ${item.batchNo}` : item.barcode ? `EAN: ${item.barcode}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {item.expiryDate ? format(new Date(item.expiryDate), 'MMM dd, yyyy') : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          {isExp ? (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px]">
                              Expired
                            </span>
                          ) : item.expiryDate ? (
                            (() => {
                              const diff = differenceInDays(new Date(item.expiryDate), new Date());
                              if (diff <= 7) {
                                return (
                                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                                    {diff}d left
                                  </span>
                                );
                              }
                              return (
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                                  Fresh
                                </span>
                              );
                            })()
                          ) : (
                            <span className="text-slate-400 text-[10px]">Active</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
