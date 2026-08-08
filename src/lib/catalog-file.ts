import { z } from "zod";

/**
 * Shape of the files in data/catalog/*.json — the hand-off format between
 * catalog extraction (done outside the app, from distributor PDFs) and the
 * import script. Deliberately flat and human-readable so a row can be
 * corrected by hand before importing.
 */
export const catalogRowSchema = z.object({
  /**
   * Stable identifier used to match a row against an already-imported product.
   * Use the distributor's article/SKU code when the PDF has one; otherwise
   * make one up and keep it identical across future imports — it's what makes
   * a monthly re-import an update rather than a duplicate.
   */
  sku: z.string().trim().min(1),
  name: z.string().trim().min(1),
  /** Top-level category, e.g. "Ice Cream & Frozen Desserts". */
  category: z.string().trim().min(1),
  /** Subcategory the product actually sits in, e.g. "Tubs". */
  subcategory: z.string().trim().min(1),
  /** Manufacturer, e.g. "Amul". Omit for unbranded loose goods. */
  brand: z.string().trim().min(1).optional().nullable(),
  price: z.number().positive(),
  /** Printed MRP. Leave out entirely unless the source states one. */
  mrp: z.number().positive().optional().nullable(),
  /** Pack size or flavour, e.g. "500 ml" or "Butterscotch, 1 L". */
  variant: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  /**
   * During sourcing this is the original URL found on the brand's site or a
   * marketplace. `npm run upload-images` replaces it with our own Cloudinary
   * URL, and only Cloudinary URLs should be imported.
   */
  imageUrl: z.string().trim().url().optional().nullable(),
  /**
   * Where the image came from — "vissco.com", "lakmeindia.com", "1mg".
   * Provenance matters when a photo later turns out to be wrong, or when a
   * source has to be re-checked.
   */
  imageSource: z.string().trim().optional().nullable(),
  /**
   * True when the price was looked up online rather than read from the
   * distributor PDF. These are a marketplace's selling price, not Shilpa's,
   * and need confirming in the admin panel before the shop relies on them.
   */
  priceProvisional: z.boolean().optional(),
  inStock: z.boolean().optional(),
});

export type CatalogRow = z.infer<typeof catalogRowSchema>;

export const catalogFileSchema = z.object({
  /** Where this came from, for traceability: "Amul distributor list". */
  source: z.string().trim().min(1),
  /** Date of the PDF/price list, ISO format. */
  sourceDate: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  products: z.array(catalogRowSchema).min(1),
});

export type CatalogFile = z.infer<typeof catalogFileSchema>;
