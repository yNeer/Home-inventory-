import { jsPDF } from 'jspdf';
import { InventoryItem, UsageLogEntry, getItemStock, getTodayDateString } from '../db';
import { format, differenceInDays } from 'date-fns';

export interface PDFExportOptions {
  items: InventoryItem[];
  includeImages: boolean;
  title?: string;
  subtitle?: string;
  reportType?: 'all' | 'medicines' | 'groceries' | 'low_stock' | 'expiring' | 'expired';
}

export interface PDFLogsExportOptions {
  logs: UsageLogEntry[];
  includeImages: boolean;
  title?: string;
}

// Helper to sanitize text for PDF
const cleanText = (str?: string | number | null): string => {
  if (str === undefined || str === null) return '';
  return String(str).trim();
};

/**
 * Generate and download professional PDF report for Inventory items
 * Supports both "with images" and "without images"
 */
export const exportInventoryToPDF = async (options: PDFExportOptions): Promise<void> => {
  const {
    items,
    includeImages,
    title = 'Home Inventory & Medicine Report',
    subtitle = `Generated on ${new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  // Header Banner
  const drawHeader = (pageNum: number, totalPagesPlaceholder = false) => {
    // Top colored accent bar
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(margin, y, contentWidth, 54, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title, margin + 14, y + 24);

    // Subtitle & mode
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(subtitle, margin + 14, y + 42);

    // Mode badge on top right
    doc.setFillColor(includeImages ? 79 : 100, includeImages ? 70 : 116, includeImages ? 229 : 139); // indigo or slate
    doc.roundedRect(pageWidth - margin - 100, y + 14, 88, 24, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(includeImages ? 'VISUAL (PHOTOS)' : 'COMPACT TABLE', pageWidth - margin - 56, y + 29, { align: 'center' });

    y += 66;

    // KPI Summary Bar on first page
    if (pageNum === 1) {
      const totalCount = items.length;
      const medsCount = items.filter(i => i.type === 'medicine').length;
      const groceryCount = items.filter(i => i.type === 'grocery').length;
      const lowStockCount = items.filter(i => getItemStock(i) <= (i.lowQuantityThreshold ?? 2)).length;
      const expiredCount = items.filter(i => i.expiryDate && new Date(i.expiryDate) < new Date()).length;

      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(margin, y, contentWidth, 36, 4, 4, 'FD');

      const colWidth = contentWidth / 5;
      const kpis = [
        { label: 'TOTAL ITEMS', val: `${totalCount}` },
        { label: 'MEDICINES', val: `${medsCount}` },
        { label: 'GROCERIES', val: `${groceryCount}` },
        { label: 'LOW STOCK', val: `${lowStockCount}` },
        { label: 'EXPIRED', val: `${expiredCount}` }
      ];

      kpis.forEach((kpi, idx) => {
        const xPos = margin + idx * colWidth + colWidth / 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(kpi.label, xPos, y + 14, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(kpi.val, xPos, y + 29, { align: 'center' });
      });

      y += 46;
    }
  };

  const drawFooter = (pageNum: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Home Inventory Assistant • Page ${pageNum}`, margin, pageHeight - 20);
    doc.text('Confidential Personal Record', pageWidth - margin, pageHeight - 20, { align: 'right' });
  };

  let currentPage = 1;
  drawHeader(currentPage);

  if (items.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text('No items found matching the selected report criteria.', margin + 10, y + 30);
    drawFooter(currentPage);
    doc.save(`inventory-report-${getTodayDateString()}.pdf`);
    return;
  }

  // ==========================================
  // 1. OPTION A: WITH IMAGES (Visual Card / Catalog Layout)
  // ==========================================
  if (includeImages) {
    const cardHeight = 84;
    const cardSpacing = 8;
    const imgSize = 68;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Page break check
      if (y + cardHeight + 30 > pageHeight - margin) {
        drawFooter(currentPage);
        doc.addPage();
        currentPage++;
        y = margin;
        drawHeader(currentPage);
      }

      const isMed = item.type === 'medicine';
      const stock = getItemStock(item);
      const isLow = stock <= (item.lowQuantityThreshold ?? 2);
      const isExp = item.expiryDate ? new Date(item.expiryDate) < new Date() : false;

      // Card Box
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(isExp ? 254 : isLow ? 253 : 226, isExp ? 202 : isLow ? 230 : 232, isExp ? 202 : isLow ? 138 : 240);
      doc.roundedRect(margin, y, contentWidth, cardHeight, 6, 6, 'FD');

      // Left Accent Strip
      doc.setFillColor(isExp ? 225 : isMed ? 225 : 16, isExp ? 29 : isMed ? 29 : 185, isExp ? 72 : isMed ? 72 : 129); // red/rose/emerald
      doc.rect(margin, y, 4, cardHeight, 'F');

      // Product Image (if present)
      const imgX = margin + 10;
      const imgY = y + 8;

      if (item.image) {
        try {
          doc.addImage(item.image, 'JPEG', imgX, imgY, imgSize, imgSize, undefined, 'FAST');
        } catch {
          // Fallback box if image failed decoding
          doc.setFillColor(241, 245, 249);
          doc.rect(imgX, imgY, imgSize, imgSize, 'F');
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text('Photo', imgX + imgSize / 2, imgY + imgSize / 2, { align: 'center' });
        }
      } else {
        // Placeholder Box
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(imgX, imgY, imgSize, imgSize, 4, 4, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(isMed ? 'MED' : 'GROCERY', imgX + imgSize / 2, imgY + imgSize / 2, { align: 'center' });
      }

      // Details Column
      const textX = imgX + imgSize + 12;
      const maxTextWidth = contentWidth - (imgSize + 30) - 130;

      // Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      const truncatedName = doc.splitTextToSize(cleanText(item.name), maxTextWidth)[0] || 'Untitled Item';
      doc.text(truncatedName, textX, y + 20);

      // Type, Price, Batch
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);

      const metaParts: string[] = [isMed ? 'MEDICINE' : 'GROCERY'];
      if (item.price) metaParts.push(`₹${item.price}`);
      if (item.batchNo) metaParts.push(`Batch: ${item.batchNo}`);
      if (item.barcode) metaParts.push(`Barcode: ${item.barcode}`);
      doc.text(metaParts.join(' • '), textX, y + 32);

      // Salt / Ingredients / Notes
      const notes = item.components || item.details || item.description || '';
      if (notes) {
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        const noteLine = doc.splitTextToSize(notes, maxTextWidth)[0] || '';
        doc.text(noteLine, textX, y + 44);
      }

      // Dosage information for medicines
      if (isMed && (item.dailyDose || item.medicineTiming || item.doseFrequency)) {
        doc.setFontSize(7.5);
        doc.setTextColor(190, 24, 93); // rose-700
        const doseInfo = [
          item.dailyDose ? `Dose: ${item.dailyDose} ${item.doseUnit || 'units'}/day` : '',
          item.doseFrequency ? `${item.doseFrequency}` : '',
          item.medicineTiming ? `${item.medicineTiming.replace('_', ' ')}` : ''
        ].filter(Boolean).join(' • ');
        doc.text(doseInfo, textX, y + 56);
      }

      // Dates line
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const mfgStr = item.mfgDate ? `Mfg: ${format(new Date(item.mfgDate), 'MMM dd, yyyy')}` : '';
      const expStr = item.expiryDate ? `Exp: ${format(new Date(item.expiryDate), 'MMM dd, yyyy')}` : 'No Expiry';
      doc.text([mfgStr, expStr].filter(Boolean).join('   |   '), textX, y + 68);

      // Right Column: Stock & Status Pill
      const rightX = pageWidth - margin - 12;

      // Stock
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(isLow ? 217 : 15, isLow ? 119 : 23, isLow ? 6 : 42); // amber or slate
      doc.text(`${stock} in stock`, rightX, y + 24, { align: 'right' });

      // Low threshold
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`(Alert at ≤ ${item.lowQuantityThreshold ?? 2})`, rightX, y + 34, { align: 'right' });

      // Status Pill
      const statusText = isExp
        ? 'EXPIRED'
        : item.expiryDate
        ? (() => {
            const days = differenceInDays(new Date(item.expiryDate), new Date());
            return days <= 7 ? `EXP IN ${days}D` : 'FRESH';
          })()
        : 'ACTIVE';

      const pillBg = isExp
        ? [254, 226, 226] // red-100
        : statusText.includes('EXP IN')
        ? [254, 243, 199] // amber-100
        : [220, 252, 231]; // emerald-100

      const pillTextCol = isExp
        ? [185, 28, 28] // red-700
        : statusText.includes('EXP IN')
        ? [180, 83, 9] // amber-700
        : [21, 128, 61]; // emerald-700

      doc.setFillColor(pillBg[0], pillBg[1], pillBg[2]);
      doc.roundedRect(rightX - 70, y + 46, 70, 18, 9, 9, 'F');
      doc.setTextColor(pillTextCol[0], pillTextCol[1], pillTextCol[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(statusText, rightX - 35, y + 58, { align: 'center' });

      y += cardHeight + cardSpacing;
    }
  }

  // ==========================================
  // 2. OPTION B: WITHOUT IMAGES (Clean High-Density Tabular Report)
  // ==========================================
  else {
    const rowHeight = 26;

    // Draw Table Header
    const drawTableHeader = () => {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(margin, y, contentWidth, 20, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105); // slate-600

      doc.text('ITEM NAME & FORMULATION', margin + 6, y + 13);
      doc.text('TYPE', margin + 175, y + 13);
      doc.text('STOCK', margin + 230, y + 13);
      doc.text('DOSE / DETAILS', margin + 280, y + 13);
      doc.text('EXPIRY DATE', margin + 410, y + 13);
      doc.text('STATUS', pageWidth - margin - 10, y + 13, { align: 'right' });

      y += 20;
    };

    drawTableHeader();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Page break check
      if (y + rowHeight + 25 > pageHeight - margin) {
        drawFooter(currentPage);
        doc.addPage();
        currentPage++;
        y = margin;
        drawHeader(currentPage);
        drawTableHeader();
      }

      const isMed = item.type === 'medicine';
      const stock = getItemStock(item);
      const isLow = stock <= (item.lowQuantityThreshold ?? 2);
      const isExp = item.expiryDate ? new Date(item.expiryDate) < new Date() : false;

      // Alternating row background
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
      }

      // Bottom separator
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

      // Item Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      const truncatedName = doc.splitTextToSize(cleanText(item.name), 160)[0] || 'Untitled';
      doc.text(truncatedName, margin + 6, y + 12);

      // Sub-text: Batch or salt
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      const subInfo = [item.batchNo ? `B: ${item.batchNo}` : '', item.components ? item.components : ''].filter(Boolean).join(' • ');
      if (subInfo) {
        doc.text(doc.splitTextToSize(subInfo, 160)[0], margin + 6, y + 21);
      }

      // Type
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(isMed ? 190 : 16, isMed ? 24 : 149, isMed ? 93 : 193); // rose / emerald
      doc.text(isMed ? 'MEDICINE' : 'GROCERY', margin + 175, y + 16);

      // Stock
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(isLow ? 217 : 15, isLow ? 119 : 23, isLow ? 6 : 42);
      doc.text(`${stock}`, margin + 230, y + 16);

      // Dose / Details
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const detailStr = isMed
        ? [item.dailyDose ? `${item.dailyDose} ${item.doseUnit || 'tab'}/d` : '', item.medicineTiming ? item.medicineTiming.replace('_', ' ') : ''].filter(Boolean).join(' • ')
        : (item.details || item.description || (item.price ? `₹${item.price}` : '—'));
      doc.text(doc.splitTextToSize(cleanText(detailStr) || '—', 120)[0], margin + 280, y + 16);

      // Expiry Date
      doc.setFont('helvetica', isExp ? 'bold' : 'normal');
      doc.setFontSize(8);
      doc.setTextColor(isExp ? 220 : 51, isExp ? 38 : 65, isExp ? 38 : 85);
      const expDateStr = item.expiryDate ? format(new Date(item.expiryDate), 'MMM dd, yyyy') : '—';
      doc.text(expDateStr, margin + 410, y + 16);

      // Status text
      const statusText = isExp
        ? 'EXPIRED'
        : item.expiryDate
        ? (() => {
            const days = differenceInDays(new Date(item.expiryDate), new Date());
            return days <= 7 ? `${days}d left` : 'Fresh';
          })()
        : 'Active';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(
        isExp ? 220 : statusText.includes('left') ? 217 : 22,
        isExp ? 38 : statusText.includes('left') ? 119 : 101,
        isExp ? 38 : statusText.includes('left') ? 6 : 52
      );
      doc.text(statusText, pageWidth - margin - 10, y + 16, { align: 'right' });

      y += rowHeight;
    }
  }

  drawFooter(currentPage);
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
  doc.save(`${cleanTitle}-${getTodayDateString()}.pdf`);
};

/**
 * Generate and download PDF for Activity & Dose Logs
 */
export const exportLogsToPDF = async (options: PDFLogsExportOptions): Promise<void> => {
  const {
    logs,
    includeImages,
    title = 'Consumption & Medicine Dose Activity Log'
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;
  let currentPage = 1;

  const drawHeader = (pageNum: number) => {
    doc.setFillColor(88, 28, 135); // purple-900
    doc.rect(margin, y, contentWidth, 50, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(title, margin + 14, y + 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(233, 213, 255);
    doc.text(`Total ${logs.length} logged entries • Exported ${new Date().toLocaleString()}`, margin + 14, y + 38);

    y += 62;
  };

  const drawFooter = (pageNum: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Activity Log Report • Page ${pageNum}`, margin, pageHeight - 20);
    doc.text('Home Inventory System', pageWidth - margin, pageHeight - 20, { align: 'right' });
  };

  drawHeader(currentPage);

  if (logs.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('No consumption activity recorded yet.', margin + 10, y + 20);
    drawFooter(currentPage);
    doc.save(`activity-log-${getTodayDateString()}.pdf`);
    return;
  }

  // Draw Table Headers
  const drawTableHeader = () => {
    doc.setFillColor(243, 232, 255); // purple-100
    doc.rect(margin, y, contentWidth, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(107, 33, 168); // purple-800

    doc.text('DATE & TIME', margin + 6, y + 13);
    doc.text('ITEM NAME', margin + 120, y + 13);
    doc.text('CATEGORY', margin + 260, y + 13);
    doc.text('AMOUNT USED', margin + 340, y + 13);
    doc.text('NOTES / MEAL TIMING', margin + 420, y + 13);

    y += 20;
  };

  drawTableHeader();

  const rowHeight = 24;

  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];

    if (y + rowHeight + 25 > pageHeight - margin) {
      drawFooter(currentPage);
      doc.addPage();
      currentPage++;
      y = margin;
      drawHeader(currentPage);
      drawTableHeader();
    }

    if (i % 2 === 1) {
      doc.setFillColor(250, 245, 255); // purple-50
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(243, 232, 255);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

    // Date & Time
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`${entry.date} ${entry.time || ''}`, margin + 6, y + 15);

    // Item Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(doc.splitTextToSize(entry.itemName || 'Item', 130)[0], margin + 120, y + 15);

    // Category
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(entry.itemType === 'medicine' ? 190 : 16, entry.itemType === 'medicine' ? 24 : 149, entry.itemType === 'medicine' ? 93 : 193);
    doc.text(entry.itemType === 'medicine' ? 'Medicine' : 'Grocery', margin + 260, y + 15);

    // Amount Used
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(88, 28, 135);
    doc.text(`${entry.amountUsed} ${entry.unit || 'unit'}`, margin + 340, y + 15);

    // Notes
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const noteText = entry.notes || (entry.doseTiming ? `Timing: ${entry.doseTiming.replace('_', ' ')}` : '—');
    doc.text(doc.splitTextToSize(noteText, 100)[0], margin + 420, y + 15);

    y += rowHeight;
  }

  drawFooter(currentPage);
  doc.save(`activity-log-${getTodayDateString()}.pdf`);
};

/**
 * Export Inventory items to CSV
 */
export const exportInventoryToCSV = (items: InventoryItem[], filename = `inventory-${getTodayDateString()}.csv`): void => {
  const headers = [
    'ID',
    'Name',
    'Type',
    'Quantity',
    'Low Threshold',
    'Price (INR)',
    'Expiry Date',
    'Mfg Date',
    'Batch No',
    'Barcode',
    'Daily Dose',
    'Dose Unit',
    'Dose Frequency',
    'Meal Timing',
    'Ingredients / Salt',
    'Details'
  ];

  const rows = items.map(item => [
    item.id || '',
    `"${(item.name || '').replace(/"/g, '""')}"`,
    item.type || '',
    getItemStock(item),
    item.lowQuantityThreshold ?? 2,
    item.price || '',
    item.expiryDate || '',
    item.mfgDate || '',
    `"${(item.batchNo || '').replace(/"/g, '""')}"`,
    `"${(item.barcode || '').replace(/"/g, '""')}"`,
    item.dailyDose || '',
    item.doseUnit || '',
    item.doseFrequency || '',
    item.medicineTiming || '',
    `"${(item.components || '').replace(/"/g, '""')}"`,
    `"${(item.details || item.description || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export Usage Logs to CSV
 */
export const exportLogsToCSV = (logs: UsageLogEntry[], filename = `activity-log-${getTodayDateString()}.csv`): void => {
  const headers = ['ID', 'Date', 'Time', 'Item Name', 'Type', 'Amount Used', 'Unit', 'Meal Timing', 'Notes', 'Remaining Stock'];

  const rows = logs.map(log => [
    log.id || '',
    log.date || '',
    log.time || '',
    `"${(log.itemName || '').replace(/"/g, '""')}"`,
    log.itemType || '',
    log.amountUsed || 1,
    log.unit || '',
    log.doseTiming || '',
    `"${(log.notes || '').replace(/"/g, '""')}"`,
    log.remainingStock ?? ''
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export complete database to JSON backup
 */
export const exportDatabaseJSON = (items: InventoryItem[], logs: UsageLogEntry[]): void => {
  const data = {
    appName: 'Home Inventory & Medicine Tracker',
    exportedAt: new Date().toISOString(),
    version: '2026.1',
    totalItems: items.length,
    totalLogs: logs.length,
    items,
    logs
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `inventory-backup-${getTodayDateString()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};
