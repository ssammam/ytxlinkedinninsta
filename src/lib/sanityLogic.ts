// Native Sanity HTTP API implementation without next-sanity package
export async function sanityFetch(query: string, params: Record<string, string> = {}) {
  const projectId = process.env.SANITY_PROJECT_ID || '';
  const dataset = process.env.SANITY_DATASET || 'production';
  const apiVersion = '2023-05-03';
  
  if (!projectId) return null;

  // Simple query substitution for params (for basic queries)
  let finalQuery = query;
  for (const [key, value] of Object.entries(params)) {
    finalQuery = finalQuery.replace(`$${key}`, `"${value}"`);
  }

  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(finalQuery)}`;
  
  const token = process.env.SANITY_API_TOKEN || '';
  
  const options: RequestInit = {};
  if (token) {
    options.headers = {
      Authorization: `Bearer ${token}`
    };
  }

  try {
    const res = await fetch(url, options);
    const data = await res.json();
    return data.result;
  } catch (error) {
    console.error("Sanity REST fetch error:", error);
    return null;
  }
}

export async function getRates() {
  try {
    const rates = await sanityFetch(`*[_type == "dailyPrice"] | order(_updatedAt desc)[0]`);
    return rates || {
      goldRate24k: 7200,
      goldRate22k: 6600,
      goldRate18k: 5400,
      goldRate9k: 2700,
      silverRate: 85000
    };
  } catch {
    return {
      goldRate24k: 7200,
      goldRate22k: 6600,
      goldRate18k: 5400,
      goldRate9k: 2700,
      silverRate: 85000
    };
  }
}

export async function getProduct(mediaId: string) {
  try {
    const cleanMediaId = mediaId.includes('_') ? mediaId.split('_')[1] : mediaId;
    const shortcodeMatch = mediaId.match(/(?:p|reel|tv|status)\/([A-Za-z0-9_-]+)/);
    const shortcode = shortcodeMatch ? shortcodeMatch[1] : mediaId;

    const product = await sanityFetch(
      `*[_type == "productReel" && (reelId == $mediaId || reelId == $cleanMediaId || sku match $mediaId || shortcode == $shortcode)][0]`, 
      { mediaId, cleanMediaId, shortcode }
    );
    return product;
  } catch (error) {
    return null;
  }
}

export function buildProductDmMessage(product: any, rates: any, name: string = "there"): string {
  if (!product) {
    return `Namaste, ${name}! To give you the exact price, could you please share the specific link or SKU of the jewelry piece you're interested in? We are RH Jewellers Kengeri.`;
  }

  let ratePerGram = rates?.goldRate22k || 6600;
  if (product.materialType === 'gold9k') ratePerGram = rates?.goldRate9k || 0;
  else if (product.materialType === 'gold18k') ratePerGram = rates?.goldRate18k || 0;
  else if (product.materialType === 'gold24k') ratePerGram = rates?.goldRate24k || 0;
  else if (product.materialType === 'silver') ratePerGram = (rates?.silverRate || 0) / 1000;

  let totalPrice = 0;
  if (product.isPriceLocked && product.lockedPrice) {
    totalPrice = product.lockedPrice;
  } else {
    const weight = product.weightGrams || 0;
    const rawGoldValue = weight * ratePerGram;
    const wastagePercent = product.wastage !== undefined ? product.wastage : 10;
    const wastageTotal = rawGoldValue * (wastagePercent / 100);

    let makingChargeTotal = 0;
    const makingCharges = product.makingCharges || 0;
    if (product.makingChargeType === 'percentage') {
      makingChargeTotal = rawGoldValue * (makingCharges / 100);
    } else if (product.makingChargeType === 'per_gram') {
      makingChargeTotal = makingCharges * weight;
    } else {
      makingChargeTotal = makingCharges;
    }

    const basePrice = rawGoldValue + wastageTotal + makingChargeTotal;
    const gst = basePrice * 0.03;
    totalPrice = Math.round(basePrice + gst);
  }

  const catLabel = product.category ? product.category.charAt(0).toUpperCase() + product.category.slice(1) : 'Jewellery';
  
  return `Namaste, ${name},\n\nThank you for your interest in our ${catLabel} collection!\n\nMaking Charges: ${product.makingCharges || 0}%\nWastage: ${product.wastage !== undefined ? product.wastage : 10}%\n\nWeight: ${product.weightGrams}g\nTotal Price: ₹${totalPrice.toLocaleString('en-IN')}\n\n✅ BIS Hallmarked & Certified\nContact: 9620741404\nRH Jewellers Kengeri.`;
}
