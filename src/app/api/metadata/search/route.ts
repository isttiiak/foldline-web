import type { NextRequest } from "next/server";

import { searchQuerySchema } from "@/features/metadata/schemas";
import { searchBooks } from "@/features/metadata/server/lookup";
import {
  guardMetadataRequest,
  lookupResponse,
  metadataError,
} from "@/features/metadata/server/respond";

/** Book search for "Add book": `GET /api/metadata/search?q=…`. Signed-in only. */
export async function GET(request: NextRequest) {
  const denied = await guardMetadataRequest();
  if (denied) return denied;

  const parsed = searchQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
  });
  if (!parsed.success) return metadataError("invalid_input", 400);

  return lookupResponse(await searchBooks(parsed.data.q));
}
