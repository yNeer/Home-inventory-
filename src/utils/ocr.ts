import Tesseract from 'tesseract.js';
import { isValid, format } from 'date-fns';

export const processImageWithOCR = async (imageFile: File | Blob) => {
  try {
    const result = await Tesseract.recognize(imageFile, 'eng', {
      logger: m => console.log(m)
    });
    const text = result.data.text;
    console.log("OCR Extracted Text:", text);

    return parseOCRText(text);
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};

const parseOCRText = (text: string) => {
  const result = {
    price: '',
    mfgDate: '',
    expiryDate: '',
    batchNo: '',
    components: ''
  };

  const normalizedText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');

  // Enhanced Price Regex
  const priceRegex = /(?:m\.?r\.?p\.?|price|rs\.?|₹|\$)\s*:?\s*(\d{1,5}(?:\.\d{1,2})?)/i;
  const priceMatch = normalizedText.match(priceRegex);
  if (priceMatch) {
    result.price = priceMatch[1];
  }

  // Batch No Regex
  const batchRegex = /(?:batch\s*(?:no|number)?\.?|b\.?\s*no\.?|lot)\s*:?\s*([A-Z0-9-]{3,15})/i;
  const batchMatch = normalizedText.match(batchRegex);
  if (batchMatch) {
    result.batchNo = batchMatch[1].trim();
  }

  // Medicine Components / Ingredients extraction heuristic
  // Looks for blocks of text following words like "Composition", "Ingredients", "Contains"
  const compRegex = /(?:composition|ingredients?|each.*contains)\s*:?\s*(.*?)(?=\b(?:mfg|batch|mrp|exp|dosage|store|warning|manufactured)\b|$)/i;
  const compMatch = normalizedText.match(compRegex);
  if (compMatch && compMatch[1]) {
     // Clean up and limit length
     const comp = compMatch[1].trim();
     if (comp.length > 5 && comp.length < 300) {
        result.components = comp;
     }
  }

  // Common Date formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, MM/YYYY
  const dateRegex = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b|\b(0[1-9]|1[0-2])[/\-.](\d{2,4})\b/g;
  let match;
  const foundDates: { date: Date, raw: string, index: number }[] = [];

  while ((match = dateRegex.exec(normalizedText)) !== null) {
     let dateObj: Date | null = null;

     // Full Date (DD/MM/YYYY)
     if (match[1] && match[2] && match[3]) {
         const d = parseInt(match[1], 10);
         const m = parseInt(match[2], 10) - 1; // 0-indexed month
         let y = parseInt(match[3], 10);
         if (y < 100) y += 2000;
         dateObj = new Date(y, m, d);
     }
     // MM/YYYY format
     else if (match[4] && match[5]) {
         const m = parseInt(match[4], 10) - 1;
         let y = parseInt(match[5], 10);
         if (y < 100) y += 2000;
         dateObj = new Date(y, m, 1); // assume 1st of month
     }

     if (dateObj && isValid(dateObj)) {
        foundDates.push({ date: dateObj, raw: match[0], index: match.index });
     }
  }

  if (foundDates.length > 0) {
      foundDates.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Attempt context-based extraction near the dates
      const expKeywords = ['exp', 'expiry', 'use by', 'best before', 'bb'];
      const mfgKeywords = ['mfg', 'pkd', 'packed', 'manufactured'];

      for (const item of foundDates) {
          const contextStart = Math.max(0, item.index - 30);
          const contextStr = normalizedText.substring(contextStart, item.index + item.raw.length + 30).toLowerCase();

          if (expKeywords.some(kw => contextStr.includes(kw))) {
             result.expiryDate = format(item.date, 'yyyy-MM-dd');
          } else if (mfgKeywords.some(kw => contextStr.includes(kw))) {
             result.mfgDate = format(item.date, 'yyyy-MM-dd');
          }
      }

      // Fallback heuristic if explicit keywords weren't found
      if (!result.expiryDate && !result.mfgDate) {
          if (foundDates.length >= 2) {
             result.mfgDate = format(foundDates[0].date, 'yyyy-MM-dd');
             result.expiryDate = format(foundDates[foundDates.length - 1].date, 'yyyy-MM-dd');
          } else if (foundDates.length === 1) {
             // If there's only one date on a product label, it's typically the expiry
             result.expiryDate = format(foundDates[0].date, 'yyyy-MM-dd');
          }
      }
  }

  return result;
};
