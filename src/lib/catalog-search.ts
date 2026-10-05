import { algoliasearch } from "algoliasearch";
import type { Prisma } from "@prisma/client";
import type { ProductCardData } from "@/components/ProductCard";
import { prisma } from "@/lib/prisma";

const DEFAULT_INDEX_NAME = "shilpa_products";
const SEARCH_PAGE_SIZE = 24;

const indexedProductSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  price: true,
  mrp: true,
  variant: true,
  description: true,
  imageUrl: true,
  inStock: true,
  isArchived: true,
  isFeatured: true,
  featuredOrder: true,
  brand: { select: { name: true, slug: true } },
  category: {
    select: {
      name: true,
      slug: true,
      parent: { select: { name: true, slug: true } },
    },
  },
} satisfies Prisma.ProductSelect;

type IndexedProduct = Prisma.ProductGetPayload<{ select: typeof indexedProductSelect }>;

type CatalogSearchDocument = {
  objectID: string;
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: number;
  mrp: number | null;
  variant: string | null;
  description: string | null;
  imageUrl: string | null;
  inStock: boolean;
  isFeatured: boolean;
  featuredOrder: number;
  brandName: string | null;
  brandSlug: string | null;
  categoryName: string;
  categorySlug: string;
  parentCategoryName: string | null;
  parentCategorySlug: string | null;
  /** Extra normalized text makes pack-size and punctuation variations easier to find. */
  searchTerms: string;
};

export type CatalogSearchResults = {
  products: ProductCardData[];
  total: number;
  totalPages: number;
  /** True only when results came from the enhanced hosted index. */
  enhanced: boolean;
};

function getIndexName() {
  return process.env.ALGOLIA_INDEX_NAME?.trim() || DEFAULT_INDEX_NAME;
}

function readConfig() {
  const appId = process.env.ALGOLIA_APP_ID?.trim();
  const apiKey = process.env.ALGOLIA_SEARCH_API_KEY?.trim();
  if (!appId || !apiKey) return null;
  return { appId, apiKey, indexName: getIndexName() };
}

function adminConfig() {
  const appId = process.env.ALGOLIA_APP_ID?.trim();
  const apiKey = process.env.ALGOLIA_ADMIN_API_KEY?.trim();
  if (!appId || !apiKey) return null;
  return { appId, apiKey, indexName: getIndexName() };
}

export function isAlgoliaSearchConfigured() {
  return readConfig() !== null;
}

export function isAlgoliaIndexingConfigured() {
  return adminConfig() !== null;
}

function normalizedTerms(values: Array<string | null | undefined>) {
  const words = values
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => {
      const compact = value.trim().toLowerCase();
      const withoutPunctuation = compact.replace(/[^\p{L}\p{N}]+/gu, " ");
      const joined = withoutPunctuation.replace(/\s+/g, "");
      return [compact, withoutPunctuation, joined];
    });

  return [...new Set(words)].join(" ");
}

function toDocument(product: IndexedProduct): CatalogSearchDocument {
  const brandName = product.brand?.name ?? null;
  const parentCategoryName = product.category.parent?.name ?? null;

  return {
    objectID: product.id,
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    price: product.price,
    mrp: product.mrp,
    variant: product.variant,
    description: product.description,
    imageUrl: product.imageUrl,
    inStock: product.inStock,
    isFeatured: product.isFeatured,
    featuredOrder: product.featuredOrder,
    brandName,
    brandSlug: product.brand?.slug ?? null,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    parentCategoryName,
    parentCategorySlug: product.category.parent?.slug ?? null,
    searchTerms: normalizedTerms([
      product.name,
      product.sku,
      product.variant,
      brandName,
      product.category.name,
      parentCategoryName,
    ]),
  };
}

function toProductCard(document: CatalogSearchDocument): ProductCardData {
  return {
    id: document.id,
    name: document.name,
    slug: document.slug,
    price: document.price,
    mrp: document.mrp,
    variant: document.variant,
    imageUrl: document.imageUrl,
    inStock: document.inStock,
    brand:
      document.brandName && document.brandSlug
        ? { name: document.brandName, slug: document.brandSlug }
        : null,
  };
}

async function databaseSearch(query: string, page: number): Promise<CatalogSearchResults> {
  const where: Prisma.ProductWhereInput = {
    isArchived: false,
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { sku: { contains: query, mode: "insensitive" } },
      { variant: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { brand: { name: { contains: query, mode: "insensitive" } } },
      { category: { name: { contains: query, mode: "insensitive" } } },
    ],
  };
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: indexedProductSelect,
      orderBy: [{ inStock: "desc" }, { name: "asc" }],
      skip: (page - 1) * SEARCH_PAGE_SIZE,
      take: SEARCH_PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products.map((product) => toProductCard(toDocument(product))),
    total,
    totalPages: Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE)),
    enhanced: false,
  };
}

/**
 * Search the hosted index when configured. A database fallback keeps search
 * working during first-time setup or a provider incident.
 */
export async function searchCatalog(query: string, page = 1): Promise<CatalogSearchResults> {
  const cleanQuery = query.trim();
  const safePage = Math.max(1, page);
  const config = readConfig();

  if (!config) return databaseSearch(cleanQuery, safePage);

  try {
    const client = algoliasearch(config.appId, config.apiKey);
    const response = await client.searchSingleIndex<CatalogSearchDocument>({
      indexName: config.indexName,
      searchParams: {
        query: cleanQuery,
        page: safePage - 1,
        hitsPerPage: SEARCH_PAGE_SIZE,
        attributesToRetrieve: [
          "id",
          "name",
          "slug",
          "price",
          "mrp",
          "variant",
          "imageUrl",
          "inStock",
          "brandName",
          "brandSlug",
        ],
      },
    });

    return {
      products: response.hits.map((hit) => toProductCard(hit)),
      total: response.nbHits ?? 0,
      totalPages: Math.max(1, response.nbPages ?? 1),
      enhanced: true,
    };
  } catch (error) {
    // Search must stay available even if the external index is temporarily down.
    console.error("[catalog-search] Algolia search failed; using database fallback.", error);
    return databaseSearch(cleanQuery, safePage);
  }
}

function getAdminClientOrThrow() {
  const config = adminConfig();
  if (!config) {
    throw new Error(
      "Algolia indexing is not configured. Add ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY.",
    );
  }
  return { client: algoliasearch(config.appId, config.apiKey), indexName: config.indexName };
}

/** Applies the relevance rules once, before the first full index sync. */
export async function configureCatalogSearchIndex() {
  const { client, indexName } = getAdminClientOrThrow();
  await client.setSettings({
    indexName,
    indexSettings: {
      searchableAttributes: [
        "name",
        "brandName",
        "searchTerms",
        "categoryName",
        "parentCategoryName",
        "unordered(description)",
      ],
      attributesForFaceting: ["filterOnly(inStock)", "filterOnly(categorySlug)", "filterOnly(brandSlug)"],
      customRanking: ["desc(inStock)", "desc(isFeatured)", "asc(featuredOrder)"],
      attributesToHighlight: ["name", "brandName", "categoryName"],
      typoTolerance: true,
      minWordSizefor1Typo: 4,
      minWordSizefor2Typos: 8,
      queryType: "prefixLast",
      hitsPerPage: SEARCH_PAGE_SIZE,
    },
  });
}

async function allActiveProducts() {
  return prisma.product.findMany({
    where: { isArchived: false },
    select: indexedProductSelect,
    orderBy: { id: "asc" },
  });
}

/** Atomically replace the full index; use after imports and when first enabling search. */
export async function syncEntireCatalogSearchIndex() {
  const { client, indexName } = getAdminClientOrThrow();
  const products = await allActiveProducts();
  await client.replaceAllObjects({
    indexName,
    objects: products.map(toDocument),
    batchSize: 500,
    scopes: ["settings", "synonyms", "rules"],
  });
  return products.length;
}

async function quietlyIndex(operation: () => Promise<void>) {
  if (!isAlgoliaIndexingConfigured()) return;
  try {
    await operation();
  } catch (error) {
    // Product management must never be blocked by a separate search provider.
    console.error("[catalog-search] Could not update Algolia index.", error);
  }
}

export async function syncSearchProducts(productIds: string[]) {
  if (productIds.length === 0) return;
  await quietlyIndex(async () => {
    const { client, indexName } = getAdminClientOrThrow();
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isArchived: false },
      select: indexedProductSelect,
    });
    const foundIds = new Set(products.map((product) => product.id));

    if (products.length > 0) {
      await client.saveObjects({
        indexName,
        objects: products.map(toDocument),
        batchSize: 500,
      });
    }

    const staleIds = productIds.filter((id) => !foundIds.has(id));
    if (staleIds.length > 0) {
      await client.deleteObjects({ indexName, objectIDs: staleIds, batchSize: 500 });
    }
  });
}

export async function syncSearchProduct(productId: string) {
  await syncSearchProducts([productId]);
}

export async function removeSearchProducts(productIds: string[]) {
  if (productIds.length === 0) return;
  await quietlyIndex(async () => {
    const { client, indexName } = getAdminClientOrThrow();
    await client.deleteObjects({ indexName, objectIDs: productIds, batchSize: 500 });
  });
}

export async function syncSearchProductsForCategory(categoryId: string) {
  if (!isAlgoliaIndexingConfigured()) return;
  // A parent category's name is stored on each child product's search record.
  // Resync its direct children too when that parent is renamed.
  const categories = await prisma.category.findMany({
    where: { OR: [{ id: categoryId }, { parentId: categoryId }] },
    select: { id: true },
  });
  const ids = await prisma.product.findMany({
    where: { categoryId: { in: categories.map((category) => category.id) } },
    select: { id: true },
  });
  await syncSearchProducts(ids.map((product) => product.id));
}

export async function syncSearchProductsForBrand(brandId: string) {
  if (!isAlgoliaIndexingConfigured()) return;
  const ids = await prisma.product.findMany({ where: { brandId }, select: { id: true } });
  await syncSearchProducts(ids.map((product) => product.id));
}
