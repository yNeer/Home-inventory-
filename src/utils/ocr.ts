import Tesseract from 'tesseract.js';
import { isValid, format, addMonths } from 'date-fns';
import { prepareOCREnhancedCanvases } from './imageProcessor';

export interface ParsedOCRResult {
  name: string;
  nameCandidates?: string[];
  price: string;
  mfgDate: string;
  expiryDate: string;
  batchNo: string;
  components: string;
  details: string;
  rawText: string;
  extractedFieldsCount: number;
  extractedSummary: string[];
  scannedAngles?: (number | string)[];
}

const MONTH_MAP: { [key: string]: number } = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

const SKIP_WORDS = [
  'mrp', 'rs', 'price', 'mfg', 'exp', 'expiry', 'batch', 'b.no', 'lot', 'licence', 'license',
  'pkd', 'packed', 'net wt', 'weight', 'gms', 'ml', 'keep out', 'store in', 'cool dry',
  'external use', 'each tablet', 'each film', 'schedule', 'warning', 'manufactured', 'marketed',
  'customer care', 'email', 'fssai', 'directions', 'composition', 'ingredients', 'dosage',
  'caution', 'use before', 'best before', 'toll free', 'website', 'regd', 'trademark'
];

const PRODUCT_KEYWORDS = [
  'tablet', 'tablets', 'capsule', 'capsules', 'syrup', 'cream', 'lotion', 'oil', 'powder',
  'tea', 'soap', 'drops', 'spray', 'face wash', 'facewash', 'gel', 'ointment', 'shampoo',
  'butter', 'milk', 'cookie', 'cookies', 'biscuit', 'biscuits', 'water', 'juice', 'paste',
  'wash', 'balm', 'drink', 'atta', 'rice', 'flour', 'noodle', 'noodles', 'sauce', 'cleanser',
  'suspension', 'drops', 'inhaler', 'sanitizer', 'tonic', 'moisturizer', 'sunscreen'
];

/**
 * Normalizes noisy OCR text inside dates and numbers:
 * Handles common OCR substitutions: 'O'/'o' for 0, 'I'/'l' for 1 or '/', 'S' for 5, etc.
 */
export const sanitizeDateToken = (raw: string): string => {
  if (!raw) return '';
  let clean = raw.trim();

  // Common OCR separator artifacts
  clean = clean.replace(/[|\\!]/g, '/').replace(/\s+/g, ' ');

  // Replace OCR 'O' with '0' around digits or separators
  clean = clean.replace(/\b[oO](\d)/g, (_, p1) => '0' + p1);
  clean = clean.replace(/(\d)[oO](\d)/g, (_, p1, p2) => p1 + '0' + p2);
  clean = clean.replace(/(\d)[oO]\b/g, (_, p1) => p1 + '0');

  // Replace 'I' or 'l' with '1' in numeric blocks
  clean = clean.replace(/\b[Il](\d)/g, (_, p1) => '1' + p1);
  clean = clean.replace(/(\d)[Il](\d)/g, (_, p1, p2) => p1 + '1' + p2);
  clean = clean.replace(/(\d)[Il]\b/g, (_, p1) => p1 + '1');

  return clean;
};

// Delimiter lookahead so tokens on composite lines don't bleed into adjacent fields
// (e.g. "B.NO. DL24091 MFD. 04/24 EXP. 03/27 MRP Rs. 34.50")
const STOP_LOOKAHEAD = '(?=\\s+(?:exp|expiry|mfg|mfd|batch|b\\.?no|b\\.?n|lot|mrp|rs|price|pkd|dom|valid|use\\s*by|use\\s*before|best\\s*before|ed\\.|e\\.|m\\.|md\\.|each|tab|tablets|caps|capsules|\\$)|$|[,;\\n])';

/**
 * Robustly parses a date token into standard YYYY-MM-DD format.
 */
export const parseDateToken = (raw: string): string | null => {
  if (!raw) return null;
  const clean = sanitizeDateToken(raw);

  // Case 1: Word Month (e.g., "15 MAR 2027", "MAR 2027", "25-OCT-26", "DEC/2026", "EXP.MAR.27", "MAR-24")
  const wordMatch = clean.match(/(?:(\d{1,2})[\s\-\./]+)?([a-zA-Z]{3,9})[\s\-\./]+(\d{2,4})/);
  if (wordMatch) {
    const mStr = wordMatch[2].toLowerCase().substring(0, 3);
    if (MONTH_MAP[mStr]) {
      const m = MONTH_MAP[mStr];
      let y = parseInt(wordMatch[3], 10);
      if (y < 100) y += (y < 50 ? 2000 : 1900);
      const d = wordMatch[1] ? parseInt(wordMatch[1], 10) : new Date(y, m, 0).getDate();
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Case 2: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY or DD/MM/YY
  const dmyMatch = clean.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/);
  if (dmyMatch) {
    let d = parseInt(dmyMatch[1], 10);
    let m = parseInt(dmyMatch[2], 10);
    let y = parseInt(dmyMatch[3], 10);
    if (y < 100) y += (y < 50 ? 2000 : 1900);

    // If month > 12 and day <= 12, swap (handles MM/DD/YYYY)
    if (m > 12 && d <= 12) {
      const tmp = d; d = m; m = tmp;
    }
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Case 3: MM/YYYY or MM/YY or MM-YYYY or MM-YY or MM.YYYY or MM.YY or MM YYYY or MM YY (with space)
  const myMatch = clean.match(/\b(0?[1-9]|1[0-2])[\/\-\.\s](\d{2,4})\b/);
  if (myMatch) {
    const m = parseInt(myMatch[1], 10);
    let y = parseInt(myMatch[2], 10);
    if (y < 100) y += (y < 50 ? 2000 : 1900);
    const lastDay = new Date(y, m, 0).getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  // Case 4: YYYY-MM-DD or YYYY/MM/DD or YYYY-MM or YYYY/MM
  const ymdMatch = clean.match(/\b(\d{4})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{1,2}))?\b/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = ymdMatch[3] ? parseInt(ymdMatch[3], 10) : new Date(y, m, 0).getDate();
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  return null;
};

/**
 * Extracts and scores candidate product names from text lines.
 * Returns the highest scoring name as primary, along with multiple candidate options
 * from brand name, generic/formulation lines, and package headlines.
 */
const extractProductNameCandidates = (
  lines: string[],
  textLines: Array<{ text: string; height?: number }>
): { bestName: string; candidates: string[] } => {
  const scoredMap = new Map<string, number>();

  lines.forEach((line, index) => {
    const clean = line.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').replace(/\s+/g, ' ');
    if (clean.length < 3 || clean.length > 60) return;

    const lower = clean.toLowerCase();
    if (SKIP_WORDS.some(sw => lower.includes(sw))) return;
    if (!/[a-zA-Z]{3,}/.test(clean)) return;

    // Reject lines that are primarily numbers, dates or web links
    if (/^\d+[\/\-.]\d+/.test(clean) || /^\d{5,}$/.test(clean)) return;
    if (/(?:www\.|https?:|\.com|\.org|\.in|\.net|\.gov)/i.test(clean)) return;

    // Calculate score based on position and features
    let score = 50 - Math.min(index, 8) * 4; // Top lines get preference

    // Presence of product category terms
    if (PRODUCT_KEYWORDS.some(pw => lower.includes(pw))) score += 35;

    // Presence of strength/dosage indicators (e.g., 500mg, 650, 100ml)
    if (/\d+\s*(?:mg|ml|g|gm|mcg|tablets?|capsules?)\b/i.test(clean)) score += 20;

    // All caps brand name
    if (clean === clean.toUpperCase() && clean.length >= 4 && clean.length <= 30) score += 15;

    // Title case words
    if (/^[A-Z][a-z0-9]+(\s+[A-Z0-9][a-z0-9]*)*$/.test(clean)) score += 10;

    // Height / font size bonus if available from OCR line metadata
    const meta = textLines[index];
    if (meta && meta.height && meta.height > 15) {
      score += Math.min(meta.height, 40);
    }

    const existingScore = scoredMap.get(clean) || -999;
    if (score > existingScore) {
      scoredMap.set(clean, score);
    }
  });

  // Sort candidate names by score descending
  const sorted = Array.from(scoredMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  // Deduplicate case-insensitively
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const name of sorted) {
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key.length >= 3 && !seen.has(key)) {
      seen.add(key);
      candidates.push(name);
    }
  }

  const bestName = candidates[0] || '';
  return { bestName, candidates: candidates.slice(0, 8) };
};

/**
 * Parses raw OCR page/text output into structured fields.
 */
export const parseOCRData = (data: Tesseract.Page | { text: string; lines?: any[] }): ParsedOCRResult => {
  const text = data.text || '';
  const lines = data.lines
    ? data.lines.map((l: any) => (typeof l.text === 'string' ? l.text.trim() : '')).filter(Boolean)
    : text.split('\n').map((l: string) => l.trim()).filter(Boolean);

  const lineMetadata = (data.lines || []).map((l: any) => ({
    text: l.text || '',
    height: l.bbox ? (l.bbox.y1 || 0) - (l.bbox.y0 || 0) : undefined
  }));

  // Dot-matrix letter and digit spacing normalization
  // E.g. "E X P : 0 3 / 2 7" -> "EXP : 03/27", "B . N O . 2 4 8 9 0" -> "B.NO. 24890"
  let dotMatrixNormalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\b([A-Za-z])\s+([A-Za-z])\s+([A-Za-z])\b/g, '$1$2$3')
    .replace(/\b([A-Za-z])\s+([A-Za-z])\b/g, '$1$2')
    .replace(/(\d)\s+(\d)/g, '$1$2')
    .replace(/(\d)\s+(\d)/g, '$1$2');

  const normalizedText = dotMatrixNormalized.replace(/\s+/g, ' ');

  const result: ParsedOCRResult = {
    name: '',
    nameCandidates: [],
    price: '',
    mfgDate: '',
    expiryDate: '',
    batchNo: '',
    components: '',
    details: '',
    rawText: text,
    extractedFieldsCount: 0,
    extractedSummary: []
  };

  // 1. Batch Number Extraction (supports B.NO., B.No:, BN, LOT, BATCH, B/NO, B/N, etc.)
  const batchRegex = new RegExp('(?:^|\\b)(?:batch\\s*(?:no|num|number)?|b\\.?\\s*no\\.?|b\\.?\\s*n\\.?|b/no|b/n|lot\\s*(?:no|num|#)?|bn)[:.\\-\\s]*([^\\n,;]+?)' + STOP_LOOKAHEAD, 'i');
  const batchMatch = normalizedText.match(batchRegex);
  if (batchMatch && batchMatch[1]) {
    const candidate = batchMatch[1].replace(/^[.:\-\s]+|[.:\-\s]+$/g, '').trim().toUpperCase();
    if (candidate.length >= 3 && !/^(DATE|PRICE|MRP|EXP|MFG|TABLETS|CAPSULES)$/i.test(candidate)) {
      result.batchNo = candidate;
    }
  }

  // Fallback line search for stacked batch labels (e.g., line 1: "BATCH NO.", line 2: "DL2409")
  if (!result.batchNo) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^(?:batch\s*(?:no)?|b\.?\s*no\.?|lot\s*(?:no)?\.?):?$/i.test(line)) {
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim().replace(/[^a-zA-Z0-9\/-]/g, '').toUpperCase();
          if (nextLine.length >= 3 && nextLine.length <= 16 && !/^(DATE|MRP|EXP|MFG)$/i.test(nextLine)) {
            result.batchNo = nextLine;
            break;
          }
        }
      }
    }
  }

  // 2. Dates Extraction (Expiry & Manufacturing Date)
  // Check line by line for explicit labels (most reliable across top and side flaps)
  const expRegex = new RegExp('(?:^|\\b)(?:(?:exp(?:iry)?|use\\s*by|use\\s*before|best\\s*before)[.\\s]*(?:date)?|(?:valid\\s*upto|e\\.?d\\.?|ed\\.|e\\.|bb\\.|bb:))[:.\\-\\s]*([^\\n,;]+?)' + STOP_LOOKAHEAD, 'i');
  // MFG is Manufacturing Date: supports MFG, MFD, MFG DATE, MANUFACTURING DATE, DATE OF MFG, PKD, DOM, etc.
  const mfdRegex = new RegExp('(?:^|\\b)(?:(?:date\\s*of\\s*)?(?:mfg|mfd|manufacturing|manufacture|pkd|packed)[.\\s]*(?:date|dt)?|(?:m\\.?\\s*f\\.?\\s*[gd]\\.?|m\\.?\\s*d\\.?|d\\.?o\\.?m\\.?|packed\\s*on|manufactured\\s*(?:on|date)?|dom|m\\.))[:.\\-\\s]*([^\\n,;]+?)' + STOP_LOOKAHEAD, 'i');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Expiry date line matching
    if (!result.expiryDate) {
      const expMatch = line.match(expRegex);
      if (expMatch && expMatch[1]) {
        const parsed = parseDateToken(expMatch[1]);
        if (parsed) result.expiryDate = parsed;
      }
    }

    // Stacked expiry date check (e.g. line i: "EXP. DATE", line i+1: "03/2027")
    if (!result.expiryDate && i + 1 < lines.length) {
      if (/^(?:exp(?:iry)?|use\\s*by|use\\s*before|best\\s*before|valid\\s*upto|e\\.?d\\.)[.\\s]*(?:date|dt)?[:.\\-\\s]*$/i.test(line)) {
        const parsed = parseDateToken(lines[i + 1]);
        if (parsed) result.expiryDate = parsed;
      }
    }

    // Manufacturing date line matching (Mfg is Manufacturing Date)
    if (!result.mfgDate) {
      const mfdMatch = line.match(mfdRegex);
      if (mfdMatch && mfdMatch[1]) {
        const parsed = parseDateToken(mfdMatch[1]);
        if (parsed) result.mfgDate = parsed;
      }
    }

    // Stacked manufacturing date check (e.g. line i: "MFG. DATE", line i+1: "04/2024")
    if (!result.mfgDate && i + 1 < lines.length) {
      if (/^(?:(?:date\\s*of\\s*)?(?:mfg|mfd|manufacturing|manufacture|pkd|packed)[.\\s]*(?:date|dt)?|(?:m\\.?f\\.?\\s*[gd]\\.?|m\\.?d\\.?|d\\.?o\\.?m\\.?|dom))[:.\\-\\s]*$/i.test(line)) {
        const parsed = parseDateToken(lines[i + 1]);
        if (parsed) result.mfgDate = parsed;
      }
    }
  }

  // Fallback: search anywhere in normalized text
  if (!result.expiryDate) {
    const expGlobalMatch = normalizedText.match(expRegex);
    if (expGlobalMatch && expGlobalMatch[1]) {
      const parsed = parseDateToken(expGlobalMatch[1]);
      if (parsed) result.expiryDate = parsed;
    }
  }

  if (!result.mfgDate) {
    const mfdGlobalMatch = normalizedText.match(mfdRegex);
    if (mfdGlobalMatch && mfdGlobalMatch[1]) {
      const parsed = parseDateToken(mfdGlobalMatch[1]);
      if (parsed) result.mfgDate = parsed;
    }
  }

  // Relative shelf life: "Best before 12 months from mfg / manufacture / packaging"
  if (!result.expiryDate && result.mfgDate) {
    const bestBeforeMonthsMatch = normalizedText.match(/best\s*before\s*(\d{1,2})\s*months?(?:\s*(?:from|of)?\s*(?:mfg|mfd|packaging|pkd|manufacture|date))?/i);
    if (bestBeforeMonthsMatch && bestBeforeMonthsMatch[1]) {
      const monthsToAdd = parseInt(bestBeforeMonthsMatch[1], 10);
      const mfg = new Date(result.mfgDate);
      if (isValid(mfg)) {
        result.expiryDate = format(addMonths(mfg, monthsToAdd), 'yyyy-MM-dd');
      }
    }
  }

  // 3. Price / MRP Extraction
  const priceRegex = /\b(?:m\.?r\.?p\.?|max(?:imum)?\s*retail\s*price|price|rs\.?|₹|\$)\s*[:.\-\s]*(\d{1,5}(?:\.\d{1,2})?)/i;
  const priceMatch = normalizedText.match(priceRegex);
  if (priceMatch && priceMatch[1]) {
    result.price = priceMatch[1];
  }

  // 4. Details / Volume / Weight / Count extraction
  const detailItems: string[] = [];
  // Volume (e.g., 500ml, 1 L, 200 ml, 750ml, 100ml)
  const volMatch = normalizedText.match(/\b(\d+(?:\.\d+)?\s*(?:ml|l|litre|litres|liter|fl\s*oz))\b/i);
  if (volMatch) detailItems.push(volMatch[1].toUpperCase());

  // Weight (e.g., 500g, 1kg, 250 gm, 100g, 50g)
  const wtMatch = normalizedText.match(/\b(\d+(?:\.\d+)?\s*(?:g|gm|gms|kg|mg))\b/i);
  if (wtMatch && !detailItems.some(c => c.toLowerCase().includes(wtMatch[1].toLowerCase()))) {
    detailItems.push(wtMatch[1].toUpperCase());
  }

  // Count / Units (e.g., 10 Tablets, 15 Tabs, 30 Capsules, 10x10 Tablets, 20 Sachets)
  const countMatch = normalizedText.match(/\b(\d+(?:\s*x\s*\d+)?\s*(?:tablets?|capsules?|caps?|tabs?|pills?|sachets?|strips?))\b/i);
  if (countMatch) detailItems.push(countMatch[1]);

  if (detailItems.length > 0) {
    result.details = detailItems.join(' • ');
  }

  // 5. Medicine Components / Ingredients
  const compRegex = /(?:composition|ingredients?|each\s*(?:film\s*coated\s*tablet|capsule|ml)?\s*contains)\s*:?\s*(.*?)(?=\b(?:mfg|batch|mrp|exp|dosage|store|warning|manufactured|marketed|keep\s*out)\b|$)/i;
  const compMatch = normalizedText.match(compRegex);
  if (compMatch && compMatch[1]) {
    const comp = compMatch[1].trim().replace(/\s+/g, ' ');
    if (comp.length > 5 && comp.length < 250) {
      result.components = comp;
    }
  }

  // 6. Name Extraction & Candidate Options
  const { bestName, candidates } = extractProductNameCandidates(lines, lineMetadata);
  result.name = bestName;
  result.nameCandidates = candidates;

  // If active ingredients/composition is detected, add the first active formulation as a candidate option too
  if (result.components) {
    const firstComp = result.components.split(/[,;\n]/)[0]?.trim();
    if (firstComp && firstComp.length >= 3 && firstComp.length <= 50) {
      const compKey = firstComp.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!result.nameCandidates.some(c => c.toLowerCase().replace(/[^a-z0-9]/g, '') === compKey)) {
        result.nameCandidates.push(firstComp);
      }
    }
  }

  // Generate summary items
  const summary: string[] = [];
  if (result.name) summary.push(`Name: "${result.name}"`);
  if (result.expiryDate) summary.push(`Expiry Date (Exp): ${result.expiryDate}`);
  if (result.batchNo) summary.push(`Batch No: ${result.batchNo}`);
  if (result.mfgDate) summary.push(`Manufacturing Date (Mfg): ${result.mfgDate}`);
  if (result.price) summary.push(`Price: ₹${result.price}`);
  if (result.details) summary.push(`Details: ${result.details}`);
  if (result.components) summary.push(`Ingredients detected`);

  result.extractedSummary = summary;
  result.extractedFieldsCount = summary.length;

  return result;
};

// Singleton warm worker cache for fast subsequent scans
let cachedWorker: Tesseract.Worker | null = null;
let isInitializingWorker = false;
let initWaiters: Array<{ resolve: (w: Tesseract.Worker) => void; reject: (err: any) => void }> = [];

export const getOrCreateWorker = async (
  onProgress?: (percent: number, status: string) => void
): Promise<Tesseract.Worker> => {
  if (cachedWorker) {
    return cachedWorker;
  }

  if (isInitializingWorker) {
    return new Promise((resolve, reject) => {
      initWaiters.push({ resolve, reject });
    });
  }

  isInitializingWorker = true;
  try {
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m: any) => {
        if (onProgress && m) {
          const pct = Math.round((m.progress || 0) * 100);
          if (m.status === 'recognizing text') {
            onProgress(pct, `Scanning label: ${pct}%`);
          } else if (m.status === 'loading language traineddata') {
            onProgress(pct, `Loading OCR engine: ${pct}%`);
          } else if (m.status) {
            onProgress(pct, m.status);
          }
        }
      }
    });

    try {
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.AUTO
      });
    } catch (paramErr) {
      console.warn('Worker parameter warning:', paramErr);
    }

    cachedWorker = worker;
    initWaiters.forEach(w => w.resolve(worker));
    initWaiters = [];
    return worker;
  } catch (err) {
    initWaiters.forEach(w => w.reject(err));
    initWaiters = [];
    throw err;
  } finally {
    isInitializingWorker = false;
  }
};

/**
 * Merges two parsed OCR results giving priority to non-empty fields.
 */
const mergeOCRResults = (primary: ParsedOCRResult, secondary: ParsedOCRResult): ParsedOCRResult => {
  // Merge name candidates preserving order and deduplicating
  const allCandidates = [
    ...(primary.nameCandidates || []),
    ...(secondary.nameCandidates || [])
  ];
  if (primary.name && !allCandidates.includes(primary.name)) {
    allCandidates.unshift(primary.name);
  }
  if (secondary.name && !allCandidates.includes(secondary.name)) {
    allCandidates.push(secondary.name);
  }

  const seenCandidates = new Set<string>();
  const mergedCandidates: string[] = [];
  for (const c of allCandidates) {
    if (!c) continue;
    const key = c.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key.length >= 3 && !seenCandidates.has(key)) {
      seenCandidates.add(key);
      mergedCandidates.push(c);
    }
  }

  const merged: ParsedOCRResult = {
    name: primary.name || secondary.name,
    nameCandidates: mergedCandidates.slice(0, 10),
    price: primary.price || secondary.price,
    mfgDate: primary.mfgDate || secondary.mfgDate,
    expiryDate: primary.expiryDate || secondary.expiryDate,
    batchNo: primary.batchNo || secondary.batchNo,
    components: primary.components || secondary.components,
    details: primary.details || secondary.details,
    rawText: (primary.rawText + '\n' + secondary.rawText).trim(),
    extractedFieldsCount: 0,
    extractedSummary: []
  };

  // If both have details, merge distinct parts
  if (primary.details && secondary.details && primary.details !== secondary.details) {
    const parts = Array.from(new Set([...primary.details.split(' • '), ...secondary.details.split(' • ')]));
    merged.details = parts.join(' • ');
  }

  const summary: string[] = [];
  if (merged.name) summary.push(`Name: "${merged.name}"`);
  if (merged.expiryDate) summary.push(`Expiry Date (Exp): ${merged.expiryDate}`);
  if (merged.batchNo) summary.push(`Batch No: ${merged.batchNo}`);
  if (merged.mfgDate) summary.push(`Manufacturing Date (Mfg): ${merged.mfgDate}`);
  if (merged.price) summary.push(`Price: ₹${merged.price}`);
  if (merged.details) summary.push(`Details: ${merged.details}`);
  if (merged.components) summary.push(`Ingredients detected`);

  merged.extractedSummary = summary;
  merged.extractedFieldsCount = summary.length;

  return merged;
};

/**
 * Multi-Directional OCR Processor:
 * Scans packaging both Top-to-Bottom (0° upright) and Right-to-Left (90° sideways panels, 270° opposite,
 * and high-resolution side edge margin crops) so that sideways expiry dates, batch numbers,
 * and manufacturing dates are thoroughly extracted.
 */
export const processImageWithMultiDirectionalOCR = async (
  imageFile: File | Blob,
  onProgress?: (percent: number, status: string) => void
): Promise<ParsedOCRResult> => {
  const emptyResult: ParsedOCRResult = {
    name: '',
    nameCandidates: [],
    price: '',
    mfgDate: '',
    expiryDate: '',
    batchNo: '',
    components: '',
    details: '',
    rawText: '',
    extractedFieldsCount: 0,
    extractedSummary: [],
    scannedAngles: ['Top-to-Bottom (0°)']
  };

  let canvasesCleanup: (() => void) | null = null;

  try {
    if (onProgress) onProgress(10, 'Preparing high-contrast label views (Top & Sides)...');
    const canvases = await prepareOCREnhancedCanvases(imageFile);
    canvasesCleanup = canvases.cleanup;

    if (onProgress) onProgress(20, 'Connecting OCR engine...');
    const worker = await getOrCreateWorker(onProgress);

    // Pass 1: Top-to-Bottom (0° Upright: scans main label, product name, composition & front text)
    if (onProgress) onProgress(32, 'Scanning Top to Bottom (main label & title)...');
    const res0Raw = await worker.recognize(canvases.canvas0);
    let finalResult = parseOCRData(res0Raw.data);
    const checkedOrientations: string[] = ['Top-to-Bottom (0°)'];

    // Pass 2: Right-to-Left / Sideways (90° clockwise: converts right side panel & vertical crimp text to horizontal)
    if (onProgress) onProgress(55, 'Scanning Right to Left (sideways expiry, batch & mfd)...');
    const res90Raw = await worker.recognize(canvases.canvas90);
    const res90 = parseOCRData(res90Raw.data);
    checkedOrientations.push('Right-to-Left (90°)');
    finalResult = mergeOCRResults(finalResult, res90);

    // Pass 3: Opposite side panel / vertical text (270° counter-clockwise)
    if (!finalResult.expiryDate || !finalResult.batchNo || !finalResult.mfgDate) {
      if (onProgress) onProgress(72, 'Scanning opposite side panel & flaps (270°)...');
      const res270Raw = await worker.recognize(canvases.canvas270);
      const res270 = parseOCRData(res270Raw.data);
      checkedOrientations.push('Left-Panel Sideways (270°)');
      finalResult = mergeOCRResults(finalResult, res270);
    }

    // Pass 4: High-Detail Side Edge Crops (Right & Left Margins)
    // When text is stamped in small dot-matrix font along the packaging crimp or edge margin
    if (!finalResult.expiryDate || !finalResult.batchNo) {
      if (onProgress) onProgress(85, 'Scanning high-detail side margin stamps...');
      const resRightEdgeRaw = await worker.recognize(canvases.canvasRightEdge);
      const resRightEdge = parseOCRData(resRightEdgeRaw.data);
      checkedOrientations.push('Right-Edge Detail');
      finalResult = mergeOCRResults(finalResult, resRightEdge);

      if (!finalResult.expiryDate) {
        const resLeftEdgeRaw = await worker.recognize(canvases.canvasLeftEdge);
        const resLeftEdge = parseOCRData(resLeftEdgeRaw.data);
        checkedOrientations.push('Left-Edge Detail');
        finalResult = mergeOCRResults(finalResult, resLeftEdge);
      }
    }

    // Pass 5: Top crimp flap & Inverted (180°)
    if (!finalResult.expiryDate) {
      if (onProgress) onProgress(93, 'Scanning top crimp flap & inverted angles...');
      const resTopEdgeRaw = await worker.recognize(canvases.canvasTopEdge);
      const resTopEdge = parseOCRData(resTopEdgeRaw.data);
      checkedOrientations.push('Top-Crimp');
      finalResult = mergeOCRResults(finalResult, resTopEdge);

      if (!finalResult.expiryDate) {
        const res180Raw = await worker.recognize(canvases.canvas180);
        const res180 = parseOCRData(res180Raw.data);
        checkedOrientations.push('Inverted (180°)');
        finalResult = mergeOCRResults(finalResult, res180);
      }
    }

    finalResult.scannedAngles = checkedOrientations;
    if (onProgress) onProgress(100, `Done! Extracted ${finalResult.extractedFieldsCount} fields from Top & Sideways views.`);

    return finalResult;
  } catch (error) {
    console.warn('Multi-directional OCR fallback:', error);
    if (cachedWorker) {
      try {
        await cachedWorker.terminate();
      } catch {
        // ignore
      }
      cachedWorker = null;
    }
    return emptyResult;
  } finally {
    if (canvasesCleanup) {
      canvasesCleanup();
    }
  }
};

/**
 * Backward-compatible entrypoint. Runs multi-directional OCR by default.
 */
export const processImageWithOCR = processImageWithMultiDirectionalOCR;
