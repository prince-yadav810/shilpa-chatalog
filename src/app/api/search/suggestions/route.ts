import { NextRequest, NextResponse } from "next/server";
import { searchCatalog } from "@/lib/catalog-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fast, small payload used by the type-ahead search panel. */
export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (query.length < 2) {
    return NextResponse.json({ products: [], total: 0, enhanced: false });
  }

  const results = await searchCatalog(query);
  return NextResponse.json(
    { products: results.products.slice(0, 6), total: results.total, enhanced: results.enhanced },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
