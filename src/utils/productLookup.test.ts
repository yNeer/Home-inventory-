import test from 'node:test';
import assert from 'node:assert';
import { lookupBarcode } from './productLookup.ts';

test('lookupBarcode validation - invalid barcode formats', async (t) => {
  const invalidBarcodes = [
    '123-456',
    'abc def',
    '!!!',
    '',
    'barcode@123',
    '   ',
    '123.456',
    '123_456'
  ];

  // Mock fetch globally to prevent network calls if validation is bypassed
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('Fetch should not be called for invalid barcodes');
  }) as any;

  // Mock console.warn to keep test output clean
  const originalWarn = console.warn;
  console.warn = () => {};

  try {
    for (const barcode of invalidBarcodes) {
      await t.test(`should return null for invalid barcode: "${barcode}"`, async () => {
        const result = await lookupBarcode(barcode);
        assert.strictEqual(result, null, `Expected null for barcode: ${barcode}`);
      });
    }
  } finally {
    console.warn = originalWarn;
    globalThis.fetch = originalFetch;
  }
});

test('lookupBarcode validation - valid barcode format', async (t) => {
  // Mock fetch to ensure it passes the validation step
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;

  globalThis.fetch = (async (url: string) => {
    fetchCalled = true;
    return {
      ok: true,
      json: async () => ({ status: 0 }) // status 0 means product not found in OpenFoodFacts
    };
  }) as any;

  // Mock console.warn as well
  const originalWarn = console.warn;
  console.warn = () => {};

  try {
    const result = await lookupBarcode('8001234567890');
    assert.strictEqual(result, null);
    assert.strictEqual(fetchCalled, true, 'Fetch should have been called for valid barcode');
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
});
