import Tesseract from 'tesseract.js';
import { isValid, format, addMonths } from 'date-fns';

export interface ParsedOCRResult {
  name: string;
  price: string;
  mfgDate: string;
  expiryDate: string;
  batchNo: string;
  components: string;
  details: string;
  rawText: string;
  extractedFieldsCount: number;
  extractedSummary: string[];
}

export const processImageWithOCR = async (
  imageFile: File | Blob,
  onProgress?: (percent: number, status: string) => void
): Promise<ParsedOCRResult> => {
  try {
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: m => {
        if (onProgress && m) {
          const pct = Math.round((m.progress || 0) * 100);
          if (m.status === 'recognizing text') {
            onProgress(pct, `Scanning label & text: ${pct}%`);
          } else if (m.status) {
            onProgress(pct, m.status);
          }
        }
      }
    });

    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO_OSD
    });

    const result = await worker.recognize(imageFile);
    const data = result.data;
    console.log("OCR Raw Text:", data.text);

    await worker.terminate();

    return parseOCRData(data);
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};

const MONTH_NAMES: { [key: string]: number } = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11
};

export const parseOCRData = (data: Tesseract.Page): ParsedOCRResult => {
  const result: ParsedOCRResult = {
    name: '',
    price: '',
    mfgDate: '',
    expiryDate: '',
    batchNo: '',
    components: '',
    details: '',
    rawText: data.text || '',
    extractedFieldsCount: 0,
    extractedSummary: []
  };

  const text = data.text || '';
  const lines = data.lines ? data.lines.map(l => l.text.trim()).filter(Boolean) : text.split('\n').map(l => l.trim()).filter(Boolean);
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ');

  // 1. Batch Number Extraction
  // Look for Batch No / B.No / Lot No on the same line or immediate subsequent line
  const batchRegex = /(?:batch\s*(?:no|number|num)?\.?|b\.?\s*(?:no|num)?\.?|lot\s*(?:no|number|#)?\.?|b\/no|b\.no)\s*[:.\-\s]*([A-Z0-9\/-]{3,20})/i;
  const batchMatch = normalizedText.match(batchRegex);

  if (batchMatch && batchMatch[1]) {
    const candidate = batchMatch[1].replace(/^[.:\-\s]+|[.:\-\s]+$/g, '').trim();
    if (candidate.length >= 3 && !/^(date|price|mrp|exp|mfg)$/i.test(candidate)) {
      result.batchNo = candidate.toUpperCase();
    }
  }

  // Fallback check: Check line by line for standalone batch labels (e.g. "B. No." followed by line with "2304A")
  if (!result.batchNo && lines.length > 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^(?:batch\s*(?:no)?|b\.?\s*no\.?|lot\s*(?:no)?\.?):?$/i.test(line)) {
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim().replace(/[^a-zA-Z0-9\/-]/g, '');
          if (nextLine.length >= 3 && nextLine.length <= 15) {
            result.batchNo = nextLine.toUpperCase();
            break;
          }
        }
      }
    }
  }

  // 2. Price / MRP Extraction
  const priceRegex = /(?:m\.?r\.?p\.?|max(?:imum)?\s*retail\s*price|price|rs\.?|₹|\$)\s*:?\s*(\d{1,5}(?:\.\d{1,2})?)/i;
  const priceMatch = normalizedText.match(priceRegex);
  if (priceMatch && priceMatch[1]) {
    result.price = priceMatch[1];
  }

  // 3. Dates Extraction (Numeric and Word-based)
  interface FoundDate {
    date: Date;
    raw: string;
    index: number;
    type?: 'exp' | 'mfg';
  }
  const foundDates: FoundDate[] = [];

  // Pattern A: Word-month dates like "15 NOV 2026", "DEC 2026", "OCT-2025", "25-MAY-2027", "EXP. NOV 26"
  const wordMonthRegex = /\b(?:(\d{1,2})[/\-.\s]+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[/\-.\s]+(\d{2,4})\b/gi;
  let wmMatch;
  while ((wmMatch = wordMonthRegex.exec(normalizedText)) !== null) {
    const day = wmMatch[1] ? parseInt(wmMatch[1], 10) : 1;
    const monthKey = wmMatch[2].toLowerCase();
    const month = MONTH_NAMES[monthKey] !== undefined ? MONTH_NAMES[monthKey] : 0;
    let year = parseInt(wmMatch[3], 10);
    if (year < 100) year += (year < 50 ? 2000 : 1900);

    const d = new Date(year, month, day);
    if (isValid(d) && year >= 1990 && year <= 2100) {
      foundDates.push({ date: d, raw: wmMatch[0], index: wmMatch.index });
    }
  }

  // Pattern B: Numeric dates: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, MM/YYYY, MM/YY, YYYY-MM-DD
  const numDateRegex = /\b(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})\b|\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b|\b(0[1-9]|1[0-2])[/\-.](\d{2}|\d{4})\b/g;
  let ndMatch;
  while ((ndMatch = numDateRegex.exec(normalizedText)) !== null) {
    let dateObj: Date | null = null;

    // YYYY-MM-DD
    if (ndMatch[1] && ndMatch[2] && ndMatch[3]) {
      const y = parseInt(ndMatch[1], 10);
      const m = parseInt(ndMatch[2], 10) - 1;
      const d = parseInt(ndMatch[3], 10);
      dateObj = new Date(y, m, d);
    }
    // DD/MM/YYYY
    else if (ndMatch[4] && ndMatch[5] && ndMatch[6]) {
      const d = parseInt(ndMatch[4], 10);
      const m = parseInt(ndMatch[5], 10) - 1;
      let y = parseInt(ndMatch[6], 10);
      if (y < 100) y += (y < 50 ? 2000 : 1900);
      dateObj = new Date(y, m, d);
    }
    // MM/YYYY or MM/YY
    else if (ndMatch[7] && ndMatch[8]) {
      const m = parseInt(ndMatch[7], 10) - 1;
      let y = parseInt(ndMatch[8], 10);
      if (y < 100) y += (y < 50 ? 2000 : 1900);
      dateObj = new Date(y, m, 1);
    }

    if (dateObj && isValid(dateObj) && dateObj.getFullYear() >= 1990 && dateObj.getFullYear() <= 2100) {
      // Avoid duplicate close dates already found
      const exists = foundDates.some(f => Math.abs(f.date.getTime() - dateObj!.getTime()) < 86400000);
      if (!exists) {
        foundDates.push({ date: dateObj, raw: ndMatch[0], index: ndMatch.index });
      }
    }
  }

  // Keyword check around found dates
  const expKeywords = ['exp', 'expiry', 'use by', 'best before', 'bb', 'use before', 'valid upto', 'expires', 'exp. date', 'exp date'];
  const mfgKeywords = ['mfg', 'pkd', 'packed', 'manufactured', 'dom', 'mfg date', 'mfg. date', 'prod date'];

  for (const item of foundDates) {
    const contextStart = Math.max(0, item.index - 45);
    const contextEnd = Math.min(normalizedText.length, item.index + item.raw.length + 45);
    const contextStr = normalizedText.substring(contextStart, contextEnd).toLowerCase();

    if (expKeywords.some(kw => contextStr.includes(kw))) {
      item.type = 'exp';
      if (!result.expiryDate) {
        result.expiryDate = format(item.date, 'yyyy-MM-dd');
      }
    } else if (mfgKeywords.some(kw => contextStr.includes(kw))) {
      item.type = 'mfg';
      if (!result.mfgDate) {
        result.mfgDate = format(item.date, 'yyyy-MM-dd');
      }
    }
  }

  // Fallback date assignment if no explicit keywords matched
  if (!result.expiryDate && !result.mfgDate && foundDates.length > 0) {
    foundDates.sort((a, b) => a.date.getTime() - b.date.getTime());
    if (foundDates.length >= 2) {
      result.mfgDate = format(foundDates[0].date, 'yyyy-MM-dd');
      result.expiryDate = format(foundDates[foundDates.length - 1].date, 'yyyy-MM-dd');
    } else if (foundDates.length === 1) {
      // If only one date is on a product label, it's almost always expiry
      result.expiryDate = format(foundDates[0].date, 'yyyy-MM-dd');
    }
  } else if (!result.expiryDate && foundDates.length > 0) {
    // If mfg was set but expiry wasn't, pick the latest date as expiry
    const candidates = foundDates.filter(f => format(f.date, 'yyyy-MM-dd') !== result.mfgDate);
    if (candidates.length > 0) {
      candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
      result.expiryDate = format(candidates[candidates.length - 1].date, 'yyyy-MM-dd');
    }
  }

  // Relative shelf life heuristic: "Best before 6 months" or "Use within 24 months"
  if (!result.expiryDate && result.mfgDate) {
    const bestBeforeMonthsMatch = normalizedText.match(/best\s*before\s*(\d{1,2})\s*months?/i);
    if (bestBeforeMonthsMatch && bestBeforeMonthsMatch[1]) {
      const monthsToAdd = parseInt(bestBeforeMonthsMatch[1], 10);
      const mfg = new Date(result.mfgDate);
      if (isValid(mfg)) {
        result.expiryDate = format(addMonths(mfg, monthsToAdd), 'yyyy-MM-dd');
      }
    }
  }

  // 4. Details / Volume / Net Weight extraction
  const detailCandidates: string[] = [];
  // Volume (e.g. 500ml, 1 L, 750 ml)
  const volMatch = normalizedText.match(/\b(\d+(?:\.\d+)?\s*(?:ml|l|litre|litres|liter|fl\s*oz))\b/i);
  if (volMatch) detailCandidates.push(volMatch[1].toUpperCase());

  // Weight (e.g. 500g, 1kg, 250 gm)
  const wtMatch = normalizedText.match(/\b(\d+(?:\.\d+)?\s*(?:g|gm|gms|kg|mg))\b/i);
  if (wtMatch && !detailCandidates.some(c => c.toLowerCase().includes(wtMatch[1].toLowerCase()))) {
    detailCandidates.push(wtMatch[1].toUpperCase());
  }

  // Unit / Count (e.g. 10 Tablets, 60 Capsules, 10x10 Tablets)
  const countMatch = normalizedText.match(/\b(\d+(?:\s*x\s*\d+)?\s*(?:tablets?|capsules?|caps?|tabs?|pills?|sachets?|strips?))\b/i);
  if (countMatch) detailCandidates.push(countMatch[1]);

  if (detailCandidates.length > 0) {
    result.details = detailCandidates.join(' • ');
  }

  // 5. Medicine Components / Ingredients
  const compRegex = /(?:composition|ingredients?|each\s*(?:film\s*coated\s*tablet|capsule|ml)?\s*contains)\s*:?\s*(.*?)(?=\b(?:mfg|batch|mrp|exp|dosage|store|warning|manufactured|marketed|keep\s*out)\b|$)/i;
  const compMatch = normalizedText.match(compRegex);
  if (compMatch && compMatch[1]) {
    const comp = compMatch[1].trim().replace(/\s+/g, ' ');
    if (comp.length > 5 && comp.length < 300) {
      result.components = comp;
    }
  }

  // 6. Name Extraction (Lines with prominent size or brand indicators)
  let bestNameCandidate = '';
  let maxLineHeight = 0;
  const skipWords = [
    'mrp', 'price', 'mfg', 'exp', 'batch', 'net', 'weight', 'rs', 'use by', 'inclusive',
    'taxes', 'date', 'composition', 'keep', 'store', 'cool', 'dry', 'place', 'warning',
    'manufactured', 'marketed', 'licence', 'license', 'customer', 'care'
  ];

  if (data.lines && data.lines.length > 0) {
    for (const line of data.lines) {
      const lineText = line.text.trim();
      if (lineText.length < 3 || lineText.length > 50) continue;

      const isSkipWord = skipWords.some(w => lineText.toLowerCase().includes(w));
      if (!isSkipWord && /[a-zA-Z]{3,}/.test(lineText)) {
        const height = (line.bbox?.y1 || 0) - (line.bbox?.y0 || 0);
        if (height > maxLineHeight) {
          maxLineHeight = height;
          bestNameCandidate = lineText.replace(/[^a-zA-Z0-9\s&+\-']/g, '').trim();
        }
      }
    }
  }

  if (bestNameCandidate) {
    result.name = bestNameCandidate;
  }

  // Summary generation
  const summary: string[] = [];
  if (result.name) summary.push(`Name: "${result.name}"`);
  if (result.expiryDate) summary.push(`Expiry: ${result.expiryDate}`);
  if (result.batchNo) summary.push(`Batch No: ${result.batchNo}`);
  if (result.mfgDate) summary.push(`Mfg Date: ${result.mfgDate}`);
  if (result.price) summary.push(`Price: ₹${result.price}`);
  if (result.details) summary.push(`Details: ${result.details}`);
  if (result.components) summary.push(`Ingredients detected`);

  result.extractedSummary = summary;
  result.extractedFieldsCount = summary.length;

  return result;
};
