// Utility to fetch product details from public APIs using barcode

export interface ProductDetails {
  name: string;
  type: 'grocery' | 'medicine';
  image_url?: string;
  brand?: string;
  description?: string;
  details?: string;
}

export const lookupBarcode = async (barcode: string): Promise<ProductDetails | null> => {
  try {
    // Validate barcode (alphanumeric only) to prevent SSRF / Path Traversal
    if (!/^[a-zA-Z0-9]+$/.test(barcode)) {
      console.warn(`Invalid barcode format: ${barcode}`);
      return null;
    }
    const safeBarcode = encodeURIComponent(barcode);

    // Attempt OpenFoodFacts (for groceries)
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${safeBarcode}.json`);

    if (response.ok) {
      const data = await response.json();
      if (data.status === 1 && data.product) {
        const p = data.product;

        // Compile description from categories, ingredients or generic text
        const descriptionParts = [];
        if (p.categories) descriptionParts.push(p.categories);
        if (p.ingredients_text) descriptionParts.push(`Ingredients: ${p.ingredients_text}`);
        else if (p.generic_name) descriptionParts.push(p.generic_name);

        // Compile details (volume, weight, quantity, quality/nutriscore)
        const detailsParts = [];
        if (p.quantity) detailsParts.push(`Quantity/Volume: ${p.quantity}`);
        if (p.packaging) detailsParts.push(`Packaging: ${p.packaging}`);
        if (p.nutriscore_grade) detailsParts.push(`Nutri-Score: ${p.nutriscore_grade.toUpperCase()}`);
        if (p.ecoscore_grade) detailsParts.push(`Eco-Score: ${p.ecoscore_grade.toUpperCase()}`);

        return {
          name: p.product_name || 'Unknown Product',
          type: 'grocery',
          image_url: p.image_url,
          brand: p.brands,
          description: descriptionParts.join('\n\n') || undefined,
          details: detailsParts.join(' • ') || undefined
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
