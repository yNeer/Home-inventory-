// Utility to fetch product details from public APIs using barcode

export interface ProductDetails {
  name: string;
  type: 'grocery' | 'medicine';
  image_url?: string;
  brand?: string;
}

export const lookupBarcode = async (barcode: string): Promise<ProductDetails | null> => {
  try {
    // Attempt OpenFoodFacts (for groceries)
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);

    if (response.ok) {
      const data = await response.json();
      if (data.status === 1 && data.product) {
        return {
          name: data.product.product_name || 'Unknown Product',
          type: 'grocery',
          image_url: data.product.image_url,
          brand: data.product.brands
        };
      }
    }

    // Fallback: Just return the raw code as name if nothing found
    console.warn(`No product found for barcode ${barcode}`);
    return null;

  } catch (error) {
    console.error("Error looking up barcode:", error);
    return null;
  }
};
