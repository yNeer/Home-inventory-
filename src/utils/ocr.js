import Tesseract from 'tesseract.js';
import { isValid, format } from 'date-fns';

export const processImageWithOCR = async (imageFile) => {
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

const parseOCRText = (text) => {
  const result = {
    price: '',
    mfgDate: '',
    expiryDate: ''
  };

  // Basic Price Regex (e.g. $10.99, Rs. 50, 50.00)
  const priceRegex = /(?:rs\.?|₹|\$|mrp)\s*(\d+(?:\.\d{1,2})?)/i;
  const priceMatch = text.match(priceRegex);
  if (priceMatch) {
    result.price = priceMatch[1];
  }

  // Basic Date Regex DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY
  const dateRegex = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/g;
  let match;
  const dates = [];

  while ((match = dateRegex.exec(text)) !== null) {
     // Try to parse the date as DD/MM/YYYY or DD-MM-YYYY
     const str = match[0].replace(/[.-]/g, '/');
     const parts = str.split('/');
     let d, m, y;
     if (parts.length === 3) {
         d = parseInt(parts[0], 10);
         m = parseInt(parts[1], 10) - 1; // 0-indexed month
         y = parseInt(parts[2], 10);
         if (y < 100) {
             y += 2000;
         }

         const dateObj = new Date(y, m, d);
         if (isValid(dateObj)) {
            dates.push(dateObj);
         }
     }
  }

  // Heuristic: If we found dates, earlier is mfg, later is expiry.
  if (dates.length >= 2) {
      dates.sort((a, b) => a - b);
      result.mfgDate = format(dates[0], 'yyyy-MM-dd');
      result.expiryDate = format(dates[dates.length - 1], 'yyyy-MM-dd');
  } else if (dates.length === 1) {
      // Just one date, guess it's expiry based on text context if possible, or just assign to expiry.
      if (text.toLowerCase().includes('mfg') || text.toLowerCase().includes('pkd')) {
         result.mfgDate = format(dates[0], 'yyyy-MM-dd');
      } else {
         result.expiryDate = format(dates[0], 'yyyy-MM-dd');
      }
  }

  return result;
};
