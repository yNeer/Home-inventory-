import { Html5Qrcode } from 'html5-qrcode';

export const extractBarcodeFromImage = async (imageFile: File): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const html5QrCode = new Html5Qrcode("hidden-barcode-reader");

    // We need a temporary hidden div in the DOM for html5-qrcode file scanning to work
    let hiddenElement = document.getElementById('hidden-barcode-reader');
    if (!hiddenElement) {
       hiddenElement = document.createElement('div');
       hiddenElement.id = 'hidden-barcode-reader';
       hiddenElement.style.display = 'none';
       document.body.appendChild(hiddenElement);
    }

    html5QrCode.scanFile(imageFile, false)
      .then(decodedText => {
        resolve(decodedText);
      })
      .catch(err => {
        console.warn("Failed to extract barcode from image:", err);
        resolve(null); // Resolve null rather than rejecting so flow can continue
      });
  });
};