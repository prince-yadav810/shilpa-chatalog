import { z } from "zod";

/**
 * Shared by create and update handlers. The demo's PUT had no validation at
 * all, so `parseFloat(undefined)` wrote NaN prices into the database.
 */

const trimmed = z.string().trim();
const optionalText = trimmed
  .max(2000)
  .optional()
  .nullable()
  .transform((v) => (v === "" ? null : (v ?? null)));

const imageUrl = trimmed
  .max(500)
  .url("Must be a valid URL")
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null))
  .transform((v) => v ?? null);

export const productInputSchema = z
  .object({
    name: trimmed.min(1, "Name is required").max(200),
    categoryId: trimmed.min(1, "Choose a category"),
    brandId: trimmed.optional().nullable().transform((v) => (v ? v : null)),
    sku: trimmed
      .max(60)
      .optional()
      .nullable()
      .transform((v) => (v ? v : null)),
    price: z.coerce
      .number({ message: "Price must be a number" })
      .positive("Price must be more than 0")
      .max(1_000_000),
    mrp: z.coerce
      .number({ message: "MRP must be a number" })
      .positive()
      .max(1_000_000)
      .optional()
      .nullable()
      .or(z.literal("").transform(() => null))
      .transform((v) => v ?? null),
    variant: trimmed
      .max(100)
      .optional()
      .nullable()
      .transform((v) => (v ? v : null)),
    description: optionalText,
    imageUrl,
    inStock: z.coerce.boolean().default(true),
    isFeatured: z.coerce.boolean().default(false),
    featuredOrder: z.coerce.number().int().min(0).max(9999).default(0),
  })
  .refine((data) => data.mrp == null || data.mrp >= data.price, {
    message: "MRP cannot be lower than the selling price",
    path: ["mrp"],
  });

export type ProductInput = z.infer<typeof productInputSchema>;

export const categoryInputSchema = z.object({
  name: trimmed.min(1, "Name is required").max(100),
  parentId: trimmed
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  imageUrl,
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.coerce.boolean().default(true),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const brandInputSchema = z.object({
  name: trimmed.min(1, "Name is required").max(100),
  logoUrl: imageUrl,
  isActive: z.coerce.boolean().default(true),
});

export type BrandInput = z.infer<typeof brandInputSchema>;

export const settingsInputSchema = z.object({
  storeName: trimmed.min(1).max(60),
  whatsappNumber: trimmed
    .min(10)
    .max(20)
    .regex(/^[0-9+\-\s]+$/, "Digits, spaces, + and - only"),
  promoBannerText: trimmed
    .max(160)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  promoBannerLink: trimmed
    .max(300)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

export type SettingsInput = z.infer<typeof settingsInputSchema>;

export const reorderSchema = z.object({
  items: z
    .array(z.object({ id: z.string().min(1), sortOrder: z.number().int().min(0) }))
    .max(500),
});

/** Turns a ZodError into the { field: message } shape the forms render. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
