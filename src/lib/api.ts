import { NextResponse } from "next/server";
import { z } from "zod";
import { fieldErrors } from "@/lib/validation";

/** Consistent error shape so every admin form can render the same way. */
export function badRequest(message: string, fields?: Record<string, string>) {
  return NextResponse.json({ error: message, fields }, { status: 400 });
}

export function notFound(what = "Not found") {
  return NextResponse.json({ error: what }, { status: 404 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

/**
 * Parse a JSON body against a schema, returning either the typed data or a
 * ready-to-return 400 with per-field messages.
 */
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<
  { ok: true; data: z.infer<T> } | { ok: false; response: NextResponse }
> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: badRequest("Invalid request body") };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: badRequest("Please check the highlighted fields", fieldErrors(parsed.error)),
    };
  }

  return { ok: true, data: parsed.data };
}
